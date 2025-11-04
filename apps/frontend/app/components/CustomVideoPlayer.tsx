"use client";
import React, { useRef, useState, useEffect } from "react";
import Hls from "hls.js";
import type { Level } from "hls.js";
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize2, Minimize2, Settings,
} from "lucide-react";

interface VideoQuality {
  label: string;
  url: string;
}

interface AirenaVideoPlayerProps {
  videoUrl: string; // HLS master.m3u8 for ABR
  videoQualities?: VideoQuality[]; // VOD static fallback
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  isLive?: boolean;
}

const AirenaVideoPlayer: React.FC<AirenaVideoPlayerProps> = ({
  videoUrl,
  videoQualities = [],
  poster,
  autoPlay = false,
  muted = false,
  isLive = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [showControls, setShowControls] = useState(true);
  const [showCenterPause, setShowCenterPause] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // VOD fallback
  const [currentVodQuality, setCurrentVodQuality] = useState<string>("");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>(videoUrl);

  const isLiveStream = isLive || duration === Infinity;
  const isHlsStream = activeVideoUrl.endsWith(".m3u8");

  // Default active quality
  useEffect(() => {
    if (videoQualities.length > 0) {
      setCurrentVodQuality(videoQualities[0].label);
      setActiveVideoUrl(videoQualities[0].url);
    } else {
      setActiveVideoUrl(videoUrl);
    }
  }, [videoQualities, videoUrl]);

  // HLS + ABR Handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setHasError(false);
    setErrorMessage("");
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: isLiveStream });
      hlsRef.current = hls;
      hls.loadSource(activeVideoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(hls.levels);
        setCurrentLevel(-1);
        if (autoPlay) video.play().catch(() => {});
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => setCurrentLevel(data.level));

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setHasError(true);
          setErrorMessage("Playback error occurred");
          hls.destroy();
        }
      });
    } else if (isHlsStream && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeVideoUrl;
    } else {
      video.src = activeVideoUrl;
    }

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [activeVideoUrl, autoPlay, muted, isLiveStream, isHlsStream]);

  // Manual HLS quality switch
  const handleHlsQualityChange = (levelIndex: number) => {
    setCurrentLevel(levelIndex);
    if (hlsRef.current) hlsRef.current.currentLevel = levelIndex;
    setShowQualityMenu(false);
    handleUserActivity();
  };

  // Manual VOD quality switch
  const handleVodQualityChange = (quality: VideoQuality) => {
    setCurrentVodQuality(quality.label);
    setActiveVideoUrl(quality.url);
    setShowQualityMenu(false);
    handleUserActivity();
  };

  // Controls fade out
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
      setShowQualityMenu(false);
    }, 3000);
  };
  
  useEffect(() => {
    handleUserActivity();
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, []);

  // Fullscreen
  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    handleUserActivity();
  };

  // Play/Pause
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
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) return;
      if (["Space", "ArrowLeft", "ArrowRight", "KeyM", "KeyF"].includes(e.code)) e.preventDefault();
      switch (e.code) {
        case "Space": togglePlay(); break;
        case "ArrowLeft": if (!isLiveStream) skip(-10); break;
        case "ArrowRight": if (!isLiveStream) skip(10); break;
        case "KeyM": toggleMute(); break;
        case "KeyF": toggleFullscreen(); break;
      }
    };
    const playerElement = videoRef.current?.parentElement;
    playerElement?.addEventListener("keydown", handleKeydown);
    return () => playerElement?.removeEventListener("keydown", handleKeydown);
  }, [isPlaying, isMuted, currentTime, duration, isFullscreen, isLiveStream]);

  // Progress/time logic
  const handleProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const value = parseFloat(e.target.value);
    videoRef.current.currentTime = value;
    setCurrentTime(value);
    handleUserActivity();
  };

  const skip = (howMuch: number) => {
    if (!videoRef.current || duration === Infinity) return;
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

  // Track video metadata, fullscreen, etc.
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

  // UI helpers
  const formatTime = (t: number) => {
    if (!t || !isFinite(t)) return "0:00";
    const h = Math.floor(t/3600);
    const m = Math.floor((t%3600)/60);
    const s = Math.floor(t%60);
    return h ? `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}` : `${m}:${s.toString().padStart(2,"0")}`;
  };

  const getCurrentQualityLabel = () => {
    if (isHlsStream && levels.length) {
      if (currentLevel === -1) return "Auto";
      const level = levels[currentLevel];
      return level?.height ? `${level.height}p` : `Quality ${currentLevel+1}`;
    } else if (videoQualities.length > 0) {
      return currentVodQuality;
    }
    return null;
  };

  // Show quality menu if there are multiple variants
  const hasQualityOptions =
    (isHlsStream && levels.length > 1) || (videoQualities && videoQualities.length > 1);

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

      {/* Error message overlay */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center px-6 text-red-500 font-semibold">
            {errorMessage || "Playback error"}
          </div>
        </div>
      )}

      {/* Quality Selector Menu */}
      {hasQualityOptions && showQualityMenu && (
        <div className="absolute bottom-20 right-4 z-30 bg-gray-900/95 rounded-lg shadow-2xl border border-gray-700 overflow-hidden min-w-[180px]">
          <div className="px-4 py-2 border-b border-gray-700">
            <p className="text-white text-sm font-semibold">Quality</p>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {isHlsStream ? (
              <>
                <button
                  onClick={() => handleHlsQualityChange(-1)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    currentLevel === -1
                      ? "bg-emerald-600 text-white font-medium"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Auto</span>
                    {currentLevel === -1 && <span className="text-xs">✓</span>}
                  </div>
                </button>
                {levels.map((level, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleHlsQualityChange(idx)}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                      currentLevel === idx
                        ? "bg-emerald-600 text-white font-medium"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{level.height ? `${level.height}p` : `Quality ${idx+1}`}</span>
                      {currentLevel === idx && <span className="text-xs">✓</span>}
                    </div>
                  </button>
                ))}
              </>
            ) : (
              videoQualities.map((quality) => (
                <button
                  key={quality.label}
                  onClick={() => handleVodQualityChange(quality)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    currentVodQuality === quality.label
                      ? "bg-emerald-600 text-white font-medium"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{quality.label}</span>
                    {currentVodQuality === quality.label && <span className="text-xs">✓</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex flex-col gap-2 p-4 
          bg-gradient-to-t from-black/80 via-black/50 to-transparent transition-opacity duration-500 z-10
          ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {!isLiveStream && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/90 font-medium w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              step={0.01}
              max={duration}
              value={currentTime}
              onChange={handleProgress}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
              style={{
                background: `linear-gradient(to right, rgb(16 185 129) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%)`
              }}
            />
            <span className="text-xs text-white/90 font-medium w-12">
              {formatTime(duration)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 text-white hover:text-emerald-400 transition-colors rounded-lg hover:bg-white/10"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            {!isLiveStream && (
              <>
                <button
                  onClick={() => skip(-10)}
                  className="p-2 text-white hover:text-emerald-400 transition-colors rounded-lg hover:bg-white/10"
                  aria-label="Rewind 10 seconds"
                >
                  <RotateCcw size={20} />
                </button>
                <button
                  onClick={() => skip(10)}
                  className="p-2 text-white hover:text-emerald-400 transition-colors rounded-lg hover:bg-white/10"
                  aria-label="Forward 10 seconds"
                >
                  <RotateCw size={20} />
                </button>
              </>
            )}
            {/* Volume */}
            <div className="flex items-center ml-2">
              <button
                onClick={toggleMute}
                className="p-2 text-white hover:text-emerald-400 transition-colors rounded-lg hover:bg-white/10"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-emerald-500 ml-2"
              />
            </div>
            {isLiveStream && (
              <div className="ml-4 flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-md">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                LIVE
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Quality Button */}
            {hasQualityOptions && (
              <button
                onClick={() => {
                  setShowQualityMenu(!showQualityMenu);
                  handleUserActivity();
                }}
                className={`flex items-center gap-2 px-3 py-1.5 text-white transition-colors rounded-lg hover:bg-white/10 ${
                  showQualityMenu ? "bg-white/20" : ""
                }`}
                aria-label="Quality settings"
              >
                <Settings size={18} />
                <span className="text-xs font-medium">{getCurrentQualityLabel()}</span>
              </button>
            )}
            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white hover:text-emerald-400 transition-colors rounded-lg hover:bg-white/10"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirenaVideoPlayer;