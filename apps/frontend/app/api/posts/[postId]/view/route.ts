import { NextRequest, NextResponse } from 'next/server';
import { db, authAdmin } from '@/app/firebase/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    postId: string;
  };
};

export async function POST(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { postId } = params;

    console.log('View tracking called for post:', postId);

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      console.error('Post not found:', postId);
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const idToken = req.headers
      .get('Authorization')
      ?.split('Bearer ')[1];

    /* ===================== ANONYMOUS VIEW ===================== */
    if (!idToken) {
      console.log('Anonymous view — incrementing');
      await postRef.update({
        views: FieldValue.increment(1),
      });

      return NextResponse.json(
        { message: 'Anonymous view counted' },
        { status: 200 }
      );
    }

    /* ===================== AUTHENTICATED VIEW ===================== */
    try {
      const decodedToken = await authAdmin.verifyIdToken(idToken);
      const userId = decodedToken.uid;

      console.log('Authenticated user:', userId);

      const viewRef = postRef.collection('viewedBy').doc(userId);
      const userViewDoc = await viewRef.get();

      if (userViewDoc.exists) {
        console.log('User already viewed this post');
        return NextResponse.json(
          { message: 'User has already viewed this post' },
          { status: 200 }
        );
      }

      console.log('New view — incrementing count');

      const batch = db.batch();
      batch.set(viewRef, {
        viewedAt: FieldValue.serverTimestamp(),
      });
      batch.update(postRef, {
        views: FieldValue.increment(1),
      });

      await batch.commit();

      console.log('View count updated successfully');
      return NextResponse.json(
        { message: 'View count updated successfully' },
        { status: 201 }
      );
    } catch (authError) {
      console.error('Token verification failed:', authError);

      await postRef.update({
        views: FieldValue.increment(1),
      });

      return NextResponse.json(
        { message: 'Anonymous view counted (invalid token)' },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
