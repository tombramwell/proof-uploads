import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const passcode = formData.get('passcode');
    
    // NEW: Get the custom fields
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

    // NEW: Construct the custom filename
    let prefix = "";
    if (arf) prefix += `ARF-${arf}-`;
    if (proofNumber) prefix += `v-${proofNumber}-`;
    
    // Clean any weird characters out of the prefix just to be safe
    prefix = prefix.replace(/[^a-zA-Z0-9-]/g, '-');
    const customFilename = prefix + file.name;

    const blob = await put(customFilename, file, {
      access: 'public',
      contentType: 'text/html',
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}