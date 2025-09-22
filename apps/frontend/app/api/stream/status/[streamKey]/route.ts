// File: app/api/stream/status/[streamKey]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already done
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export async function GET(
  request: NextRequest,
  { params }: { params: { streamKey: string } }
) {
  try {
    const { streamKey } = params;

    if (!streamKey) {
      return NextResponse.json({ error: 'Stream key is required' }, { status: 400 });
    }

    // Query Firestore (Admin SDK) to find user with this stream key
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('streamKey', '==', streamKey).get();

    if (querySnapshot.empty) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    // Get the first (should be only) matching user
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    const isLive = userData?.isStreaming || false;

    return NextResponse.json({
      isLive,
      streamKey,
      stats: {
        viewers: userData?.viewers || 0,
        bitrate: userData?.bitrate || 0,
        fps: userData?.fps || 0,
      },
    });
  } catch (error) {
    console.error('Stream status check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
