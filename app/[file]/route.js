import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { file } = await params;

  // Safety check: Ignore non-HTML requests to prevent unnecessary storage lookups
  if (!file || (!file.endsWith('.html') && !file.endsWith('.htm'))) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const { blobs } = await list({ prefix: file, limit: 1 });
    
    if (blobs.length === 0) {
      return new NextResponse('Proof not found', { status: 404 });
    }
    
    const response = await fetch(blobs[0].url);
    const htmlContent = await response.text();

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