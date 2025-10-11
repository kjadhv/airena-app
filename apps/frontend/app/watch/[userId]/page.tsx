'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import VideoPlayer from '@/app/components/CustomVideoPlayer';

interface StreamDetails {
  hlsUrl: string;
  isLive: boolean;
  streamKey: string;
}

export default function WatchPage() {
  const params = useParams();
  const uid = params.uid as string;
  const [streamDetails, setStreamDetails] = useState<StreamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) return;

    const fetchStreamStatus = async () => {
      try {
        // --- THIS IS THE FIX ---
        // Construct the full, correct URL to your backend's public status endpoint.
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/stream/status/${uid}`);
        // --------------------
        
        if (!response.ok) {
          // This will be caught by the catch block below
          throw new Error('Stream not found or is offline.');
        }

        const data: StreamDetails = await response.json();
        setStreamDetails(data);
        // Clear any previous errors if the fetch succeeds
        setError(''); 
      } catch (err) {
        setStreamDetails(null); // Clear old stream details on error
        setError('This stream is currently offline.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Poll for status changes every 15 seconds
    const intervalId = setInterval(fetchStreamStatus, 15000);
    fetchStreamStatus(); // Fetch immediately when the component loads

    // Clean up the interval when the component is unmounted
    return () => clearInterval(intervalId);
  }, [uid]);

  const renderContent = () => {
    if (loading) {
      return <div className="text-center p-8 bg-white/5 rounded-lg">Loading stream...</div>;
    }
    if (error) {
      return <div className="text-center p-8 bg-red-900/50 text-white rounded-lg">{error}</div>;
    }
    if (streamDetails && streamDetails.isLive) {
      return (
        <div>
          <h1 className="text-2xl font-bold mb-4">Watching Stream</h1>
          <VideoPlayer videoUrl={streamDetails.hlsUrl} />
        </div>
      );
    }
    // Fallback for when there's no error but the stream is not live
    return <div className="text-center p-8 bg-white/5 rounded-lg">This stream is offline.</div>;
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {renderContent()}
      </div>
    </main>
  );
}

