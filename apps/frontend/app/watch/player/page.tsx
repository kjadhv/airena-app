"use client";
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Share2, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { doc, updateDoc, increment, collection, query, where, limit, getDocs, Timestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import UserAvatar from '@/app/components/UserAvatar';
import { db } from '@/app/firebase/config';

// ✅ Import ReactionBar and CommentSection
import ReactionBar from '@/app/components/ReactionBar';
import CommentSection from '@/app/components/CommentSection';

interface VideoData {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  description?: string;
  category: 'games' | 'sports';
  createdAt: Timestamp;
  authorName: string;
  authorPhotoURL: string | null;
  views?: number;
  likes?: number;
  commentCount?: number;
}

interface RelatedVideo {
  id: string;
  title: string;
  authorName: string;
  thumbnailUrl?: string;
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
  const [videoId, setVideoId] = useState<string | null>(null);

  // ✅ Get video ID from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('v');
    if (id) setVideoId(id);
    else setIsLoading(false);
  }, []);

  // ✅ Fetch video data
  useEffect(() => {
    if (!videoId) return;

    setIsLoading(true);
    const videoDocRef = doc(db, 'videos', videoId);
    const unsubscribe = onSnapshot(videoDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setVideoData({ id: docSnap.id, ...docSnap.data() } as VideoData);
      } else {
        setVideoData(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching video:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [videoId]);

  // ✅ Fetch related videos
  useEffect(() => {
    if (!videoData) return;

    const fetchRelated = async () => {
      try {
        const relatedQuery = query(
          collection(db, 'videos'),
          where('category', '==', videoData.category),
          limit(10)
        );
        const relatedSnapshot = await getDocs(relatedQuery);
        const related = relatedSnapshot.docs
          .filter(d => d.id !== videoData.id)
          .map(d => ({ id: d.id, ...d.data() } as RelatedVideo))
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setRelatedVideos(related);
      } catch (error) {
        console.error("Error fetching related videos:", error);
      }
    };
    fetchRelated();
  }, [videoData?.id, videoData?.category]);

  // ✅ Increment views
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoId || !videoElement) return;

    const handlePlay = async () => {
      const viewedFlag = `viewed-video-${videoId}`;
      if (!sessionStorage.getItem(viewedFlag)) {
        try {
          await updateDoc(doc(db, 'videos', videoId), {
            views: increment(1),
          });
          sessionStorage.setItem(viewedFlag, 'true');
        } catch (error) {
          console.error("Error incrementing view:", error);
        }
      }
    };

    videoElement.addEventListener('play', handlePlay);
    return () => {
      if (videoElement) videoElement.removeEventListener('play', handlePlay);
    };
  }, [videoId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  // ✅ Loading state
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

  // ✅ Video not found
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
            
            {/* ✅ Left Side: Main Video */}
            <div className="lg:col-span-2">
              {/* Video Player */}
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-4">
                <video 
                  ref={videoRef} 
                  src={videoData.videoUrl} 
                  controls 
                  className="w-full h-full" 
                  autoPlay 
                  poster={videoData.thumbnailUrl}
                />
              </div>

              {/* Video Info + ReactionBar */}
              <div className="space-y-6">
                <h1 className="text-2xl md:text-3xl font-bold">{videoData.title}</h1>
                
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    
                    {/* Author Info */}
                    <div className="flex items-center gap-4">
                      <UserAvatar src={videoData.authorPhotoURL} alt={videoData.authorName} size={48} />
                      <div>
                        <p className="font-semibold text-white">{videoData.authorName}</p>
                        <p className="text-sm text-gray-400">
                          {videoData.views?.toLocaleString() || 0} views • {videoData.createdAt?.toDate().toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/*  ReactionBar + Share + Report */}
                    <div className="flex items-center gap-2">
                      <ReactionBar postId={videoData.id} collectionName="videos" />
                      <button onClick={handleShare} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all">
                        <Share2 size={20} /> 
                        <span className="hidden sm:inline">Share</span>
                      </button>
                      <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all" title="Report">
                        <Flag size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {videoData.description && (
                    <>
                      <div className="border-t border-white/10 my-4" />
                      <div>
                        <p className={`text-gray-300 whitespace-pre-wrap ${!showFullDescription ? 'line-clamp-3' : ''}`}>
                          {videoData.description}
                        </p>
                        {videoData.description.length > 200 && (
                          <button 
                            onClick={() => setShowFullDescription(!showFullDescription)} 
                            className="flex items-center gap-1 text-gray-400 hover:text-white mt-2 text-sm font-semibold"
                          >
                            {showFullDescription ? <>Show less <ChevronUp size={16} /></> : <>Show more <ChevronDown size={16} /></>}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                {/* ✅ Comments Section */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <CommentSection postId={videoData.id} collectionName="videos" />
                </div>
              </div>
            </div>

            {/* ✅ Right Side: Related Videos */}
            <div className="lg:col-span-1">
              <h2 className="text-xl font-bold mb-4">Related Videos</h2>
              <div className="space-y-4">
                {relatedVideos.length > 0 ? (
                  relatedVideos.map((video) => (
                    <Link 
                      key={video.id} 
                      href={`/watch/player?v=${video.id}`} 
                      className="flex gap-3 group cursor-pointer"
                    >
                      <div className="relative w-40 aspect-video bg-gray-800 rounded-lg overflow-hidden shrink-0 border-2 border-transparent group-hover:border-emerald-500 transition-all">
                        {video.thumbnailUrl ? (
                          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <span className="text-gray-500 text-xs">No thumbnail</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold line-clamp-2 group-hover:text-emerald-400 transition-colors">{video.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">{video.authorName}</p>
                        <p className="text-xs text-gray-500 mt-1">{video.views?.toLocaleString() || 0} views</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No related videos found</p>
                )}
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
