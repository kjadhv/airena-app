import { NextRequest, NextResponse } from 'next/server';
import { db, authAdmin } from '@/app/firebase/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
    req: NextRequest, 
    { params }: { params: { postId: string } }
) {
    try {
        const { postId } = params; // ✅ FIXED HERE
        const idToken = req.headers
      .get('Authorization')
      ?.split('Bearer ')[1];

         if (!idToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
        
        const { text } = await req.json();

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json({ error: 'Comment text cannot be empty' }, { status: 400 });
        }

        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const { uid, name, picture } = decodedToken;

        const postRef = db.collection('posts').doc(postId);
        const commentsRef = postRef.collection('comments');

        const newComment = {
            userId: uid,
            userName: name || 'Anonymous',
            userAvatar: picture || '/default-avatar.png',
            text: text.trim(),
            createdAt: FieldValue.serverTimestamp(),
        };

        // Use a transaction to add the comment and update the count
        await db.runTransaction(async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists) {
                throw new Error("Post not found");
            }
            // Add the new comment
            transaction.set(commentsRef.doc(), newComment);
            // Increment the comment count
            transaction.update(postRef, { commentCount: FieldValue.increment(1) });
        });

        return NextResponse.json({ message: 'Comment added successfully' }, { status: 201 });

    } catch (error) {
        console.error("Comment API Error:", error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}