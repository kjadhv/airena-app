"use client";
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ThumbsUp, Share2, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { doc, getDoc, updateDoc, increment, collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import UserAvatar from '@/app/components/UserAvatar';
import { db } from '@/app/firebase/config';

interface VideoData {
  id: string;
  title: string;
  videoUrl: string;
  description?: string;
  category: 'games' | 'sports';
  createdAt: Timestamp;
  authorName: string;
  authorPhotoURL: string | null;
  views?: number;
  likes?: number;
}

interface RelatedVideo {
  id: string;
  title: string;
  authorName: string;
  authorPhotoURL: string | null;
  views?: number;
  createdAt: Timestamp;
}

const VideoPlayerPage = () => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<RelatedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [hasIncrementedView, setHasIncrementedView] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);

  // Get video ID from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('v');
      setVideoId(id);
    }
  }, []);

  useEffect(() => {
    if (!videoId) return;

    const fetchVideo = async () => {
      setIsLoading(true);
      try {
        const videoDoc = await getDoc(doc(db, 'videos', videoId));
        if (videoDoc.exists()) {
          setVideoData({ id: videoDoc.id, ...videoDoc.data() } as VideoData);
          
          // Fetch related videos from same category
          const relatedQuery = query(
            collection(db, 'videos'),
            where('category', '==', videoDoc.data().category),
            limit(10)
          );
          const relatedSnapshot = await getDocs(relatedQuery);
          const related = relatedSnapshot.docs
            .filter(d => d.id !== videoId)
            .map(d => ({ id: d.id, ...d.data() } as RelatedVideo))
            .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()); // Sort in memory instead
          setRelatedVideos(related);
        }
      } catch (error) {
        console.error("Error fetching video:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  // Increment view count when video starts playing
  useEffect(() => {
    if (!videoId || !videoRef.current || hasIncrementedView) return;

    const handlePlay = async () => {
      if (!hasIncrementedView) {
        try {
          await updateDoc(doc(db, 'videos', videoId), {
            views: increment(1)
          });
          setHasIncrementedView(true);
        } catch (error) {
          console.error("Error incrementing view:", error);
        }
      }
    };

    const video = videoRef.current;
    video.addEventListener('play', handlePlay);
    return () => video.removeEventListener('play', handlePlay);
  }, [videoId, hasIncrementedView]);

  const handleLike = async () => {
    if (!videoId || !user) return;
    
    try {
      await updateDoc(doc(db, 'videos', videoId), {
        likes: increment(1)
      });
      setVideoData(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
    } catch (error) {
      console.error("Error liking video:", error);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <Header />
        <div className="pt-28 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!videoData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
        <Header />
        <div className="pt-28 container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Video not found</h2>
          <Link href="/watch" className="text-emerald-400 hover:text-emerald-300">
            Go back to Watch
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      <Header />
      
      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Video Section */}
            <div className="lg:col-span-2">
              {/* Video Player */}
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  src={videoData.videoUrl}
                  controls
                  className="w-full h-full"
                  autoPlay
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Video Info */}
              <div className="space-y-4">
                <h1 className="text-2xl md:text-3xl font-bold">{videoData.title}</h1>
                
                {/* Stats and Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <UserAvatar 
                      src={videoData.authorPhotoURL} 
                      alt={videoData.authorName} 
                      size={48} 
                    />
                    <div>
                      <p className="font-semibold">{videoData.authorName}</p>
                      <p className="text-sm text-gray-400">
                        {videoData.views?.toLocaleString() || 0} views • {videoData.createdAt?.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleLike}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all"
                    >
                      <ThumbsUp size={20} />
                      <span>{videoData.likes || 0}</span>
                    </button>
                    
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all"
                    >
                      <Share2 size={20} />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                    
                    <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all">
                      <Flag size={20} />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {videoData.description && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className={`text-gray-300 whitespace-pre-wrap ${!showFullDescription ? 'line-clamp-3' : ''}`}>
                      {videoData.description}
                    </p>
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="flex items-center gap-1 text-gray-400 hover:text-white mt-2 text-sm font-semibold"
                    >
                      {showFullDescription ? (
                        <>
                          Show less <ChevronUp size={16} />
                        </>
                      ) : (
                        <>
                          Show more <ChevronDown size={16} />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Related Videos Sidebar */}
            <div className="lg:col-span-1">
              <h2 className="text-xl font-bold mb-4">Related Videos</h2>
              <div className="space-y-4">
                {relatedVideos.map((video) => (
                  <Link
                    key={video.id}
                    href={`/watch/player?v=${video.id}`}
                    className="flex gap-3 group cursor-pointer"
                  >
                    <div className="relative w-40 aspect-video bg-gray-800 rounded-lg overflow-hidden shrink-0 border-2 border-transparent group-hover:border-emerald-500 transition-all">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-2 group-hover:text-emerald-400 transition-colors">
                        {video.title}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">{video.authorName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {video.views?.toLocaleString() || 0} views
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default VideoPlayerPage;