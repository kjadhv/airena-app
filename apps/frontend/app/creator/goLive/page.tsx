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
}

interface StreamStats {
  viewers: number;
  uptime: string;
  bitrate: number;
  fps: number;
}

const GoLivePage = () => {
  const { user, loading, isCreator, isAdmin } = useAuth();
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Auth redirect
  useEffect(() => {
    if (!loading && !user) router.push("/");
    else if (!loading && user && !isCreator && !isAdmin) router.push("/");
  }, [user, loading, isCreator, isAdmin, router]);

  // Fetch credentials
  useEffect(() => {
    if (!loading && user && (isCreator || isAdmin)) fetchCredentials();
  }, [user, loading, isCreator, isAdmin]);

  const fetchCredentials = async () => {
    setIsLoadingCreds(true);
    setError("");
    if (!user) {
      setError("Authentication required");
      setIsLoadingCreds(false);
      return;
    }
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/stream/credentials", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch credentials");
      const data: StreamCredentials = await res.json();
      setCredentials(data);
      setIsLive(data.isStreaming || false);
      if (data.isStreaming) setStreamStartTime(new Date());
    } catch (err: any) {
      console.error("Credential fetch error:", err);
      setError(err.message || "Failed to fetch credentials");
    } finally {
      setIsLoadingCreds(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!window.confirm("Regenerating your key will disconnect active streams. Continue?")) return;
    if (!user) return;
    setIsRegenerating(true);
    setError("");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/stream/regenerate-key", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error("Failed to regenerate key");
      const data = await res.json();
      setCredentials((prev) => ({
        streamKey: data.streamKey,
        streamUrl: prev?.streamUrl || data.streamUrl,
        isStreaming: false,
      }));
      setIsLive(false);
      setStreamStartTime(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to regenerate key");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopy = useCallback((text: string, type: keyof typeof copiedStates) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStates((prev) => ({ ...prev, [type]: true }));
      setTimeout(() => setCopiedStates((prev) => ({ ...prev, [type]: false })), 2500);
    });
  }, []);

  const toggleStreamKeyVisibility = () => setShowStreamKey(!showStreamKey);

  const watchUrl = credentials
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/watch/${credentials.streamKey}`
    : "";

  // Setup HLS player
  useEffect(() => {
    if (!credentials?.streamKey || !videoRef.current) return;
    const hlsUrl = `${credentials.streamUrl.replace("rtmp://", "http://").replace(":1935", ":8080")}/${credentials.streamKey}/index.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);
      return () => hls.destroy();
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = hlsUrl;
    }
  }, [credentials?.streamKey, credentials?.streamUrl]);

  if (loading || isLoadingCreds)
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>Loading streaming dashboard...</p>
      </div>
    );

  if (!user || (!isCreator && !isAdmin)) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="pt-32 pb-16 px-4 max-w-6xl mx-auto space-y-8">
        {/* Video Player */}
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
          <video ref={videoRef} controls autoPlay muted className="w-full h-full object-cover" />
        </div>

        {/* Stream Credentials */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Key /> Stream Credentials</h2>

          <div>
            <label className="text-gray-300">RTMP URL</label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1 bg-gray-800/50 px-3 py-2 font-mono">{credentials?.streamUrl}</div>
              <button onClick={() => credentials && handleCopy(credentials.streamUrl, "streamUrl")} className="p-2 bg-emerald-500/20 rounded">{copiedStates.streamUrl ? <Check /> : <Copy />}</button>
            </div>
          </div>

          <div>
            <label className="text-gray-300">Stream Key</label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1 bg-gray-800/50 px-3 py-2 font-mono">
                {credentials?.streamKey ? (showStreamKey ? credentials.streamKey : "••••••••••••••") : "Generating..."}
              </div>
              <button onClick={toggleStreamKeyVisibility} className="p-2 bg-gray-600/50 rounded">{showStreamKey ? <Eye /> : <EyeOff />}</button>
              <button onClick={() => credentials && handleCopy(credentials.streamKey, "streamKey")} className="p-2 bg-emerald-500/20 rounded">{copiedStates.streamKey ? <Check /> : <Copy />}</button>
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <button onClick={handleRegenerateKey} disabled={isRegenerating} className="flex-1 px-4 py-2 bg-blue-600 rounded">{isRegenerating ? "Regenerating..." : "Generate New Key"}</button>
            <div className="flex-1 px-4 py-2 bg-gray-700/50 rounded flex items-center justify-center gap-2 cursor-not-allowed"><XCircle /> Stop Stream</div>
          </div>
        </div>

        {/* Live Banner */}
        {isLive && (
          <div className="bg-red-600/20 border border-red-500/30 rounded-3xl p-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <span className="font-bold text-red-400">YOU ARE LIVE</span>
              <span className="hidden md:inline text-gray-300 ml-4">Viewers: {streamStats.viewers} | Uptime: {streamStats.uptime}</span>
            </div>
            <Link href={watchUrl} target="_blank" className="px-3 py-1 bg-red-600 rounded flex items-center gap-1"><ExternalLink /> View Stream</Link>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-2"><AlertTriangle /> {error}</div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default GoLivePage;
