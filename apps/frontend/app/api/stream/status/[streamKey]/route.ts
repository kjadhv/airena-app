import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles GET requests to fetch the status of a specific stream by proxying
 * the request to the NestJS backend.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { streamKey: string } }
) {
  // 1. Get the streamKey from the dynamic URL parameter
  const { streamKey } = params;
  if (!streamKey) {
    return NextResponse.json({ message: 'Stream key is required' }, { status: 400 });
  }

  // 2. Use the correct server-side environment variable for the backend URL
  const backendApiUrl = process.env.NESTJS_BACKEND_URL;
  if (!backendApiUrl) {
    console.error("NESTJS_BACKEND_URL environment variable is not set.");
    return NextResponse.json(
      { message: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    // 3. Construct the full URL to the NestJS backend's status endpoint
    const statusUrl = `${backendApiUrl}/stream/status/${streamKey}`;

    // 4. Fetch the status from the backend
    const backendResponse = await fetch(statusUrl, {
      method: 'GET',
      // Always fetch the latest status, do not cache
      cache: 'no-store', 
    });

    // 5. Proxy the backend's response (both success and error) back to the client
    const responseData = await backendResponse.json();
    return NextResponse.json(responseData, { status: backendResponse.status });

  } catch (error) {
    console.error('Error proxying stream status request:', error);
    // This catches network errors between this proxy and the NestJS backend
    return NextResponse.json(
      { message: 'An internal server error occurred while fetching stream status' },
      { status: 500 }
    );
  }
}