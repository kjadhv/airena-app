// app/live/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import Header from "@/app/components/Sidebar";
import Footer from "@/app/components/Footer";
import { Play, Users, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";

interface LiveStream {
  id: string;
  title: string;
  thumbnailUrl?: string;
  authorName: string;
  authorPhotoURL: string | null;
}

export default function LivePage() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLiveStreams();
    // Refresh streams every 30 seconds
    const interval = setInterval(fetchLiveStreams, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveStreams = async () => {
    try {
      // Get API URL from environment variable with fallback
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
      
      console.log("✅ Using API URL:", apiUrl);

      const fullUrl = `${apiUrl}/stream/live`;
      console.log("🔍 Fetching from:", fullUrl);

      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add cache control to prevent caching issues
        cache: "no-store",
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);
        throw new Error(
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("✅ Fetched streams:", data);
      
      // Ensure data is an array
      if (!Array.isArray(data)) {
        throw new Error("Invalid response format: expected an array");
      }

      setStreams(data);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching live streams:", err);
      
      let errorMessage = "Failed to load live streams.";
      
      if (err instanceof TypeError && err.message.includes("fetch")) {
        errorMessage = "Cannot connect to server. Please ensure the backend is running.";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <Header />
      <main className="pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
              <Wifi className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-semibold">LIVE NOW</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Live Streams
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Watch live sports events, competitions, and exclusive content from
              around the world
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-400">Loading live streams...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
                <WifiOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Connection Error
                </h3>
                <p className="text-gray-400 mb-4">{error}</p>
                <button
                  onClick={fetchLiveStreams}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* No Streams State */}
          {!loading && !error && streams.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-12 max-w-md text-center backdrop-blur-sm">
                <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <WifiOff className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  No Live Streams
                </h3>
                <p className="text-gray-400 mb-6">
                  There are no active streams right now. Check back later for
                  live sports action!
                </p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          )}

          {/* Streams Grid */}
          {!loading && !error && streams.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {streams.map((stream) => (
                <Link
                  key={stream.id}
                  href={`/live/${stream.id}`}
                  className="group"
                >
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700/50 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-2">
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={stream.thumbnailUrl || "/placeholder-stream.jpg"}
                        alt={stream.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {/* Live Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-full text-sm font-bold shadow-lg">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        LIVE
                      </div>
                      {/* Play Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <Play className="w-8 h-8 text-white ml-1" fill="white" />
                        </div>
                      </div>
                    </div>

                    {/* Stream Info */}
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                        {stream.title}
                      </h3>

                      {/* Author Info */}
                      <div className="flex items-center gap-3">
                        {stream.authorPhotoURL ? (
                          <img
                            src={stream.authorPhotoURL}
                            alt={stream.authorName}
                            className="w-10 h-10 rounded-full border-2 border-gray-700"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                            {stream.authorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-gray-300 font-medium">
                            {stream.authorName}
                          </p>
                          <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <Wifi className="w-3 h-3" />
                            <span>Streaming now</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Stream Count */}
          {!loading && !error && streams.length > 0 && (
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800/50 border border-gray-700 rounded-full backdrop-blur-sm">
                <Users className="w-5 h-5 text-emerald-400" />
                <span className="text-white font-semibold">
                  {streams.length} {streams.length === 1 ? "stream" : "streams"}{" "}
                  live
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}