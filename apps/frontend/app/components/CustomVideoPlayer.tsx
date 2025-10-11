"use client";
import React, { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface AirenaVideoPlayerProps {
  videoUrl: string;
  poster?: string;
}

const AirenaVideoPlayer: React.FC<AirenaVideoPlayerProps> = ({ videoUrl, poster }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showCenterPause, setShowCenterPause] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fade out controls
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 2000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, []);

  // Fullscreen logic
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
    handleUserActivity();
  };

  // Play/pause logic
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setShowCenterPause(true);
      setTimeout(() => setShowCenterPause(false), 1000);
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
    handleUserActivity();
  };

  // Keyboard shortcuts (e.g., Space = play/pause, arrows = skip)
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        skip(-10);
      }
      if (e.code === "ArrowRight") {
        e.preventDefault();
        skip(10);
      }
      if (e.code === "KeyM") {
        e.preventDefault();
        toggleMute();
      }
      if (e.code === "KeyF") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
    // eslint-disable-next-line
  }, [isPlaying, isMuted, currentTime, duration, isFullscreen]);

  // Progress/time logic
  const handleProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const value = parseFloat(e.target.value);
    videoRef.current.currentTime = value;
    setCurrentTime(value);
    handleUserActivity();
  };
  const skip = (howMuch: number) => {
    if (!videoRef.current) return;
    const seekTo = Math.max(0, Math.min((videoRef.current.currentTime || 0) + howMuch, duration));
    videoRef.current.currentTime = seekTo;
    setCurrentTime(seekTo);
    handleUserActivity();
  };

  // Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume === 0) {
        videoRef.current.muted = true;
        setIsMuted(true);
      } else {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
    handleUserActivity();
  };
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
    handleUserActivity();
  };

  // Video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  // Time helpers
  const formatTime = (t: number) => {
    if (!t || isNaN(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="relative w-full h-full bg-black rounded-2xl overflow-hidden group"
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        src={videoUrl}
        poster={poster}
        onClick={togglePlay}
      />

      {showCenterPause && (
        <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-20 pointer-events-none">
          <Pause size={80} className="text-white opacity-80" />
        </div>
      )}

      {/* Control Bar (All icons shown) */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex flex-col gap-2 p-4 
          bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-500 z-10
          ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={e => e.stopPropagation()}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={handleUserActivity}
      >
        {/* Progress + Time bar */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white opacity-80 w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            step={0.01}
            max={duration}
            value={currentTime}
            onChange={handleProgress}
            className="flex-1 accent-emerald-500 slider-thumb:rounded-full slider-thumb:w-2 slider-thumb:h-2"
          />
          <span className="text-xs text-white opacity-80 w-10">
            {formatTime(duration)}
          </span>
        </div>
        {/* Icon bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={togglePlay}
              className="cursor-pointer text-white hover:text-emerald-400 p-2 rounded-full transition"
              tabIndex={0}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button
              className="cursor-pointer text-white hover:text-emerald-400 p-2 rounded-full transition"
              tabIndex={0}
              onClick={() => skip(-10)}
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw size={22} />
            </button>
            <button
              className="cursor-pointer text-white hover:text-emerald-400 p-2 rounded-full transition"
              tabIndex={0}
              onClick={() => skip(10)}
              aria-label="Forward 10 seconds"
            >
              <RotateCw size={22} />
            </button>
            {/* Volume Control */}
            <button
              onClick={toggleMute}
              className="cursor-pointer text-white hover:text-emerald-400 p-2 rounded-full transition"
              tabIndex={0}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 accent-emerald-500 cursor-pointer"
            />
          </div>
          <div>
            <button
              className="mx-2 cursor-pointer text-white hover:text-emerald-400 p-2 rounded-full transition"
              tabIndex={0}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirenaVideoPlayer;