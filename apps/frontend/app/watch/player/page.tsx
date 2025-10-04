"use client";
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Share2, Flag, Heart, MessageCircle, Send, MoreVertical, Eye, Users } from 'lucide-react';
import { doc, updateDoc, increment, collection, query, where, limit, getDocs, Timestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import Header from '@/app/components/Sidebar';
import Footer from '@/app/components/Footer';
import UserAvatar from '@/app/components/UserAvatar';
import { db } from '@/app/firebase/config';
import ReactionBar from '@/app/components/ReactionBar';

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
  tags?: string[];
}

interface Comment {
  id: string;
  text: string;
  authorName: string;
  authorPhotoURL: string | null;
  timestamp: string;
}

const VideoPlayerPage = () => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [liveViewers, setLiveViewers] = useState(2400);
  const [newComment, setNewComment] = useState('');
  
  // Mock comments for the live chat
  const [comments] = useState<Comment[]>([
    { id: '1', text: 'Love that summer dress! 😍', authorName: 'Emily', authorPhotoURL: null, timestamp: '2m ago' },
    { id: '2', text: 'Is the denim jacket available in size L?', authorName: 'Michael', authorPhotoURL: null, timestamp: '1m ago' },
    { id: '3', text: 'Just ordered the boho bag!', authorName: 'Sophie', authorPhotoURL: null, timestamp: 'Just now' }
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('v');
    if (id) setVideoId(id);
    else setIsLoading(false);
  }, []);

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

  const handleSendComment = () => {
    if (newComment.trim()) {
      // Handle comment submission here
      console.log('Comment:', newComment);
      setNewComment('');
    }
  };

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
        <div className="pt-28 container mx-auto px-4 text-center flex-grow flex flex-col items-center justify-center" style={{ marginLeft: 'var(--sidebar-width, 0rem)' }}>
          <h2 className="text-4xl font-bold mb-6">Video Not Found</h2>
          <p className="text-lg text-gray-300 mb-8">The video you are looking for might have been removed or does not exist.</p>
          <Link href="/watch" className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-full text-white font-semibold transition-colors">
            Go back to Watch
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const safeVideoId: string = videoId;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Header />
      
      <main className="flex-grow pt-20 transition-all duration-300 ease-out" style={{ marginLeft: 'var(--sidebar-width, 0rem)' }}>
        <div className="h-[calc(100vh-5rem)] flex">
          
          {/* Main Video Section - Left Side */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Video Player */}
            <div className="relative flex-1 bg-black">
              <video 
                ref={videoRef} 
                src={videoData.videoUrl} 
                controls 
                className="w-full h-full object-contain" 
                autoPlay 
                poster={videoData.thumbnailUrl}
              />
              
              {/* Live Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="bg-red-500 px-3 py-1 rounded-md flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="font-bold text-sm">LIVE</span>
                </div>
                <div className="bg-black/80 backdrop-blur-sm px-3 py-1 rounded-md flex items-center gap-2">
                  <Users size={16} />
                  <span className="font-semibold text-sm">{liveViewers.toLocaleString()} watching</span>
                </div>
              </div>
            </div>

            {/* Stream Info Bar */}
            <div className="bg-gray-950 border-t border-white/10 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <UserAvatar src={videoData.authorPhotoURL} alt={videoData.authorName} size={48} />
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-white truncate">{videoData.title}</h1>
                    <p className="text-sm text-gray-400">{videoData.authorName} • {videoData.category}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <button className="bg-emerald-500 hover:bg-emerald-600 px-6 py-2 rounded-full font-semibold transition-colors">
                    Follow
                  </button>
                  <ReactionBar postId={safeVideoId} collectionName="videos" />
                  <button onClick={handleShare} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <Share2 size={20} />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <Flag size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-gray-950 border-t border-white/10 p-6 overflow-y-auto max-h-64">
              <h3 className="text-lg font-bold mb-4">Comments</h3>
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <UserAvatar src={comment.authorPhotoURL} alt={comment.authorName} size={32} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{comment.authorName}</span>
                        <span className="text-xs text-gray-500">{comment.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Products & Chat */}
          <div className="w-96 bg-gray-950 border-l border-white/10 flex flex-col">
            
            {/* Featured Products */}
            <div className="border-b border-white/10 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Featured Products</h3>
                <button className="text-emerald-400 text-sm hover:text-emerald-300">See All</button>
              </div>
              
              <div className="space-y-3">
                {/* Product 1 */}
                <div className="flex gap-3 bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                  <div className="w-16 h-16 bg-gray-800 rounded-lg overflow-hidden shrink-0">
                    <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-purple-500/20"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold truncate">Summer Floral Dress</h4>
                    <p className="text-xs text-emerald-400 mt-1">$129.99</p>
                    <p className="text-xs text-gray-400 mt-1">8 in stock</p>
                  </div>
                  <button className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 h-fit">
                    Add
                  </button>
                </div>

                {/* Product 2 */}
                <div className="flex gap-3 bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                  <div className="w-16 h-16 bg-gray-800 rounded-lg overflow-hidden shrink-0">
                    <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold truncate">Vintage Denim Jacket</h4>
                    <p className="text-xs text-emerald-400 mt-1">$89.99</p>
                    <p className="text-xs text-gray-400 mt-1">15 in stock</p>
                  </div>
                  <button className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 h-fit">
                    Add
                  </button>
                </div>

                {/* Product 3 */}
                <div className="flex gap-3 bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                  <div className="w-16 h-16 bg-gray-800 rounded-lg overflow-hidden shrink-0">
                    <div className="w-full h-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold truncate">Boho Style Bag</h4>
                    <p className="text-xs text-emerald-400 mt-1">$59.99</p>
                    <p className="text-xs text-gray-400 mt-1">5 in stock</p>
                  </div>
                  <button className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 h-fit">
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Live Chat */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-bold">Live Chat</h3>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <UserAvatar src={comment.authorPhotoURL} alt={comment.authorName} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{comment.authorName}</span>
                        <span className="text-xs text-gray-500">{comment.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1 break-words">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/10 focus-within:border-emerald-500 transition-colors">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent outline-none text-sm"
                  />
                  <button 
                    onClick={handleSendComment}
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VideoPlayerPage;