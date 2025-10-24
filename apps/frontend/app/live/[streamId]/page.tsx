// app/live/[streamId]/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { use } from "react";
import Header from "@/app/components/Sidebar";
import Footer from "@/app/components/Footer";
import AirenaVideoPlayer from "@/app/components/CustomVideoPlayer";
import { ArrowLeft, Wifi, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface StreamData {
  id: string;
  title: string;
  streamKey: string;
  playbackUrl: string;
  authorName: string;
  authorPhotoURL: string | null;
  isActive: boolean;
}

interface StreamListItem {
  id: string;
  title: string;
  authorName: string;
  authorPhotoURL: string | null;
}

export default function StreamViewerPage({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  const { streamId } = use(params);
  const [stream, setStream] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStreamData = useCallback(async () => {
    try {
      // First, get the stream from the active streams list
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/stream/live`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stream data");
      }

      const streams: StreamListItem[] = await response.json();
      const currentStream = streams.find((s) => s.id === streamId);

      if (!currentStream) {
        throw new Error("Stream not found");
      }

      // Get additional stream details including playback URL
      const detailsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/stream/status/${currentStream.id}`
      );

      if (detailsResponse.ok) {
        const details = await detailsResponse.json();
        setStream({
          ...currentStream,
          ...details,
        });
      } else {
        // Fallback if details endpoint fails
        setStream({
          ...currentStream,
          playbackUrl: `${process.env.NEXT_PUBLIC_HLS_URL}/${currentStream.id}/index.m3u8`,
          streamKey: currentStream.id,
          isActive: true,
        });
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching stream:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load stream"
      );
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    fetchStreamData();
  }, [fetchStreamData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <Header />
        <main className="pt-24 pb-16 px-4">
          <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Loading stream...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-transparent">
        <Header />
        <main className="pt-24 pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            <Link
              href="/live"
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Live Streams
            </Link>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">
                Stream Not Available
              </h3>
              <p className="text-gray-400">{error || "Stream not found"}</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link
            href="/live"
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Live Streams
          </Link>

          {/* Video Player - Using Custom AirenaVideoPlayer */}
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl mb-6">
            <AirenaVideoPlayer
              videoUrl={stream.playbackUrl}
              autoPlay={true}
              muted={false}
            />
            
            {/* Live Indicator Overlay - Positioned absolutely */}
            {stream.isActive && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full text-sm font-bold shadow-lg z-20">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
            )}
          </div>

          {/* Stream Info */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {stream.title}
                </h1>
                <div className="flex items-center gap-2 text-emerald-400">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {stream.isActive ? "Streaming now" : "Offline"}
                  </span>
                </div>
              </div>
            </div>

            {/* Author Info */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
              {stream.authorPhotoURL ? (
                <Image
                  src={stream.authorPhotoURL}
                  alt={stream.authorName}
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full border-2 border-emerald-500"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold">
                  {stream.authorName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-white font-semibold text-lg">
                  {stream.authorName}
                </p>
                <p className="text-gray-400 text-sm">Broadcaster</p>
              </div>
            </div>
          </div>

          {/* Chat Section - Placeholder */}
          <div className="mt-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Live Chat</h2>
            <p className="text-gray-400 text-center py-8">
              Chat feature coming soon!
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}