export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from "firebase-admin/auth";

// Firebase Admin initialization
if (!getApps().length) {
  try {
    let parsedKey;
    
    // Try base64 first (more reliable for Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64) {
      const decoded = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64, 
        'base64'
      ).toString('utf8');
      parsedKey = JSON.parse(decoded);
    } 
    // Fallback to JSON string
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      let cleanedKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      
      // Remove quotes if present
      if ((cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) ||
          (cleanedKey.startsWith("'") && cleanedKey.endsWith("'"))) {
        cleanedKey = cleanedKey.slice(1, -1);
      }
      
      // Handle escaped newlines
      cleanedKey = cleanedKey.replace(/\\\\n/g, '\\n').replace(/\\n/g, '\n');
      
      parsedKey = JSON.parse(cleanedKey);
    } else {
      throw new Error("Firebase service account key is missing");
    }
    
    initializeApp({
      credential: cert(parsedKey),
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error: unknown) {
    console.error("Firebase Admin initialization error:", error);
    throw error;
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

    const backendUrl = process.env.NESTJS_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    
    if (!backendUrl) {
      console.error("Backend URL not configured");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const urlWithQuery = `${backendUrl}/stream/credentials?userId=${encodeURIComponent(userId)}`;
    
    const response = await fetch(urlWithQuery, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.exists === false) {
        return NextResponse.json({ exists: false }, { status: 200 });
      }
      
      const hlsBaseUrl = process.env.HLS_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
      
      if (!hlsBaseUrl) {
        console.error("HLS_BASE_URL not set!");
        return NextResponse.json({ error: 'HLS URL not configured' }, { status: 500 });
      }
      
      const playbackUrl = `${hlsBaseUrl}/live/${data.streamKey}/index.m3u8`;

      return NextResponse.json({
        ...data,
        playbackUrl,
      });
    }

    if (response.status === 404) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const errorText = await response.text();
    console.error('Backend error:', response.status, errorText);
    return NextResponse.json(
      { error: 'Failed to fetch from backend', details: errorText }, 
      { status: response.status }
    );

  } catch (error: unknown) {
    console.error('API GET error:', error);
    
    if (typeof error === 'object' && error !== null && 'code' in error && 
        (error as {code: unknown}).code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;
    
    const userRecord = await getAuth().getUser(userId);

    const formData = await request.formData();
    formData.append('userId', userId);
    formData.append('email', userRecord.email || '');
    formData.append('displayName', userRecord.displayName || userRecord.email?.split('@')[0] || 'User');

    const backendUrlPost = process.env.NESTJS_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    
    if (!backendUrlPost) {
      console.error("Backend URL not configured");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const backendEndpoint = `${backendUrlPost}/stream/credentials`;
    
    const response = await fetch(backendEndpoint, {
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
        { error: 'Failed to create credentials', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    const hlsBaseUrlPost = process.env.HLS_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    
    if (!hlsBaseUrlPost) {
      console.error("HLS_BASE_URL not set!");
      return NextResponse.json({ error: 'HLS URL not configured' }, { status: 500 });
    }
    
    const playbackUrl = `${hlsBaseUrlPost}/live/${data.streamKey}/index.m3u8`;

    return NextResponse.json({
      ...data,
      playbackUrl,
    });

  } catch (error) {
    console.error('API POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}