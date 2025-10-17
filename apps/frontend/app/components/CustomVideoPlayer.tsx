"use client";
import React, { useRef, useState, useEffect } from "react"; // 👈 FIXED: Correctly imported React hooks
import Hls from "hls.js";
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize2, Minimize2,
} from "lucide-react";

interface AirenaVideoPlayerProps {
  videoUrl: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
}

const AirenaVideoPlayer: React.FC<AirenaVideoPlayerProps> = ({ 
  videoUrl, 
  poster,
  autoPlay = false,
  muted = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [showControls, setShowControls] = useState(true);
  const [showCenterPause, setShowCenterPause] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // HLS Playback Logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (videoUrl && videoUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) {
            video.muted = muted;
            video.play().catch(e => console.error("Autoplay was prevented.", e));
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoUrl;
      }
    } else {
      video.src = videoUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [videoUrl, autoPlay, muted]);

  // Fade out controls
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    handleUserActivity(); // Show controls on mount
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, []);

  // Fullscreen logic
  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => console.error(`Fullscreen request failed: ${err.message}`));
    } else {
      document.exitFullscreen();
    }
    handleUserActivity();
  };

  // Play/pause logic
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
      setShowCenterPause(true);
      setTimeout(() => setShowCenterPause(false), 1000);
    }
    handleUserActivity();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;
      
      // Prevent default browser actions for these keys
      if (["Space", "ArrowLeft", "ArrowRight", "KeyM", "KeyF"].includes(e.code)) {
        e.preventDefault();
      }

      switch(e.code) {
        case "Space": togglePlay(); break;
        case "ArrowLeft": skip(-10); break;
        case "ArrowRight": skip(10); break;
        case "KeyM": toggleMute(); break;
        case "KeyF": toggleFullscreen(); break;
      }
    };
    const playerElement = videoRef.current?.parentElement;
    playerElement?.addEventListener("keydown", handleKeydown);
    return () => playerElement?.removeEventListener("keydown", handleKeydown);
  }, [isPlaying, isMuted, currentTime, duration, isFullscreen]); // Re-bind if state changes

  // Progress/time logic
  const handleProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const value = parseFloat(e.target.value);
    videoRef.current.currentTime = value;
    setCurrentTime(value);
    handleUserActivity();
  };
  const skip = (howMuch: number) => {
    if (!videoRef.current || duration === Infinity) return; // Disable skip for live streams
    const newTime = videoRef.current.currentTime + howMuch;
    videoRef.current.currentTime = Math.max(0, Math.min(newTime, duration));
    handleUserActivity();
  };

  // Volume logic
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      const muted = newVolume === 0;
      videoRef.current.muted = muted;
      setIsMuted(muted);
    }
    handleUserActivity();
  };
  const toggleMute = () => {
    if (videoRef.current) {
      const currentlyMuted = !videoRef.current.muted;
      videoRef.current.muted = currentlyMuted;
      setIsMuted(currentlyMuted);
      if (!currentlyMuted && volume === 0) {
        const newVolume = 1;
        setVolume(newVolume);
        videoRef.current.volume = newVolume;
      }
    }
    handleUserActivity();
  };

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);
    video.addEventListener("durationchange", updateDuration);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
      video.removeEventListener("durationchange", updateDuration);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const formatTime = (t: number) => {
    if (!t || !isFinite(t)) return "0:00";
    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };
  
  const isLiveStream = duration === Infinity;

  return (
    <div
      className="relative w-full h-full bg-black rounded-xl overflow-hidden group"
      onMouseMove={handleUserActivity}
      onMouseLeave={handleUserActivity}
      onTouchStart={handleUserActivity}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        poster={poster}
        onClick={togglePlay}
        muted={muted}
        autoPlay={autoPlay}
        playsInline
      />

      {showCenterPause && (
        <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-20 pointer-events-none">
          <Pause size={80} className="text-white opacity-80" />
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 flex flex-col gap-2 p-4 
          bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-500 z-10
          ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {!isLiveStream && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white opacity-80 w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range" min={0} step={0.01} max={duration} value={currentTime}
              onChange={handleProgress}
              className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-xs text-white opacity-80 w-10">
              {formatTime(duration)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={togglePlay} className="p-2 text-white hover:text-emerald-400 transition" aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            {!isLiveStream && (
              <>
                <button onClick={() => skip(-10)} className="p-2 text-white hover:text-emerald-400 transition" aria-label="Rewind 10 seconds">
                  <RotateCcw size={22} />
                </button>
                <button onClick={() => skip(10)} className="p-2 text-white hover:text-emerald-400 transition" aria-label="Forward 10 seconds">
                  <RotateCw size={22} />
                </button>
              </>
            )}
            <div className="flex items-center">
              <button onClick={toggleMute} className="p-2 text-white hover:text-emerald-400 transition" aria-label={isMuted ? "Unmute" : "Mute"}>
                {isMuted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
              <input
                type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
          <div className="flex items-center">
            {isLiveStream && <div className="mr-4 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">LIVE</div>}
            <button onClick={toggleFullscreen} className="p-2 text-white hover:text-emerald-400 transition" aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirenaVideoPlayer;