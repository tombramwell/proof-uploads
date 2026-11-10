import { cookies } from 'next/headers';
import LoginClient from './LoginClient';

export default async function AmendsLayout({ children }) {
  // Await the cookies object (required in Next.js 15)
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('team_auth_token')?.value;

  // If the cookie matches the .env file, render the dashboard or workspace
  if (authCookie === process.env.UPLOAD_PASSCODE) {
    return <>{children}</>;
  }

  // Otherwise, block them and show the login screen
  return <LoginClient />;
}