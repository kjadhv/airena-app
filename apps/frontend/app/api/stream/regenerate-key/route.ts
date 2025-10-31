import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from "firebase-admin/auth";

// Firebase Admin initialization
if (!getApps().length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
      console.error("❌ FIREBASE_SERVICE_ACCOUNT_KEY is not set!");
      throw new Error("Firebase service account key is missing");
    }
    
    initializeApp({
      credential: cert(JSON.parse(serviceAccountKey)),
    });
    console.log("✅ Firebase Admin initialized in regenerate-key route");
  } catch (error: unknown) {
    console.error("❌ Firebase Admin initialization error", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/stream/regenerate-key - Start');
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No auth header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 Verifying token...');
    
    const decodedToken = await getAuth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid; // 🔥 FIX #2: Use firebaseUid, not userId

    console.log('✅ Token verified, regenerating key for Firebase UID:', firebaseUid);

    const backendUrl = process.env.NESTJS_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    
    console.log('🌐 Backend URL:', backendUrl);
    
    if (!backendUrl) {
      console.error("❌ Backend URL not configured");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 🔥 FIX #2: Send firebaseUid instead of userId
    const response = await fetch(`${backendUrl}/stream/regenerate-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ userId: firebaseUid }), // This will be interpreted as firebaseUid in the backend
    });

    console.log('📥 Backend response:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to regenerate stream key', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    const hlsBaseUrl = process.env.HLS_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    
    if (!hlsBaseUrl) {
      console.error("❌ HLS_BASE_URL not set!");
      return NextResponse.json({ error: 'HLS URL not configured' }, { status: 500 });
    }
    
    const playbackUrl = `${hlsBaseUrl}/live/${data.streamKey}/index.m3u8`;

    console.log('✅ Stream key regenerated successfully');

    return NextResponse.json({
      ...data,
      playbackUrl,
    });

  } catch (error) {
    console.error('❌ API regenerate key error:', error);
    
    if (typeof error === 'object' && error !== null && 'code' in error && (error as {code: unknown}).code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}