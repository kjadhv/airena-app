"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Header from "@/app/components/Sidebar";
import Footer from "@/app/components/Footer";
import AirenaVideoPlayer from "@/app/components/CustomVideoPlayer";
import { ArrowLeft, Users, Wifi, WifiOff, Share2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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

  const apiUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

  // 🔹 Fetch stream info
  const fetchStreamInfo = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/stream/live`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stream information");
      }

      const streams: StreamInfo[] = await response.json();
      const stream = streams.find((s) => s.id === streamId);

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
  }, [apiUrl, streamId]);

  // 🔹 Check stream status
  const checkStreamStatus = useCallback(async () => {
    if (!streamInfo?.streamKey) return;

    try {
      const response = await fetch(
        `${apiUrl}/stream/status/${streamInfo.streamKey}`,
        { cache: "no-store" }
      );

      if (response.ok) {
        const status = await response.json();
        if (!status.isActive) {
          setError("This stream has ended");
        }
      }
    } catch (err) {
      console.error("Error checking stream status:", err);
    }
  }, [apiUrl, streamInfo?.streamKey]);

  // 🔹 Effects
  useEffect(() => {
    fetchStreamInfo();
    const interval = setInterval(checkStreamStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStreamInfo, checkStreamStatus]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: streamInfo?.title || "Live Stream",
        text: `Watch ${streamInfo?.authorName}'s live stream on Airena!`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  // 🔹 Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <Header />
        <main className="pt-24 pb-16 px-4 flex justify-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  // 🔹 Error state
  if (error || !streamInfo) {
    return (
      <div className="min-h-screen bg-transparent">
        <Header />
        <main className="pt-24 pb-16 px-4 flex justify-center">
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
              className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Live Streams
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const playbackUrl =
    streamInfo.playbackUrl ||
    `${process.env.NEXT_PUBLIC_HLS_BASE_URL || "https://api.airena.app"}/live/${
      streamInfo.streamKey
    }/index.m3u8`;

  return (
    <div className="min-h-screen bg-transparent">
      <Header />

      <main className="pt-20 pb-16 px-4 max-w-7xl mx-auto">
        <Link
          href="/live"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Live Streams
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video */}
          <div className="lg:col-span-2">
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <AirenaVideoPlayer
                videoUrl={playbackUrl}
                poster={streamInfo.thumbnailUrl}
                autoPlay
                muted={false}
              />
            </div>

            {/* Info */}
            <div className="mt-4 p-6 bg-gray-900 rounded-xl border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="px-3 py-1.5 bg-red-500 text-white rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
                <button onClick={handleShare}>
                  <Share2 className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
              </div>

              <h1 className="text-3xl font-bold mb-4">{streamInfo.title}</h1>

              <div className="flex items-center gap-4">
                {streamInfo.authorPhotoURL ? (
                  <div className="relative w-12 h-12">
                    <Image
                      src={streamInfo.authorPhotoURL}
                      alt={streamInfo.authorName}
                      fill
                      className="rounded-full object-cover border-2 border-emerald-500"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-xl font-bold">
                    {streamInfo.authorName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold">{streamInfo.authorName}</p>
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <Wifi className="w-4 h-4" /> Streaming now
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat placeholder */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-emerald-400" />
              Live Chat
            </h2>
            <p className="text-gray-400 text-center py-12">
              Chat coming soon!
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
