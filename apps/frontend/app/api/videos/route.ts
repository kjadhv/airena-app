export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getDb, getAuthAdmin } from '@/app/firebase/firebaseAdmin'; 
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    try {
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Get Firebase instances
        const authAdmin = getAuthAdmin();
        const db = getDb();
        
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        // Allow both admins and creators to create video entries
        if (decodedToken.admin !== true && decodedToken.creator !== true) {
            return NextResponse.json({ error: 'Forbidden: User is not an admin or creator' }, { status: 403 });
        }

        const { 
            title, description, category, videoUrl, 
            thumbnailUrl, tags, visibility 
        } = await req.json();

        // --- Enhanced Validation ---
        const requiredFields = { title, description, category, videoUrl, thumbnailUrl, visibility};
        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                return NextResponse.json({ error: `Missing required field: ${key}` }, { status: 400 });
            }
        }
        const normalizedTags = Array.isArray(tags) ? tags : [tags];
        
        const videoData = {
            title,
            description,
            category,
            videoUrl,
            thumbnailUrl,
            tags: normalizedTags,
            visibility,
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