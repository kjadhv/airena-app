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
    console.log("✅ Firebase Admin initialized successfully.");
  } catch (error: unknown) {
    console.error("❌ Firebase Admin initialization error", error);
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
    
    console.log('🔍 Backend URL:', backendUrl);
    
    if (!backendUrl) {
      console.error("❌ Backend URL not configured");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const urlWithQuery = `${backendUrl}/stream/credentials?userId=${encodeURIComponent(userId)}`;
    
    console.log('📡 Fetching existing credentials for:', userId);
    
    const response = await fetch(urlWithQuery, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    console.log('📥 Backend response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      
      if (data.exists === false) {
        console.log('ℹ️ No existing credentials found');
        return NextResponse.json({ exists: false }, { status: 200 });
      }
      
      const hlsBaseUrl = process.env.HLS_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
      
      if (!hlsBaseUrl) {
        console.error("❌ HLS_BASE_URL is not set!");
        return NextResponse.json({ error: 'HLS URL not configured' }, { status: 500 });
      }
      
      const playbackUrl = `${hlsBaseUrl}/live/${data.streamKey}/index.m3u8`;

      console.log('✅ Returning existing credentials');
      
      return NextResponse.json({
        ...data,
        playbackUrl,
      });
    }

    if (response.status === 404) {
      console.log('ℹ️ No stream found (404)');
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const errorText = await response.text();
    console.error('❌ Backend error:', response.status, errorText);
    return NextResponse.json(
      { error: 'Failed to fetch status from backend', details: errorText }, 
      { status: response.status }
    );

  } catch (error: unknown) {
    console.error('❌ API proxy GET error:', error);
    
    if (typeof error === 'object' && error !== null && 'code' in error && (error as {code: unknown}).code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error in API proxy',
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
    
    console.log('🔍 Creating credentials for user:', userId);
    
    // Get user details from Firebase Auth
    const userRecord = await getAuth().getUser(userId);
    
    console.log('👤 User details:', {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
    });

    const formData = await request.formData();
    
    // Add user details to form data
    formData.append('userId', userId);
    formData.append('email', userRecord.email || '');
    formData.append('displayName', userRecord.displayName || userRecord.email?.split('@')[0] || 'User');

    const backendUrl = process.env.NESTJS_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    
    console.log('🔍 Backend URL:', backendUrl);
    
    if (!backendUrl) {
      console.error("❌ Backend URL not configured");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const backendEndpoint = `${backendUrl}/stream/credentials`;
    
    console.log('📡 Sending to backend:', backendEndpoint);
    
    const response = await fetch(backendEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
      body: formData,
    });

    console.log('📥 Backend response:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create credentials', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    const hlsBaseUrl = process.env.HLS_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    
    if (!hlsBaseUrl) {
      console.error("❌ HLS_BASE_URL is not set!");
      return NextResponse.json({ error: 'HLS URL not configured' }, { status: 500 });
    }
    
    const playbackUrl = `${hlsBaseUrl}/live/${data.streamKey}/index.m3u8`;

    console.log('✅ Credentials created successfully');

    return NextResponse.json({
      ...data,
      playbackUrl,
    });

  } catch (error) {
    console.error('❌ API proxy POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}