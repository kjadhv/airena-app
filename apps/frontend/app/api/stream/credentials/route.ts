import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return NextResponse.json(
      { message: "Authorization header is required" },
      { status: 401 }
    );
  }

  const backendApiUrl = process.env.NESTJS_BACKEND_URL;
  if (!backendApiUrl) {
    console.error("NESTJS_BACKEND_URL environment variable is not set.");
    return NextResponse.json(
      { message: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    // THIS IS THE LINE TO FIX
    const backendResponse = await fetch(`${backendApiUrl}/stream/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    });

    const responseData = await backendResponse.json();
    return NextResponse.json(responseData, { status: backendResponse.status });

  } catch (error) {
    console.error("Error proxying request to backend:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}