import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const passcode = formData.get('passcode');
    
    const arf = formData.get('arf');
    const proofNumber = formData.get('proofNumber');

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

    // 3. REMOVE THE AD SLOT 
    $('[data-testid="commercial-above-header-box-1"]').remove();
    $('[data-testid="commercial-1"]').remove();
    $('[data-testid="skin-ad-left"]').remove();
    $('[data-testid="skin-ad-right"]').remove();
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
                  .css('z-index', '9999')
              // .css('background-color', '#ffffff');
    $('[data-testid="header-container"]').css('position', 'sticky')
                                         .css('top', '0')
                                         .css('z-index', '9999');
    $('head').append('<meta name="robots" content="noindex, nofollow">');

    const targetDiv = $('[data-testid="byline-updatedDate"]');
    let currentHtml = targetDiv.html();
    
    if (currentHtml) {
      // /Updated/i means "case insensitive" (catches UPDATED, Updated, updated)
      // \s* means "and any weird spaces or line breaks that come immediately after it"
      currentHtml = currentHtml.replace(/Updated\s*/i, ''); 
      targetDiv.html(currentHtml);
    }
    
    const videoEmbedUrl = formData.get('videoEmbedUrl');
    if (videoEmbedUrl) {
      // Find the specific div, clear anything inside it, and inject the Drive iframe
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

    // 7. Generate the final viewable link!
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const finalUrl = `${origin}/${customFilename}`; // Removed /proof/
    return NextResponse.json({ url: finalUrl });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}