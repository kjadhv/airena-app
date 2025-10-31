// app/live/[id]/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Header from "@/app/components/Sidebar";
import Footer from "@/app/components/Footer";
import AirenaVideoPlayer from "@/app/components/CustomVideoPlayer";
import { ArrowLeft, Users, Wifi, WifiOff, Share2 } from "lucide-react";
import Link from "next/link";

interface StreamInfo {
  id: string;
  title: string;
  thumbnailUrl?: string;
  authorName: string;
  authorPhotoURL: string | null;
  streamKey: string;
  playbackUrl: string;
  isActive: boolean;
}

export default function LiveStreamPage() {
  const params = useParams();
  const streamId = params.id as string;
  
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStreamInfo();
    // Check stream status every 10 seconds
    const interval = setInterval(checkStreamStatus, 10000);
    return () => clearInterval(interval);
  }, [streamId]);

  const fetchStreamInfo = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
      
      // First, get all live streams
      const response = await fetch(`${apiUrl}/stream/live`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stream information");
      }

      const streams: StreamInfo[] = await response.json();
      
      // Find the stream by ID
      const stream = streams.find(s => s.id === streamId);
      
      if (!stream) {
        throw new Error("Stream not found or is no longer live");
      }

      setStreamInfo(stream);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching stream:", err);
      setError(err instanceof Error ? err.message : "Failed to load stream");
    } finally {
      setLoading(false);
    }
  };

  const checkStreamStatus = async () => {
    if (!streamInfo?.streamKey) return;
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/stream/status/${streamInfo.streamKey}`, {
        cache: "no-store",
      });

      if (response.ok) {
        const status = await response.json();
        if (!status.isActive) {
          setError("This stream has ended");
        }
      }
    } catch (err) {
      console.error("Error checking stream status:", err);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: streamInfo?.title || "Live Stream",
        text: `Watch ${streamInfo?.authorName}'s live stream on Airena!`,
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <Header />
        <main className="pt-24 pb-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !streamInfo) {
    return (
      <div className="min-h-screen bg-transparent">
        <Header />
        <main className="pt-24 pb-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
                <WifiOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Stream Not Available
                </h3>
                <p className="text-gray-400 mb-4">
                  {error || "This stream is no longer available"}
                </p>
                <Link
                  href="/live"
                  className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Live Streams
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Construct the HLS playback URL
  const playbackUrl = streamInfo.playbackUrl || 
    `${process.env.NEXT_PUBLIC_HLS_BASE_URL || "https://api.airena.app"}/live/${streamInfo.streamKey}/index.m3u8`;

  return (
    <div className="min-h-screen bg-transparent">
      <Header />
      <main className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Link
            href="/live"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Live Streams
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player - Takes 2/3 on large screens */}
            <div className="lg:col-span-2">
              {/* Video Player */}
              <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                <AirenaVideoPlayer
                  videoUrl={playbackUrl}
                  poster={streamInfo.thumbnailUrl}
                  autoPlay={true}
                  muted={false}
                />
              </div>

              {/* Stream Info */}
              <div className="mt-4 p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700">
                {/* Live Badge */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-full">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-sm font-bold">LIVE</span>
                  </div>
                  <button
                    onClick={handleShare}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Share stream"
                  >
                    <Share2 className="w-5 h-5 text-gray-400 hover:text-white" />
                  </button>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-white mb-4">
                  {streamInfo.title}
                </h1>

                {/* Author Info */}
                <div className="flex items-center gap-4">
                  {streamInfo.authorPhotoURL ? (
                    <img
                      src={streamInfo.authorPhotoURL}
                      alt={streamInfo.authorName}
                      className="w-12 h-12 rounded-full border-2 border-emerald-500"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
                      {streamInfo.authorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-lg text-white font-semibold">
                      {streamInfo.authorName}
                    </p>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Wifi className="w-4 h-4" />
                      <span>Streaming now</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat/Info Sidebar - Takes 1/3 on large screens */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 p-6 h-full min-h-[500px]">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Live Chat
                </h2>
                
                {/* Placeholder for chat - you can integrate your chat component here */}
                <div className="text-gray-400 text-center py-12">
                  <p className="mb-2">Chat coming soon!</p>
                  <p className="text-sm text-gray-500">
                    Connect with other viewers in real-time
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stream Guidelines Notice */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-sm">
              💡 <strong>Tip:</strong> For the best experience, ensure you have a stable internet connection. 
              The stream automatically adjusts quality based on your connection speed.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}