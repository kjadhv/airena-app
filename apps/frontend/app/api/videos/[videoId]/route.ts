import { NextRequest, NextResponse } from 'next/server';
import { db, authAdmin } from '@/app/firebase/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// --- UPDATE a specific video (PUT) ---
export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ videoId: string }> }
) {
    try {
        const { videoId } = await context.params;
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const { title, description, category, tags, visibility, thumbnailUrl } = await req.json();

        if (!title || !description || !category || !tags || !visibility) {
            return NextResponse.json({ error: 'Missing required fields for update' }, { status: 400 });
        }
        
        const videoRef = db.collection('videos').doc(videoId);
        const videoDoc = await videoRef.get();

        if (!videoDoc.exists) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }

        // Security Check: Ensure the user owns the video they are trying to edit
        if (videoDoc.data()?.authorId !== decodedToken.uid) {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this video.' }, { status: 403 });
        }

        // Prepare update data with a more specific type to avoid 'any'
        const updateData: { [key: string]: string | string[] } = {
            title,
            description,
            category,
            tags,
            visibility,
        };

        // Only update the thumbnail if a new one was provided
        if (thumbnailUrl) {
            updateData.thumbnailUrl = thumbnailUrl;
        }

        await videoRef.update(updateData);

        return NextResponse.json({ message: 'Video updated successfully' }, { status: 200 });

    } catch (error: unknown) {
        console.error('API Error updating video:', (error as Error).message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


// --- DELETE a specific video ---
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ videoId: string }> }
) {
    try {
        const { videoId } = await context.params;
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const videoRef = db.collection('videos').doc(videoId);
        const videoDoc = await videoRef.get();

        if (!videoDoc.exists) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }

        // Security Check: Ensure the user owns the video they are trying to delete
        if (videoDoc.data()?.authorId !== decodedToken.uid) {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this video.' }, { status: 403 });
        }

        await videoRef.delete();
        
        return NextResponse.json({ message: 'Video deleted successfully from database' }, { status: 200 });

    } catch (error: unknown) {
        console.error('API Error deleting video:', (error as Error).message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// --- INCREMENT video views (POST) - REVISED FOR UNIQUE VIEWS ---
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ videoId:string }> }
) {
    try {
        const { videoId } = await context.params;
        
        // Check for an authenticated user
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        
        // Handle anonymous users (no token provided)
        if (!idToken) {
            const videoRef = db.collection('videos').doc(videoId);
            await videoRef.update({ views: FieldValue.increment(1) });
            return NextResponse.json({ message: 'Anonymous view counted' }, { status: 200 });
        }
        
        // Handle authenticated users
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Check if this user has already viewed the video in the 'viewedBy' subcollection
        const viewRef = db.collection('videos').doc(videoId).collection('viewedBy').doc(userId);
        const viewDoc = await viewRef.get();

        // If the document exists, the user's view has already been counted. Do nothing.
        if (viewDoc.exists) {
            return NextResponse.json({ message: 'User has already viewed this video' }, { status: 200 });
        }

        // If it's a new view, record it and increment the total count using a batch
        const videoRef = db.collection('videos').doc(videoId);
        const batch = db.batch();

        // Add a document with the user's ID to the 'viewedBy' subcollection
        batch.set(viewRef, { viewedAt: FieldValue.serverTimestamp() });
        
        // Atomically increment the main view count on the video document
        batch.update(videoRef, {
            views: FieldValue.increment(1)
        });

        // Commit the batch
        await batch.commit();

        return NextResponse.json({ message: 'View count updated successfully' }, { status: 201 });

    } catch (error: unknown) {
        console.error('API Error updating view count:', (error as Error).message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}