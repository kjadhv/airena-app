// File: app/api/posts/[postId]/view/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/app/firebase/firebaseAdmin'; // Make sure you're using the admin SDK here
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    
    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const postRef = db.collection('posts').doc(postId);
    const doc = await postRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Atomically increment the views count on the server
    await postRef.update({
      views: FieldValue.increment(1)
    });

    return NextResponse.json({ message: 'View count updated successfully' }, { status: 200 });

  } catch (error: unknown) {
    console.error('API Error updating view count:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}