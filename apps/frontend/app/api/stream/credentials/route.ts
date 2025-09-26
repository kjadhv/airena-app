import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  const authorization = request.headers.get('Authorization');

  if (!authorization) {
    return NextResponse.json({ error: 'Authorization header is missing' }, { status: 401 });
  }

  const backendUrl = `${process.env.NESTJS_BACKEND_URL}/stream/credentials`;

  if (!process.env.NESTJS_BACKEND_URL) {
    console.error("NESTJS_BACKEND_URL is not set in the environment variables.");
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Proxy API route error:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}