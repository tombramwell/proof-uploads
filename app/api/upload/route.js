import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

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

    // NEW: Construct the shorter, cleaner filename
    let baseName = "";
    if (arf) baseName += `${arf}`;
    if (proofNumber) baseName += (baseName ? `-v${proofNumber}` : `v${proofNumber}`);
    
    // If the editor left both fields blank, fallback to just "proof"
    if (!baseName) {
      baseName = "proof";
    }
    
    // Sanitize the name to remove any weird characters
    baseName = baseName.replace(/[^a-zA-Z0-9-]/g, '-');
    
    // Attach the .html extension directly to our new clean name
    const customFilename = `${baseName}.html`;

    const blob = await put(customFilename, file, {
      access: 'public',
      contentType: 'text/html',
      allowOverwrite: true,
    });

    return NextResponse.json({ url: blob.url });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}