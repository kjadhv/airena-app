import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from "firebase-admin/auth";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    console.log('🔄 Regenerating stream key for:', userId);

    const backendUrl = process.env.NESTJS_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    
    if (!backendUrl) {
      console.error("❌ Backend URL not configured");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const response = await fetch(`${backendUrl}/stream/regenerate-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ userId }),
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
      console.error("❌ HLS_BASE_URL is not set!");
      return NextResponse.json({ error: 'HLS URL not configured' }, { status: 500 });
    }
    
    const playbackUrl = `${hlsBaseUrl}/live/${data.streamKey}/index.m3u8`;

    console.log('✅ Stream key regenerated');

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