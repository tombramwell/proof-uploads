import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  // 1. Extract the clean filename from the URL (e.g., ARF-test.html)
  // Note: in newer versions of Next.js, params is a Promise
  const { file } = await params;

  if (!file) {
    return new NextResponse('No file provided', { status: 400 });
  }

  try {
    // 2. Ask Vercel Blob to find the file that matches this name
    const { blobs } = await list({ prefix: file, limit: 1 });
    
    if (blobs.length === 0) {
      return new NextResponse('Proof not found', { status: 404 });
    }
    
    // 3. Fetch the raw HTML from the found Blob
    const response = await fetch(blobs[0].url);
    const htmlContent = await response.text();

    // 4. Serve it inline to the browser
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