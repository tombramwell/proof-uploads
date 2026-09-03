import { NextResponse } from 'next/server';

// Vercel serverless functions time out quickly. Bump this to allow the browser time to boot and render.
export const maxDuration = 60; 

async function getBrowser() {
  if (process.env.NODE_ENV === 'production') {
    // Production on Vercel: Serverless-friendly Chromium
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = (await import('puppeteer-core')).default;
    
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  } else {
    // Local development: Standard Puppeteer
    const puppeteer = (await import('puppeteer')).default;
    
    return puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });
  }
}

export async function POST(req) {
  const { url } = await req.json();
  
  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    
    // waitUntil: 'networkidle0' ensures fonts, CSS, and images fully load before capturing
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Capture the page as a PDF
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true 
    });

    await browser.close();

    // Return the PDF directly so the browser can download or display it
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="article-proof.pdf"',
      },
    });

  } catch (error) {
    if (browser) await browser.close();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}