"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { useAuth } from "@/app/context/AuthContext";
import Header from "@/app/components/Sidebar";
import Footer from "@/app/components/Footer";
import UserAvatar from "@/app/components/UserAvatar";
import { db } from "@/app/firebase/config";
import AirenaVideoPlayer from "@/app/components/CustomVideoPlayer";
import ReactionBar from "@/app/components/ReactionBar";
import CommentSection from "@/app/components/CommentSection";

interface VideoData {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  description?: string;
  category?: string;
  createdAt?: Timestamp;
  authorName?: string;
  authorPhotoURL?: string | null;
  views?: number;
  tags?: string[];
  isLive?: boolean;
}

const VideoPlayerPage = () => {
  const { user } = useAuth();
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoId, setVideoId] = useState<string | null>(null);
  const viewLoggedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("v");
    if (id) setVideoId(id);
    else setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!videoId) return;
    setIsLoading(true);
    const videoDocRef = doc(db, "videos", videoId);
    const unsubscribe = onSnapshot(
      videoDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setVideoData({ id: docSnap.id, ...docSnap.data() } as VideoData);
        } else {
          setVideoData(null);
        }
        setIsLoading(false);
      },
      () => setIsLoading(false)
    );
    return () => unsubscribe();
  }, [videoId]);

  // This useEffect handles logging the unique view for the video
  useEffect(() => {
    const logView = async () => {
      // Run only if we have a videoId and haven't already logged a view this session
      if (videoId && !viewLoggedRef.current) {
        // Immediately set the flag to true to prevent re-runs
        viewLoggedRef.current = true;

        try {
          const headers = new Headers();
          if (user) {
            const token = await user.getIdToken();
            headers.append('Authorization', `Bearer ${token}`);
          }
          
          // ✅ FIXED: Call the correct API path
          const response = await fetch(`/api/videos/${videoId}`, {
            method: 'POST',
            headers: headers,
          });

          // ✅ Check if the API returned an error (e.g., 404, 500)
          if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
          }

          const data = await response.json();
          console.log('View logged:', data.message);

        } catch (error) {
          // This block now catches both network errors and API errors
          viewLoggedRef.current = false; // Reset the flag so it can try again later
          console.error("Failed to log view:", error);
        }
      }
    };

    logView();
  }, [videoId, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <Header />
        <div className="pt-28 flex-grow flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!videoData || !videoId) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <Header />
        <div className="pt-28 container mx-auto px-4 text-center flex-grow flex flex-col items-center justify-center" style={{ marginLeft: "var(--sidebar-width, 0rem)" }}>
          <div className="text-lg text-gray-300">No video found.</div>
          <Link href="/watch" className="mt-8 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-full text-white font-semibold transition-colors">
            Go back
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Header />
      <main className="flex-grow pt-20 flex flex-col items-center" style={{ marginLeft: "var(--sidebar-width, 0rem)" }}>
        <div className="w-full max-w-5xl mx-auto px-2">
          {/* Video Player */}
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-4">
            <AirenaVideoPlayer videoUrl={videoData.videoUrl} poster={videoData.thumbnailUrl} />
            <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
              {videoData.isLive && (
                <div className="bg-red-500 px-3 py-1 rounded-md flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="font-bold text-white">LIVE</span>
                </div>
              )}
              {typeof videoData.views === "number" && (
                <div className="bg-black/70 backdrop-blur-sm px-3 py-1 rounded-md flex items-center gap-2">
                  <Users size={16} />
                  <span className="text-white font-bold">{videoData.views.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start justify-between gap-6 w-full mt-2">
            <div className="flex-1 min-w-0">
              {videoData.title && (
                <h1 className="text-2xl font-bold text-white mb-2 truncate">{videoData.title}</h1>
              )}
              <div className="flex items-center gap-2 mb-2">
                <UserAvatar src={videoData.authorPhotoURL} alt={videoData.authorName} size={36} />
                {videoData.authorName && <span className="font-semibold">{videoData.authorName}</span>}
                {videoData.category && <span className="text-xs text-gray-400">• {videoData.category}</span>}
              </div>
              {typeof videoData.views === "number" && (
                <div className="text-sm text-emerald-400 font-semibold mb-1">{videoData.views.toLocaleString()} views</div>
              )}
            </div>
            <ReactionBar postId={videoData.id} collectionName="videos" />
          </div>
          {videoData.description && (
            <div className="mb-6 text-gray-300 text-base max-h-36 overflow-auto whitespace-pre-line leading-relaxed">
              {videoData.description}
            </div>
          )}
          <CommentSection contentId={videoData.id} contentType="video" />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VideoPlayerPage; 