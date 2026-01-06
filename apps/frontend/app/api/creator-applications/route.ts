// app/api/creator-applications/route.ts
export const dynamic = "force-dynamic";
export const runtime = 'nodejs'; // Add this line

import { NextRequest, NextResponse } from 'next/server';
import { getDb, getAuthAdmin } from '@/app/firebase/firebaseAdmin';

export async function GET(req: NextRequest) {
    try {
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const authAdmin = getAuthAdmin();
        const db = getDb();
        
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        if (decodedToken.superAdmin !== true) {
            return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
        }

        const applicationsRef = db.collection('creator-applications');
        const q = applicationsRef.where('status', '==', 'pending');
        const snapshot = await q.get();

        if (snapshot.empty) {
            return NextResponse.json([], { status: 200 });
        }

        const applications = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(applications, { status: 200 });

    } catch (error: unknown) {
        console.error('API Error fetching applications:', (error as Error).message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}