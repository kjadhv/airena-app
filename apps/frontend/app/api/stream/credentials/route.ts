import { NextRequest, NextResponse } from 'next/server';
// Removed unused 'admin' import from 'firebase-admin'
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from "firebase-admin/auth";

// Firebase Admin initialization
if (!getApps().length) {
 try {
  initializeApp({
   credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string)),
  });
  console.log("Firebase Admin initialized successfully.");
 } catch (error: unknown) { // FIX 1: Changed 'any' to 'unknown' for better type safety.
  console.error("Firebase Admin initialization error", error);
 }
}

export async function GET(request: NextRequest) {
 try {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const token = authHeader.split(' ')[1];
  const decodedToken = await getAuth().verifyIdToken(token);
  const userId = decodedToken.uid;

  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  const urlWithQuery = `${backendUrl}/stream/credentials?userId=${encodeURIComponent(userId)}`;
  
  const response = await fetch(urlWithQuery, {
   method: 'GET',
   headers: {
    'Content-Type': 'application/json',
    'Authorization': authHeader,
   },
  });

  // Handle successful responses
  if (response.ok) {
   const data = await response.json();
   
   // Check if backend returned "no stream exists" response
   if (data.exists === false) {
    return NextResponse.json({ exists: false }, { status: 200 });
   }
   
   // Stream exists, add playback URL and return full credentials
   const hlsBaseUrl = process.env.HLS_BASE_URL || 'http://localhost:8000';
   const playbackUrl = `${hlsBaseUrl}/live/${data.streamKey}/index.m3u8`;

   return NextResponse.json({
    ...data,
    playbackUrl,
   });
  }

  // If backend returns 404, this means no stream exists (not an error)
  if (response.status === 404) {
   console.log('No stream found for user, returning exists: false');
   return NextResponse.json({ exists: false }, { status: 200 });
  }

  // Other errors should be logged and returned
  const errorText = await response.text();
  console.error('Backend error:', response.status, errorText);
  return NextResponse.json(
   { error: 'Failed to fetch status from backend', details: errorText }, 
   { status: response.status }
  );

 } catch (error: unknown) { // FIX 2: Changed 'any' to 'unknown'.
  console.error('API proxy GET error:', error);
    // FIX 3: Added a type guard to safely check the error's 'code' property.
  if (typeof error === 'object' && error !== null && 'code' in error && (error as {code: unknown}).code === 'auth/id-token-expired') {
   return NextResponse.json({ error: 'Token expired' }, { status: 401 });
  }
  return NextResponse.json({ error: 'Internal server error in API proxy' }, { status: 500 });
 }
}

export async function POST(request: NextRequest) {
 try {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();

  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  const response = await fetch(`${backendUrl}/stream/credentials`, {
   method: 'POST',
   headers: {
    'Authorization': authHeader,
   },
   body: formData,
  });

  if (!response.ok) {
   const errorText = await response.text();
   console.error('Backend error:', errorText);
   return NextResponse.json(
    { error: 'Failed to fetch credentials from backend', details: errorText },
    { status: response.status }
   );
  }

  const data = await response.json();
  const hlsBaseUrl = process.env.HLS_BASE_URL || 'http://localhost:8000';
  const playbackUrl = `${hlsBaseUrl}/live/${data.streamKey}/index.m3u8`;

  return NextResponse.json({
   ...data,
   playbackUrl,
  });

 } catch (error) { // This 'error' is implicitly 'unknown' which is good practice.
  console.error('API proxy POST error:', error);
  return NextResponse.json(
   { error: 'Internal server error in API proxy' },
   { status: 500 }
  );
 }
}