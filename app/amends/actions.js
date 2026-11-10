'use server';
import { cookies } from 'next/headers';

export async function authenticateTeam(formData) {
  const passcode = formData.get('passcode');
  
  if (passcode === process.env.UPLOAD_PASSCODE) {
    const cookieStore = await cookies();
    
    cookieStore.set('team_auth_token', passcode, { 
      path: '/', 
      httpOnly: true, 
      maxAge: 60 * 60 * 24 * 30 // Remembers them for 30 days
    });
    
    return { success: true };
  }
  
  return { success: false, error: 'Incorrect passcode.' };
}