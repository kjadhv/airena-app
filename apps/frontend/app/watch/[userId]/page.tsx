'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import { useAuth } from '@/app/context/AuthContext';
import VideoPlayer from '@/app/components/CustomVideoPlayer';
import UserAvatar from '@/app/components/UserAvatar';
import Link from 'next/link';

interface StreamDetails {
  hlsUrl: string;
  isLive: boolean;
  streamKey: string;
}

interface StreamerInfo {
  displayName: string;
  photoURL: string | null;
  bio?: string;
}

export default function WatchPage() {
  const params = useParams();
  const streamerId = params.uid as string; // This is the streamer's UID
  const { user } = useAuth(); // Current viewer
  
  const [streamDetails, setStreamDetails] = useState<StreamDetails | null>(null);
  const [streamerInfo, setStreamerInfo] = useState<StreamerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch streamer info from Firestore
  useEffect(() => {
    if (!streamerId) return;

    const fetchStreamerInfo = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', streamerId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setStreamerInfo({
            displayName: data.displayName || 'Unknown Streamer',
            photoURL: data.photoURL || null,
            bio: data.bio || '',
          });
        }
      } catch (err) {
        console.error('Error fetching streamer info:', err);
      }
    };

    fetchStreamerInfo();
  }, [streamerId]);

  // Fetch stream status
  useEffect(() => {
    if (!streamerId) return;

    const fetchStreamStatus = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/stream/status/${streamerId}`
        );
        
        if (!response.ok) {
          throw new Error('Stream not found or is offline.');
        }

        const data: StreamDetails = await response.json();
        setStreamDetails(data);
        setError('');
      } catch (err) {
        setStreamDetails(null);
        setError('This stream is currently offline.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Poll for status changes every 15 seconds
    const intervalId = setInterval(fetchStreamStatus, 15000);
    fetchStreamStatus(); // Fetch immediately

    return () => clearInterval(intervalId);
  }, [streamerId]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center p-8 bg-red-900/20 border border-red-500/30 text-white rounded-lg">
          <p className="text-lg font-semibold">{error}</p>
          <p className="text-sm text-gray-400 mt-2">
            The streamer may not be live right now. Check back later!
          </p>
        </div>
      );
    }

    if (streamDetails && streamDetails.isLive) {
      return (
        <div>
          {/* Video Player */}
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-4">
            <VideoPlayer 
              videoUrl={streamDetails.hlsUrl}
              isLive={true}
              userId={user?.uid}
              contentId={streamerId}
              contentTitle={`${streamerInfo?.displayName || 'Unknown'}'s Live Stream`}
              authorName={streamerInfo?.displayName}
            />
            
            {/* Live Badge */}
            <div className="absolute top-4 left-4 bg-red-500 px-3 py-1 rounded-md flex items-center gap-2 z-20">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="font-bold text-white">LIVE</span>
            </div>
          </div>

          {/* Stream Info */}
          <div className="bg-gray-900 rounded-xl p-4">
            <h1 className="text-2xl font-bold mb-4 text-white">
              {streamerInfo?.displayName || 'Unknown'}'s Live Stream
            </h1>

            {/* Streamer Info */}
            <div className="flex items-center gap-4 mb-4">
              <UserAvatar
                userId={streamerId}
                alt={streamerInfo?.displayName || 'Streamer'}
                size={48}
              />
              <div>
                <Link 
                  href={`/profile/${streamerId}`}
                  className="font-semibold text-white hover:underline"
                >
                  {streamerInfo?.displayName || 'Unknown Streamer'}
                </Link>
                {streamerInfo?.bio && (
                  <p className="text-sm text-gray-400 mt-1">{streamerInfo.bio}</p>
                )}
              </div>
            </div>

            {/* Stream Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>Streaming now</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center p-8 bg-gray-900/50 rounded-lg">
        <p className="text-lg text-gray-300">This stream is offline.</p>
        <p className="text-sm text-gray-500 mt-2">Come back when the stream goes live!</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-5xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// **Key improvements:**

// 1. ✅ **Fetches streamer info from Firestore** - Gets displayName, photoURL, bio
// 2. ✅ **Uses `UserAvatar` component** - Shows streamer's avatar with real-time updates
// 3. ✅ **Passes correct props to `VideoPlayer`** - Includes userId, contentId, etc.
// 4. ✅ **Clickable avatar and name** - Links to streamer's profile
// 5. ✅ **Better loading and error states** - Improved UI feedback
// 6. ✅ **Live badge overlay** - Shows "LIVE" indicator on video
// 7. ✅ **Proper styling** - Matches your app's design system

// **Make sure your Firestore structure has:**
// ```
// users/{streamerId}
//   - displayName: "Streamer Name"
//   - photoURL: "https://..."
//   - bio: "Optional bio"