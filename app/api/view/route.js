import { NextResponse } from 'next/server';

export async function GET(request) {
  // 1. Get the Blob URL from the query parameter
  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get('url');

  if (!blobUrl) {
    return new NextResponse('No file URL provided', { status: 400 });
  }

  try {
    // 2. Fetch the raw HTML string from Vercel Blob
    const response = await fetch(blobUrl);
    
    if (!response.ok) {
      throw new Error("Could not fetch file from storage");
    }
    
    const htmlContent = await response.text();

    // 3. Serve it back to the browser with instructions to display it (inline)
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'inline', 
      },
    });
  } catch (error) {
    return new NextResponse('Failed to load proof: ' + error.message, { status: 500 });
  }
}