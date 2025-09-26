"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { Key, Copy, Check, Eye, XCircle, RefreshCw, ExternalLink, AlertTriangle, EyeOff } from "lucide-react";
import Link from "next/link";

interface StreamCredentials {
  streamKey: string;
  streamUrl: string;
  isStreaming: boolean;
  hlsUrl?: string;
}

interface StreamStats {
  viewers: number;
  uptime: string;
  bitrate: number;
  fps: number;
}

const GoLivePage = () => {
  const backendUrl = process.env.NESTJS_BACKEND_URL || "http://localhost:8000";
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
      const idToken = await user.getIdToken();
      const res = await fetch(`${backendUrl}/stream/credentials`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        throw new Error(`Failed to fetch credentials: ${res.status}`);
      }

      const data: StreamCredentials = await res.json();
      setCredentials(data);
      setIsLive(data.isStreaming || false);
      if (data.isStreaming) setStreamStartTime(new Date());
    } catch (err: unknown) {
      console.error("Credential fetch error:", err);
      if (err instanceof Error) {
        setError(err.message || "Failed to fetch credentials. Make sure the backend is running on port 8000.");
      } else {
        setError("Failed to fetch credentials. Make sure the backend is running on port 8000.");
      }
    } finally {
      setIsLoadingCreds(false);
    }
  }, [user, backendUrl]);

  // Fetch credentials
  useEffect(() => {
    if (!loading && user && (isCreator || isAdmin)) fetchCredentials();
  }, [user, loading, isCreator, isAdmin, fetchCredentials]);

  const handleRegenerateKey = async () => {
    if (!window.confirm("Regenerating your key will disconnect active streams. Continue?")) return;
    if (!user) return;
    setIsRegenerating(true);
    setError("");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`${backendUrl}/stream/regenerate-key`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Regenerate API Error:', res.status, errorText);
        throw new Error(`Failed to regenerate key: ${res.status}`);
      }
      
      const data = await res.json();
      setCredentials(() => ({
        streamKey: data.streamKey,
        streamUrl: data.streamUrl,
        hlsUrl: data.hlsUrl,
        isStreaming: false,
      }));
      setIsLive(false);
      setStreamStartTime(null);
      
      // Clean up existing HLS instance and reload with new key
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
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedStates((prev) => ({ ...prev, [type]: true }));
      setTimeout(() => setCopiedStates((prev) => ({ ...prev, [type]: false })), 2500);
    });
  }, []);

  const toggleStreamKeyVisibility = () => setShowStreamKey(!showStreamKey);

  const watchUrl = credentials
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/watch/${credentials.streamKey}`
    : "";

  // Setup HLS player with comprehensive error handling
  useEffect(() => {
    if (!credentials?.streamKey || !videoRef.current) return;
    
    // Clean up existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Use hlsUrl from backend if available, otherwise construct it properly
    const hlsUrl = credentials.hlsUrl || `http://localhost:8080/live/${credentials.streamKey}/index.m3u8`;
    
    console.log('Setting up HLS stream:', hlsUrl);
    setConnectionStatus('connecting');
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        liveDurationInfinity: true,
        debug: process.env.NODE_ENV === 'development',
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', event, data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error - attempting to recover');
              setConnectionStatus('error');
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
              }, 1000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error - attempting to recover');
              setConnectionStatus('error');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error - destroying HLS');
              setConnectionStatus('error');
              setError('Stream playback error. The stream may not be active.');
              hls.destroy();
              break;
          }
        }
      });
      
      hls.on(Hls.Events.MANIFEST_LOADED, () => {
        console.log('HLS manifest loaded successfully');
        setConnectionStatus('connected');
        setError(''); // Clear any previous errors
      });
      
      hls.on(Hls.Events.LEVEL_LOADED, () => {
        setConnectionStatus('connected');
      });
      
      hls.on(Hls.Events.FRAG_LOADED, () => {
        setConnectionStatus('connected');
      });
      
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);
      hlsRef.current = hls;
      
      return () => {
        hls.destroy();
      };
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS support
      videoRef.current.src = hlsUrl;
      videoRef.current.addEventListener('loadstart', () => setConnectionStatus('connecting'));
      videoRef.current.addEventListener('loadeddata', () => setConnectionStatus('connected'));
      videoRef.current.addEventListener('error', () => setConnectionStatus('error'));
    } else {
      console.error('HLS not supported on this browser');
      setError('HLS playback not supported on this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
      setConnectionStatus('error');
    }
  }, [credentials?.streamKey, credentials?.hlsUrl]);

  // Clean up HLS on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // Poll for stream status updates
  useEffect(() => {
    if (!credentials?.streamKey) return;
    
    const pollStreamStatus = async () => {
      try {
        const res = await fetch(`${backendUrl}/stream/status/${credentials.streamKey}`);
        if (res.ok) {
          const status = await res.json();
          setIsLive(status.isLive);
          
          if (status.isLive && !streamStartTime) {
            setStreamStartTime(new Date());
          } else if (!status.isLive && streamStartTime) {
            setStreamStartTime(null);
          }
          
          // Update stats if available
          if (status.metrics) {
            setStreamStats(prev => ({
              ...prev,
              bitrate: status.metrics.bitrate || 0,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to poll stream status:', err);
      }
    };
    
    // Initial poll
    pollStreamStatus();
    
    // Then poll every 5 seconds
    const interval = setInterval(pollStreamStatus, 5000);
    return () => clearInterval(interval);
  }, [credentials?.streamKey, streamStartTime, backendUrl]);

  // Update uptime
  useEffect(() => {
    if (!streamStartTime) return;
    
    const updateUptime = () => {
      const now = new Date();
      const diff = now.getTime() - streamStartTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setStreamStats(prev => ({
        ...prev,
        uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }));
    };
    
    updateUptime();
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
        {/* Video Player */}
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
          {isLive && connectionStatus === 'connecting' && (
            <div className="absolute top-4 right-4 bg-yellow-500/20 px-3 py-1 rounded text-yellow-400 text-sm">
              Loading stream...
            </div>
          )}
        </div>

        {/* Stream Status Card */}
        {credentials && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="font-medium text-lg">
                  {isLive ? 'LIVE' : 'OFFLINE'}
                </span>
                {isLive && (
                  <span className="text-red-400 font-bold text-sm">
                    ON AIR
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-400">
                Key: {credentials.streamKey.slice(0, 8)}...
              </div>
            </div>
            
            {isLive && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{streamStats.viewers}</div>
                  <div className="text-sm text-gray-400">Viewers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{streamStats.uptime}</div>
                  <div className="text-sm text-gray-400">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{streamStats.bitrate}</div>
                  <div className="text-sm text-gray-400">Kbps</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{streamStats.fps}</div>
                  <div className="text-sm text-gray-400">FPS</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stream Credentials */}
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
            <div className="mt-2 text-xs text-gray-400">
              Use this as your RTMP server URL in OBS or other streaming software
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
            <div className="mt-2 text-xs text-gray-400">
              Keep this private! Anyone with this key can stream to your channel
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              onClick={handleRegenerateKey} 
              disabled={isRegenerating || isLive} 
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isRegenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Generate New Key
                </>
              )}
            </button>
            <div className="flex-1 px-6 py-3 bg-gray-700/50 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed border border-gray-600/30">
              <XCircle className="w-5 h-5 text-gray-400" /> 
              <span className="text-gray-400">End Stream</span>
            </div>
          </div>
        </div>

        {/* Live Banner */}
        {isLive && (
          <div className="bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/30 rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-bold text-red-400 text-lg">YOU ARE LIVE</span>
                </div>
                <span className="hidden md:inline text-gray-300 ml-4 text-sm">
                  Broadcasting to the world • {streamStats.viewers} watching
                </span>
              </div>
              <Link 
                href={watchUrl} 
                target="_blank" 
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 transition-colors font-medium"
              >
                <ExternalLink className="w-4 h-4" /> 
                View Stream
              </Link>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" /> 
            <div>
              <div className="font-medium text-red-400 mb-1">Error</div>
              <div className="text-sm text-red-300">{error}</div>
            </div>
          </div>
        )}

        {/* Instructions Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h3 className="text-xl font-bold mb-4">How to Start Streaming</h3>
          <div className="space-y-4 text-sm text-gray-300">
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
              <div>
                <div className="font-medium">Download OBS Studio</div>
                <div className="text-gray-400">Free streaming software: obsproject.com</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
              <div>
                <div className="font-medium">Configure Stream Settings</div>
                <div className="text-gray-400">Go to Settings → Stream, select &quot;Custom&quot;, and paste your RTMP URL and Stream Key</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
              <div>
                <div className="font-medium">Start Streaming</div>
                <div className="text-gray-400">Click &quot;Start Streaming&quot; in OBS and watch your live preview above</div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && credentials && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-sm">
            <div className="font-bold mb-2 text-yellow-400">Debug Information</div>
            <div className="space-y-1 font-mono text-xs">
              <div>RTMP URL: {credentials.streamUrl}</div>
              <div>HLS URL: {credentials.hlsUrl || `http://localhost:8080/live/${credentials.streamKey}/index.m3u8`}</div>
              <div>Watch URL: {watchUrl}</div>
              <div>Stream Status: {isLive ? 'LIVE' : 'OFFLINE'}</div>
              <div>Connection: {connectionStatus}</div>
              <div>Backend: http://localhost:8000</div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default GoLivePage;