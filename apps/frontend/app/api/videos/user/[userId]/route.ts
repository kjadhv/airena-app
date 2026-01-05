import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/app/firebase/config';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const videosQuery = query(
      collection(db, 'videos'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const videosSnapshot = await getDocs(videosQuery);
    const videos = videosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ videos }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}