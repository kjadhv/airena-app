// apps/web/app/api/stream/credentials/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, email, displayName } = body;

    // Forward to NestJS backend
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${backendUrl}/stream/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ userId, email, displayName }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch credentials from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // ✅ FIX: Ensure playbackUrl includes /live/ prefix
    const hlsBaseUrl = process.env.HLS_BASE_URL || 'http://localhost:8000';
    const playbackUrl = `${hlsBaseUrl}/live/${data.streamKey}/index.m3u8`;

    return NextResponse.json({
      ...data,
      playbackUrl, // Override with correct URL
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}