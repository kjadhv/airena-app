// app/go-live/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/app/context/AuthContext";
import Header from "@/app/components/Sidebar";
import Footer from "@/app/components/Footer";
import AirenaVideoPlayer from "@/app/components/CustomVideoPlayer";
import LiveChat from "@/app/components/LiveChat";
import { Key, Copy, Check, Eye, AlertTriangle, EyeOff, UploadCloud, Film } from "lucide-react";

interface StreamCredentials {
  streamKey: string;
  streamUrl: string;
  playbackUrl: string;
  isActive: boolean;
  thumbnailUrl?: string;
  lastActiveAt?: string;
  title?: string;
  description?: string;
  exists?: boolean; // Add optional exists property
}
interface StreamStatus {
  streamKey: string;
  isActive: boolean;
  lastActiveAt: string | null;
  title: string | null;
  createdAt: string;
}

const GoLivePage = () => {
  const { user, loading, isCreator, isAdmin } = useAuth();
  const router = useRouter();
  
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [streamDetailsSubmitted, setStreamDetailsSubmitted] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isSubmittingDetails, setIsSubmittingDetails] = useState(false);
  const [formError, setFormError] = useState("");
  const [credentials, setCredentials] = useState<StreamCredentials | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState("");
  const [copiedStates, setCopiedStates] = useState({ streamKey: false, streamUrl: false });
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [streamStartTime, setStreamStartTime] = useState<Date | null>(null);
  const [uptime, setUptime] = useState("00:00:00");
  const [playerKey, setPlayerKey] = useState(0);
  const [isStreamReady, setIsStreamReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    else if (!loading && user && !isCreator && !isAdmin) router.push("/");
  }, [user, loading, isCreator, isAdmin, router]);

  useEffect(() => {
    if (!user) return;
    const checkStreamStatusOnLoad = async () => {
      setIsCheckingStatus(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/stream/credentials', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data: StreamCredentials = await response.json();
          
          if (data.exists === false) {
            setStreamDetailsSubmitted(false);
          } else if (data.streamKey) {
            setCredentials(data);
            setIsLive(data.isActive || false);
            setTitle(data.title || "");
            setDescription(data.description || "");
            setThumbnailPreview(data.thumbnailUrl || null);
            if (data.isActive && data.lastActiveAt) {
              setStreamStartTime(new Date(data.lastActiveAt));
            }
            setStreamDetailsSubmitted(true);
          }
        }
      } catch (err) {
        console.error("Failed to check initial stream status:", err);
        setStreamDetailsSubmitted(false);
      } finally {
        setIsCheckingStatus(false);
      }
    };
    checkStreamStatusOnLoad();
  }, [user]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
    } else {
      setThumbnailFile(null);
      setThumbnailPreview(null);
    }
  };

  useEffect(() => {
    return () => {
      if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || (!thumbnailFile && !thumbnailPreview)) {
      setFormError("Please fill in all fields and upload a thumbnail.");
      return;
    }
    if (!user) {
      setFormError("Authentication error. Please refresh the page.");
      return;
    }
    setIsSubmittingDetails(true);
    setFormError("");
    setError("");
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile);
      }
      formData.append("userId", user.uid);
      const response = await fetch('/api/stream/credentials', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Failed to initiate stream: ${await response.text()}`);
      }
      const data: StreamCredentials = await response.json();
      setCredentials(data);
      setIsLive(data.isActive || false);
      if (data.isActive) setStreamStartTime(new Date());
      setStreamDetailsSubmitted(true);
    } catch (err) {
      setFormError((err as Error).message || "Failed to start stream.");
    } finally {
      setIsSubmittingDetails(false);
    }
  };
  
  const handleRegenerateKey = async () => {
    if (!window.confirm("This will disconnect your current stream. Continue?")) return;
    if (!user) return;
    setIsRegenerating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stream/regenerate-key', {
        method: "POST",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data: StreamCredentials = await res.json();
      setCredentials(data);
      setIsLive(false);
      setStreamStartTime(null);
      setIsStreamReady(false);
      setPlayerKey(prev => prev + 1);
    } catch (err) {
      setError((err as Error).message || "Failed to regenerate key");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopy = useCallback((text: string, type: 'streamKey' | 'streamUrl') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStates((prev) => ({ ...prev, [type]: true }));
      setTimeout(() => setCopiedStates((prev) => ({ ...prev, [type]: false })), 2500);
    });
  }, []);
  
  const toggleStreamKeyVisibility = () => setShowStreamKey(!showStreamKey);

  useEffect(() => {
    if (!credentials?.streamKey) return;
    const pollStreamStatus = async () => {
      try {
        const res = await fetch(`/api/stream/status/${credentials.streamKey}`);
        if (res.ok) {
          const status: StreamStatus = await res.json();
          const currentlyLive = status.isActive;
          const wasLive = isLive;
          setIsLive(currentlyLive);
          
          if (currentlyLive && !streamStartTime) {
            setStreamStartTime(new Date(status.lastActiveAt || Date.now()));
          } else if (!currentlyLive) {
            setStreamStartTime(null);
            setIsStreamReady(false);
          }
          
          // If stream just went live, refresh the player
          if (currentlyLive && !wasLive) {
            setPlayerKey(prev => prev + 1);
            setIsStreamReady(false);
          }
        }
      } catch (err) { 
        console.error('Failed to poll stream status:', err); 
      }
    };
    const interval = setInterval(pollStreamStatus, 5000);
    return () => clearInterval(interval);
  }, [credentials?.streamKey, streamStartTime, isLive]);

  // Auto-refresh player when stream is live but not ready
  useEffect(() => {
    if (!isLive || isStreamReady) return;
    
    const refreshInterval = setInterval(() => {
      console.log('Refreshing player to check for stream availability...');
      setPlayerKey(prev => prev + 1);
    }, 5000); // Refresh every 5 seconds
    
    // Set stream as ready after 10 seconds (assume it loaded)
    const readyTimeout = setTimeout(() => {
      setIsStreamReady(true);
    }, 10000);
    
    return () => {
      clearInterval(refreshInterval);
      clearTimeout(readyTimeout);
    };
  }, [isLive, isStreamReady]);

  useEffect(() => {
    if (!streamStartTime) {
      setUptime("00:00:00");
      return;
    }
    const updateUptime = () => {
      const diff = new Date().getTime() - streamStartTime.getTime();
      const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setUptime(`${hours}:${minutes}:${seconds}`);
    };
    const interval = setInterval(updateUptime, 1000);
    return () => clearInterval(interval);
  }, [streamStartTime]);


  if (loading || isCheckingStatus) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p>Loading Streaming Dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!user || (!isCreator && !isAdmin)) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="pt-32 pb-16 px-4 max-w-7xl mx-auto space-y-8">
        {!streamDetailsSubmitted ? (
          <div className="bg-gradient-to-br from-gray-900 to-emerald-950/20 border border-emerald-900 rounded-3xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl shadow-emerald-900/20">
            <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-emerald-400"><Film /> Setup Your Livestream</h2>
            <form onSubmit={handleDetailsSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-gray-300 mb-2 font-medium">Stream Title</label>
                <input
                  type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-800/50 px-4 py-3 rounded-lg border border-emerald-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="My Awesome Livestream!"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-gray-300 mb-2 font-medium">Description</label>
                <textarea
                  id="description" value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-800/50 px-4 py-3 rounded-lg border border-emerald-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={4} placeholder="Today we're going to be..."
                />
              </div>
              <div>
                 <label className="block text-gray-300 mb-2 font-medium">Thumbnail</label>
                 <div className="flex items-center gap-4">
                   {thumbnailPreview ? (
                       <Image 
                         src={thumbnailPreview} 
                         alt="Thumbnail preview" 
                         width={128}
                         height={80}
                         className="w-32 h-20 object-cover rounded-lg border-2 border-emerald-700"
                       />
                   ) : (
                       <div className="w-32 h-20 bg-gray-800/50 rounded-lg flex items-center justify-center border-2 border-dashed border-emerald-800/60">
                           <UploadCloud className="w-6 h-6 text-gray-500"/>
                       </div>
                   )}
                   <label htmlFor="thumbnail" className="cursor-pointer px-4 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 rounded-lg transition-colors border border-emerald-600/30">
                       Choose File
                   </label>
                   <input type="file" id="thumbnail" accept="image/*" onChange={handleThumbnailChange} className="hidden"/>
                 </div>
              </div>
              {formError && (<div className="text-red-400 text-sm">{formError}</div>)}
              <div className="pt-2">
                <button 
                  type="submit" disabled={isSubmittingDetails}
                  className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed rounded-lg font-bold transition-all"
                >
                  {isSubmittingDetails ? "Saving..." : "Get Stream Key & Go Live"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-grow space-y-8">
              <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative">
                {credentials?.playbackUrl ? (
                  <AirenaVideoPlayer
                    key={`${credentials.playbackUrl}-${playerKey}`}
                    videoUrl={credentials.playbackUrl}
                    poster={thumbnailPreview || "/api/placeholder/1280/720"}
                    autoPlay
                    muted
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <p>Loading player...</p>
                  </div>
                )}
                {!isLive && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none">
                     <div className="text-center">
                       <div className="text-gray-300 mb-2 text-lg">Stream Preview</div>
                       <div className="text-sm text-gray-400">Start streaming in OBS to see live preview</div>
                     </div>
                   </div>
                )}
                {isLive && !isStreamReady && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none">
                     <div className="text-center">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3"></div>
                       <div className="text-gray-300 mb-2 text-lg">Connecting to Stream...</div>
                       <div className="text-sm text-gray-400">Please wait while we load your stream</div>
                     </div>
                   </div>
                )}
              </div>
              
              <div className="bg-gradient-to-br from-gray-900 to-emerald-950/20 border border-emerald-900 rounded-3xl p-6 shadow-2xl shadow-emerald-900/20">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                  <span className="font-medium text-lg">{isLive ? 'LIVE' : 'OFFLINE'}</span>
                  {isLive && uptime !== "00:00:00" && (
                    <span className="text-sm text-gray-400 font-mono">{uptime}</span>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-emerald-950/20 border border-emerald-900 rounded-3xl p-6 space-y-6 shadow-2xl shadow-emerald-900/20">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-emerald-400"><Key /> Stream Credentials</h2>
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">RTMP Server URL</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-800/50 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto border border-emerald-800/60">
                      {credentials?.streamUrl || "Loading..."}
                    </div>
                    <button onClick={() => credentials && handleCopy(credentials.streamUrl, "streamUrl")} className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg" disabled={!credentials}>
                      {copiedStates.streamUrl ? <Check className="text-emerald-400" /> : <Copy />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Stream Key</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-800/50 px-4 py-3 rounded-lg font-mono text-sm border border-emerald-800/60">
                      {credentials?.streamKey ? (showStreamKey ? credentials.streamKey : "••••••••••••••••••••••••••••••••") : "Loading..."}
                    </div>
                    <button onClick={toggleStreamKeyVisibility} className="p-3 bg-gray-600/30 hover:bg-gray-600/50 rounded-lg" disabled={!credentials}>
                      {showStreamKey ? <EyeOff /> : <Eye />}
                    </button>
                    <button onClick={() => credentials && handleCopy(credentials.streamKey, "streamKey")} className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg" disabled={!credentials}>
                      {copiedStates.streamKey ? <Check className="text-emerald-400" /> : <Copy />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={handleRegenerateKey} disabled={isRegenerating || isLive} className="flex-1 px-6 py-3 bg-red-600/80 hover:bg-red-700/80 disabled:bg-red-600/50 disabled:cursor-not-allowed rounded-lg font-bold transition-all">
                    {isRegenerating ? 'Regenerating...' : 'Generate New Key'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" /> 
                  <div>
                    <div className="font-medium text-red-400 mb-1">Error</div>
                    <div className="text-sm text-red-300">{error}</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-full lg:w-96 lg:flex-shrink-0">
              {credentials?.streamKey && user && (
                <LiveChat streamId={credentials.streamKey} creatorId={user.uid} />
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default GoLivePage;