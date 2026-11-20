import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { MongoClient } from 'mongodb';

// Initialize the MongoDB client once to prevent connection pooling issues on Vercel
let client;
const uri = process.env.MONGODB_URI;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const passcode = formData.get('passcode');
    const arf = formData.get('arf');
    const proofNumber = formData.get('proofNumber');
    const author = formData.get('author') || 'Unknown';
    const salesTeam = formData.get('salesTeam') || 'Unknown';

    if (passcode !== process.env.UPLOAD_PASSCODE) {
      return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      return NextResponse.json({ error: "Only .html files are allowed" }, { status: 400 });
    }

    // 1. Convert the uploaded file into a raw text string
    const rawHtml = await file.text();

    // 2. Load the HTML into Cheerio
    const $ = cheerio.load(rawHtml);
    const trendingBar = $('[data-testid="trending-bar"]');
    const trendingContainer = $('[class*="TrendingBar_trendingbar-container"]');

    // 3. REMOVE THE AD SLOT 
    if (trendingBar.length > 0 || trendingContainer.length > 0) {
      trendingBar.remove();
      trendingContainer.remove();
      
      $('header').removeAttr('data-trending-bar').css('margin-bottom', '0');

      $('head').append(`
        <style>
          /* Mobile & Tablet: 56px red header + 49px white nav = 105px */
          @media screen and (max-width: 1023px) {
            [class*="AdvertisingFeatureBar_advertising-feature-bar"] {
              top: 105px !important;
            }
          }
          /* Desktop: 80px red header + 49px white nav = 129px */
          @media screen and (min-width: 1024px) {
            [class*="AdvertisingFeatureBar_advertising-feature-bar"] {
              top: 129px !important;
            }
          }
        </style>
      `);
    }
    $('[data-testid="commercial-above-header-box-1"]').remove();
    $('[data-testid="commercial-1"]').remove();
    $('[data-testid="skin-ad-left"]').remove();
    $('[data-testid="skin-ad-right"]').remove();
    // $('[data-testid="trending-bar"]').remove();
    // $('header').removeAttr('data-trending-bar').css('margin-bottom', '0');
    // $('[class*="TrendingBar_trendingbar-container"]').remove();
    $('[id="qc-ad-fixed-size-wrapper"]').remove();
    $('[data-testid="byline-publishedDate"]').remove();
    $('[class="GoogleActiveViewInnerContainer"]').remove();
    $('[class="admin-bar"]').remove();
    $('[class="superbanner"]').remove();
    $('meta').filter((i, el) => $(el).attr('http-equiv')?.toLowerCase() === 'content-security-policy').remove();
    $('.ArticleTimestamp_updated-date-with-published__iFKpF')
      .css('border-left', 'none')
      .css('margin-left', '0')
      .css('padding-left', '0');
    $('header').css('position', 'sticky')
                  .css('top', '0')
                  .css('margin-top', '0')
                  .css('z-index', '9999');
    $('[data-testid="header-container"]').css('position', 'sticky')
                                         .css('top', '0')
                                         .css('z-index', '9999');
    $('head').append('<meta name="robots" content="noindex, nofollow">');
    $('form').not(':has(iframe[src*="wayin.com"], iframe[srcdoc*="wayin.com"])').remove();
    $('input, textarea, button').remove();
    $('link[rel="canonical"]').remove();
    $('meta[property="og:url"]').remove();
    $('iframe:not([src*="wayin.com"], [srcdoc*="wayin.com"])').remove();
    $('script').remove();
    $('header a, footer a, nav a, aside a, [data-testid="header-container"] a').attr('href', '#');

    const targetDiv = $('[data-testid="byline-updatedDate"]');
    let currentHtml = targetDiv.html();
    
    if (currentHtml) {
      currentHtml = currentHtml.replace(/Updated\s*/i, ''); 
      targetDiv.html(currentHtml);
    }
    
    const videoEmbedUrl = formData.get('videoEmbedUrl');
    if (videoEmbedUrl) {
      $('.PrimisPlayer_player-poster-wrapper-embed__agVi_').empty().append(
        `<iframe src="${videoEmbedUrl}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
      );
    }

    // 4. Export the cleaned HTML back to a string
    const cleanedHtml = $.html();

    let baseName = "";
    if (arf) baseName += `${arf}`;
    if (proofNumber) baseName += (baseName ? `-v${proofNumber}` : `v${proofNumber}`);
    
    if (!baseName) {
      baseName = "proof";
    }
    
    baseName = baseName.replace(/[^a-zA-Z0-9-]/g, '-');
    const customFilename = `${baseName}.html`;

    // 5. Connect to Cloudflare R2
    const S3 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    // 6. Upload the cleaned HTML
    await S3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: customFilename,
      Body: cleanedHtml,
      ContentType: 'text/html',
    }));

    // --- NEW: SAVE PROOF METADATA TO MONGODB ---
    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
    }
    
    // We use the same 'studio_proofs' database where your comments live
    const db = client.db('studio_proofs'); 
    
    // We create a separate 'proofs' collection just for the upload metadata
    await db.collection('proofs').updateOne(
      { proofId: baseName }, 
      { 
        $set: { 
          proofId: baseName, 
          author: author, 
          salesTeam: salesTeam, 
          uploadedAt: new Date() 
        } 
      },
      { upsert: true } // If a proof with this baseName exists, it updates it. If not, it creates it.
    );
    // -------------------------------------------

    // 7. Generate the final viewable link!
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const finalUrl = `${origin}/${customFilename}`; 
    return NextResponse.json({ url: finalUrl });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}