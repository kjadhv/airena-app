import { NextRequest, NextResponse } from 'next/server';
import { db, authAdmin } from '@/app/firebase/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    videoId: string;
  };
};
// --- UPDATE a specific video (PUT) ---
export async function PUT(
    req: NextRequest,
    { params }: RouteContext
) {
    try {
        const { videoId } = params;
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

        if (videoDoc.data()?.authorId !== decodedToken.uid) {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this video.' }, { status: 403 });
        }

        const updateData: { [key: string]: string | string[] } = {
            title,
            description,
            category,
            tags,
            visibility,
        };

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
    { params }: RouteContext
) {
    try {
        const { videoId } = params;
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

// --- INCREMENT video views (POST) - REVISED FOR UNIQUE VIEWS & ROBUSTNESS ---
export async function POST(
    req: NextRequest,
    { params }: RouteContext
) {
    try {
        const { videoId } = params;
        const videoRef = db.collection('videos').doc(videoId);

        // ✅ Check if the video document exists right at the beginning
        const videoDoc = await videoRef.get();
        if (!videoDoc.exists) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }
        
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        
        // Handle anonymous users (no token provided)
        if (!idToken) {
            await videoRef.update({ views: FieldValue.increment(1) });
            return NextResponse.json({ message: 'Anonymous view counted' }, { status: 200 });
        }
        
        // Handle authenticated users
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const viewRef = videoRef.collection('viewedBy').doc(userId);
        const userViewDoc = await viewRef.get();

        if (userViewDoc.exists) {
            return NextResponse.json({ message: 'User has already viewed this video' }, { status: 200 });
        }

        const batch = db.batch();
        batch.set(viewRef, { viewedAt: FieldValue.serverTimestamp() });
        batch.update(videoRef, {
            views: FieldValue.increment(1)
        });

        await batch.commit();

        return NextResponse.json({ message: 'View count updated successfully' }, { status: 201 });

    } catch (error: unknown) {
        console.error('API Error updating view count:', (error as Error).message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
