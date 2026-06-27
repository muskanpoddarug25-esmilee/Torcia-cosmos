import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'whatsapp';
  
  const appId = process.env.META_APP_ID;
  const redirectUri = `${url.origin}/api/auth/meta/callback`;
  
  if (!appId) {
    return NextResponse.json({ error: "META_APP_ID is not configured in environment variables." }, { status: 500 });
  }

  // In development, bypass the Facebook login UI entirely to speed up testing
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.redirect(`${url.origin}/api/auth/meta/callback?state=${type}&code=mock_code`);
  }
  
  // Standard Facebook OAuth URL for Embedded Signup / Direct Connection
  const fbAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${type}&scope=whatsapp_business_management,whatsapp_business_messaging,instagram_basic,instagram_manage_messages,pages_manage_metadata,pages_read_engagement,pages_messaging`;
  
  return NextResponse.redirect(fbAuthUrl);
}
