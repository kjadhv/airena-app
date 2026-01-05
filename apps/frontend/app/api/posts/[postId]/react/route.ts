import { NextRequest, NextResponse } from 'next/server';
import { db, authAdmin } from '@/app/firebase/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { postId } = await context.params;

    const idToken = req.headers
      .get('Authorization')
      ?.split('Bearer ')[1];

    if (!idToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { reactionType } = await req.json();

    if (!reactionType) {
      return NextResponse.json(
        { error: 'Reaction type is required' },
        { status: 400 }
      );
    }

    const decodedToken = await authAdmin.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const postRef = db.collection('posts').doc(postId);
    const reactionRef = postRef
      .collection('reactions')
      .doc(`${userId}_${reactionType}`);

    await db.runTransaction(async (transaction: any) => {
      const reactionDoc = await transaction.get(reactionRef);
      const postDoc = await transaction.get(postRef);

      if (!postDoc.exists) {
        throw new Error('Post not found');
      }

      const countField = `${reactionType}Count`;

      if (reactionDoc.exists) {
        // Toggle OFF
        transaction.delete(reactionRef);
        transaction.update(postRef, {
          [countField]: FieldValue.increment(-1),
        });
      } else {
        // Toggle ON
        transaction.set(reactionRef, {
          userId,
          type: reactionType,
          createdAt: FieldValue.serverTimestamp(),
        });
        transaction.update(postRef, {
          [countField]: FieldValue.increment(1),
        });
      }
    });

    return NextResponse.json(
      { message: 'Reaction toggled successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      'Reaction API Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
