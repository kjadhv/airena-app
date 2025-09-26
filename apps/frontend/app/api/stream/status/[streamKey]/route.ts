import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles GET requests to fetch the status of a specific stream.
 */
export async function GET(
  request: NextRequest,
  context: { params: { streamKey: string } } // <-- Corrected function signature
) {
  const { streamKey } = context.params; // Get the streamKey from the context
  const backendApiUrl = process.env.NESTJS_BACKEND_URL;

  if (!backendApiUrl) {
    console.error("NESTJS_BACKEND_URL environment variable is not set.");
    return NextResponse.json(
      { message: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const backendResponse = await fetch(`${backendApiUrl}/stream/status/${streamKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const responseData = await backendResponse.json();
    return NextResponse.json(responseData, { status: backendResponse.status });

  } catch (error) {
    console.error('Error proxying stream status request:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}