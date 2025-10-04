"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Header from "@/app/components/Sidebar";
import Footer from "@/app/components/Footer";
import { Key, Copy, Check, Eye, XCircle, RefreshCw, ExternalLink, AlertTriangle, EyeOff } from "lucide-react";
import Link from "next/link";

interface StreamCredentials {
  streamKey: string;
  streamUrl: string;
  playbackUrl: string;
  isActive: boolean;
}

interface StreamStats {
  viewers: number;
  uptime: string;
  bitrate: number;
  fps: number;
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [credentials, setCredentials] = useState<StreamCredentials | null>(null);
  const [isLoadingCreds, setIsLoadingCreds] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState("");
  const [streamStats, setStreamStats] = useState<StreamStats>({
    viewers: 0,
    uptime: "00:00:00",
    bitrate: 0,
    fps: 0,
  });
  const [copiedStates, setCopiedStates] = useState({
    streamKey: false,
    streamUrl: false,
    watchUrl: false,
  });
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [streamStartTime, setStreamStartTime] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'idle'>('idle');

  // Auth redirect
  useEffect(() => {
    if (!loading && !user) router.push("/");
    else if (!loading && user && !isCreator && !isAdmin) router.push("/");
  }, [user, loading, isCreator, isAdmin, router]);

  const fetchCredentials = useCallback(async () => {
    setIsLoadingCreds(true);
    setError("");
    if (!user) {
      setError("Authentication required");
      setIsLoadingCreds(false);
      return;
    }
    
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/stream/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        // THIS IS THE FIX: Send full user details to allow the backend to create a user record
        body: JSON.stringify({ 
            userId: user.uid,
            email: user.email,
            displayName: user.displayName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch credentials: ${response.status}`);
      }

      const data: StreamCredentials = await response.json();
      setCredentials(data);
      setIsLive(data.isActive || false);
      if (data.isActive) setStreamStartTime(new Date());
      
    } catch (err: unknown) {
      console.error("Credential fetch error:", err);
      if (err instanceof Error) {
        setError(err.message || "Failed to fetch credentials. Ensure the API is running.");
      } else {
        setError("An unknown error occurred while fetching credentials.");
      }
    } finally {
      setIsLoadingCreds(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && user && (isCreator || isAdmin)) fetchCredentials();
  }, [user, loading, isCreator, isAdmin, fetchCredentials]);

  const handleRegenerateKey = async () => {
    if (!window.confirm("Regenerating your key will disconnect active streams. Continue?")) return;
    if (!user) return;
    
    setIsRegenerating(true);
    setError("");
    
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stream/regenerate-key', {
        method: "POST",
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.uid }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Regenerate API Error:', res.status, errorText);
        throw new Error(`Failed to regenerate key: ${res.status}`);
      }
      
      const data: StreamCredentials = await res.json();
      setCredentials(data);
      setIsLive(false);
      setStreamStartTime(null);
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setConnectionStatus('idle');
      
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || "Failed to regenerate key");
      } else {
        setError("Failed to regenerate key");
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopy = useCallback((text: string, type: keyof typeof copiedStates) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStates((prev) => ({ ...prev, [type]: true }));
      setTimeout(() => setCopiedStates((prev) => ({ ...prev, [type]: false })), 2500);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }, []);

  const toggleStreamKeyVisibility = () => setShowStreamKey(!showStreamKey);

  const watchUrl = credentials
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/watch/${credentials.streamKey}`
    : "";

  useEffect(() => {
    if (!credentials?.playbackUrl || !videoRef.current) return;
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }
    
    const hlsUrl = credentials.playbackUrl;
    setConnectionStatus('connecting');
    
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setConnectionStatus('connected');
        setError('');
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setConnectionStatus('error');
          setError('Stream playback error. The stream may not be active yet.');
        }
      });
      hlsRef.current = hls;
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = hlsUrl;
      videoRef.current.addEventListener('loadeddata', () => setConnectionStatus('connected'));
      videoRef.current.addEventListener('error', () => setConnectionStatus('error'));
    }
  }, [credentials?.playbackUrl]);

  useEffect(() => {
    if (!credentials?.streamKey) return;
    
    const pollStreamStatus = async () => {
      try {
        const res = await fetch(`/api/stream/status/${credentials.streamKey}`);
        if (res.ok) {
          const status: StreamStatus = await res.json();
          setIsLive(status.isActive);
          if (status.isActive && !streamStartTime) {
            setStreamStartTime(new Date(status.lastActiveAt || Date.now()));
          } else if (!status.isActive && streamStartTime) {
            setStreamStartTime(null);
          }
        }
      } catch (err) {
        console.error('Failed to poll stream status:', err);
      }
    };
    
    const interval = setInterval(pollStreamStatus, 10000);
    return () => clearInterval(interval);
  }, [credentials?.streamKey, streamStartTime]);

  useEffect(() => {
    if (!streamStartTime) return;
    
    const updateUptime = () => {
      const now = new Date();
      const diff = now.getTime() - streamStartTime.getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      setStreamStats(prev => ({
        ...prev,
        uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }));
    };
    
    const interval = setInterval(updateUptime, 1000);
    return () => clearInterval(interval);
  }, [streamStartTime]);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Idle';
    }
  };

  if (loading || isLoadingCreds)
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading streaming dashboard...</p>
        </div>
      </div>
    );

  if (!user || (!isCreator && !isAdmin)) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="pt-32 pb-16 px-4 max-w-6xl mx-auto space-y-8">
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative">
          <video 
            ref={videoRef} 
            controls 
            autoPlay 
            muted 
            playsInline
            className="w-full h-full object-cover" 
            poster="/api/placeholder/1280/720"
          />
          {!isLive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-gray-300 mb-2 text-lg">Stream Preview</div>
                <div className="text-sm text-gray-400">Start streaming in OBS to see live preview</div>
                <div className={`text-sm mt-2 ${getConnectionStatusColor()}`}>
                  Status: {getConnectionStatusText()}
                </div>
              </div>
            </div>
          )}
        </div>

        {credentials && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="font-medium text-lg">
                  {isLive ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Key className="w-6 h-6" /> Stream Credentials
          </h2>
          <div>
            <label className="block text-gray-300 mb-2 font-medium">RTMP Server URL</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-800/50 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto border border-gray-700/50">
                {credentials?.streamUrl || "Loading..."}
              </div>
              <button 
                onClick={() => credentials && handleCopy(credentials.streamUrl, "streamUrl")} 
                className="px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-colors border border-emerald-500/30"
                disabled={!credentials}
              >
                {copiedStates.streamUrl ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-gray-300 mb-2 font-medium">Stream Key</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-800/50 px-4 py-3 rounded-lg font-mono text-sm border border-gray-700/50">
                {credentials?.streamKey ? 
                  (showStreamKey ? credentials.streamKey : "••••••••••••••••••••••••••••••••") 
                  : "Loading..."
                }
              </div>
              <button 
                onClick={toggleStreamKeyVisibility} 
                className="px-4 py-3 bg-gray-600/30 hover:bg-gray-600/50 rounded-lg transition-colors border border-gray-600/30"
                disabled={!credentials}
              >
                {showStreamKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => credentials && handleCopy(credentials.streamKey, "streamKey")} 
                className="px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-colors border border-emerald-500/30"
                disabled={!credentials}
              >
                {copiedStates.streamKey ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              onClick={handleRegenerateKey} 
              disabled={isRegenerating || isLive} 
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
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
      </main>
      <Footer />
    </div>
  );
};

export default GoLivePage;