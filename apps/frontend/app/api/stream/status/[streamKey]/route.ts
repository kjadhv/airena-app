// File: app/api/stream/status/[streamKey]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// This API route acts as a proxy to the real RTMP server's status endpoint.
// This is crucial to prevent leaking the RTMP server's direct address to the client
// and to handle the race condition where a stream is marked "live" in the DB
// before the HLS files are actually available.

export async function GET(
  request: NextRequest,
  { params }: { params: { streamKey: string } }
) {
  try {
    const { streamKey } = params;
    const rtmpServerBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!streamKey) {
      return NextResponse.json({ error: 'Stream key is required' }, { status: 400 });
    }

    if (!rtmpServerBaseUrl) {
      console.error('NEXT_PUBLIC_API_BASE_URL is not set in the environment.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Construct the full URL to the rtmp-server's status endpoint
    const statusUrl = `${rtmpServerBaseUrl}/stream/status/${streamKey}`;

    // Fetch the status from the rtmp-server
    const response = await fetch(statusUrl, {
      // Use a short timeout and revalidate frequently to get the latest status quickly
      next: { revalidate: 1 } 
    });

    // If the rtmp-server returned an error (e.g., 404), proxy that response
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    // If the request was successful, proxy the data
    const data = await response.json();

    // The data from the rtmp-server should be in the format { isLive, hlsUrl, ... }
    // We just pass it through.
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error proxying stream status request:', error);
    // This catches network errors between this proxy and the rtmp-server
    return NextResponse.json({ error: 'Internal server error while fetching stream status' }, { status: 500 });
  }
}
