import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles POST requests to regenerate a user's stream key by proxying to the backend.
 */
export async function POST(request: NextRequest) {
  // 1. Get Authorization header
  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header is required' }, { status: 401 });
  }

  // 2. Get backend URL from environment variables
  const backendApiUrl = process.env.NESTJS_BACKEND_URL;
  if (!backendApiUrl) {
    console.error("NESTJS_BACKEND_URL is not set in the environment variables.");
    return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
  }

  try {
    // 3. Forward the request to the NestJS backend
    const backendResponse = await fetch(`${backendApiUrl}/stream/regenerate-key`, {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json',
      },
      // MODIFIED: Added the request body to be forwarded to the backend
      body: JSON.stringify(await request.json()),
      cache: 'no-store',
    });

    // 4. Return the backend's response to the client
    const responseData = await backendResponse.json();
    return NextResponse.json(responseData, { status: backendResponse.status });

  } catch (error) {
    console.error('Proxy API route error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}