import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

export async function POST(request) {
  try {
    const { filename, mimeType } = await request.json();

    // 1. Log in as YOU using the OAuth credentials
    const oAuth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oAuth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    // 2. Request a fresh access token
    const { token } = await oAuth2Client.getAccessToken();

    // 3. Define the file we want to create
    const metadata = {
      name: filename,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    };

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // 4. Ask Google for a "Resumable Upload" URL
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType,
        'Origin': origin, 
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const googleError = await response.text();
      throw new Error(`Google rejected the ticket: ${googleError}`);
    }

    // 5. Google provides the URL in a hidden header called "Location"
    const uploadUrl = response.headers.get('Location');

    if (!uploadUrl) {
      throw new Error('Google approved the request but forgot the Location header.');
    }

    // 6. Send the golden ticket back to the browser
    return NextResponse.json({ uploadUrl });
    
  } catch (error) {
    console.error("Drive Auth Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}