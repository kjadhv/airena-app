import { NextRequest, NextResponse } from 'next/server';
import { db, authAdmin } from '@/app/firebase/firebaseAdmin'; 
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    try {
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        // Allow both admins and creators to create video entries
        if (decodedToken.admin !== true && decodedToken.creator !== true) {
            return NextResponse.json({ error: 'Forbidden: User is not an admin or creator' }, { status: 403 });
        }

        const { 
            title, description, category, videoUrl, 
            thumbnailUrl, tags, visibility, audience 
        } = await req.json();

        // --- Enhanced Validation ---
        const requiredFields = { title, description, category, videoUrl, thumbnailUrl, visibility, audience };
        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                return NextResponse.json({ error: `Missing required field: ${key}` }, { status: 400 });
            }
        }
         if (!Array.isArray(tags)) {
            return NextResponse.json({ error: 'Tags must be an array' }, { status: 400 });
        }
        
        const videoData = {
            title,
            description,
            category,
            videoUrl,
            thumbnailUrl, // <-- New
            tags,         // <-- New
            visibility,   // <-- New
            audience,     // <-- New
            authorId: decodedToken.uid,
            authorName: decodedToken.name || 'Anonymous',
            authorPhotoURL: decodedToken.picture || null,
            createdAt: Timestamp.now(),
            views: 0,
        };
        
        await db.collection('videos').add(videoData);

        return NextResponse.json({ message: 'Video entry created successfully' }, { status: 201 });

    } catch (error: unknown) {
        console.error('API Error creating video entry:', error);
        // Provide more specific error feedback for token issues
        if (error instanceof Error && error.message.includes("verifyIdToken")) {
             return NextResponse.json({ error: 'Invalid or expired authentication token.' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

