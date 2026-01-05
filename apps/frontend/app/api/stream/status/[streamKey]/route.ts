import { NextRequest, NextResponse } from 'next/server';
type RouteContext = {
  params: Promise<{
    streamKey: string;
  }>;
};
/**
 * Handles GET requests to fetch the status of a specific stream.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { streamKey } = await context.params; // Await the params Promise
  const backendApiUrl = process.env.NESTJS_BACKEND_URL;

  if (!backendApiUrl) {
    console.error("NESTJS_BACKEND_URL environment variable is not set.");
    return NextResponse.json(
      { message: 'Server configuration error' },
      { status: 500 }
    );
  }

   try {
    const backendResponse = await fetch(
      `${backendApiUrl}/stream/status/${streamKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

      if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(
        'Backend response error:',
        backendResponse.status,
        errorText
      );

      return NextResponse.json(
        { message: 'Failed to fetch stream status from backend' },
        { status: backendResponse.status }
      );
    }

    const responseData = await backendResponse.json();
    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('Error proxying stream status request:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}