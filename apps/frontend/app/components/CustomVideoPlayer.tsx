"use client";
import React, { useRef, useState, useEffect } from "react";
import Hls from "hls.js";
import type { Level } from "hls.js";
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize2, Minimize2,
} from "lucide-react";

interface AirenaVideoPlayerProps {
  videoUrl: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  isLive?: boolean; // New prop to explicitly mark live streams
}

const AirenaVideoPlayer: React.FC<AirenaVideoPlayerProps> = ({
  videoUrl,
  poster,
  autoPlay = false,
  muted = false,
  isLive = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = AUTO
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [showControls, setShowControls] = useState(true);
  const [showCenterPause, setShowCenterPause] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHlsStream, setIsHlsStream] = useState(false);
  
  // VOD Quality options for non-HLS videos
  const [vodQualities, setVodQualities] = useState<string[]>([]);
  const [currentVodQuality, setCurrentVodQuality] = useState<string>("");

  // Detect if it's a live stream based on duration or isLive prop
  const isLiveStream = isLive || duration === Infinity;

  // HLS Setup (for live streams or HLS VOD)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsSource = videoUrl && videoUrl.endsWith(".m3u8");
    
    // Use HLS for live streams OR if the source is .m3u8
    if ((isLive || isHlsSource) && Hls.isSupported()) {
      console.log("Loading HLS stream:", videoUrl);
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive, // Enable low latency for live streams
      });
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      setIsHlsStream(true);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS Levels found:", hls.levels);
        setLevels(hls.levels);
        setCurrentLevel(-1); // Auto quality
        if (autoPlay) {
          video.muted = muted;
          video.play().catch(e => console.error("Autoplay failed:", e));
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        console.log("Level switched to:", data.level);
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error("HLS Error:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("Network error, trying to recover...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Media error, trying to recover...");
              hls.recoverMediaError();
              break;
            default:
              console.log("Fatal error, destroying HLS instance");
              hls.destroy();
              break;
          }
        }
      });
    } 
    // For Safari which supports HLS natively
    else if (isHlsSource && video.canPlayType("application/vnd.apple.mpegurl")) {
      console.log("Using native HLS support (Safari)");
      video.src = videoUrl;
      setIsHlsStream(true);
    } 
    // For regular video files (MP4, WebM, etc.)
    else {
      console.log("Loading regular video:", videoUrl);
      video.src = videoUrl;
      setIsHlsStream(false);
      
      // Parse quality from filename or URL if available
      // Example: video_720p.mp4, video_1080p.mp4
      const qualityMatch = videoUrl.match(/(\d{3,4})p/);
      if (qualityMatch) {
        setCurrentVodQuality(qualityMatch[1] + "p");
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl, autoPlay, muted, isLive]);

  // Handle HLS quality change
  const handleQualityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(event.target.value, 10);
    setCurrentLevel(val);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = val;
    }
    handleUserActivity();
  };

  // Handle VOD quality change (if you have multiple quality URLs)
  const handleVodQualityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const quality = event.target.value;
    setCurrentVodQuality(quality);
    // You would need to emit an event or callback here to switch the video URL
    // For now, this is just a placeholder
    console.log("VOD quality changed to:", quality);
    handleUserActivity();
  };

  // Fade out controls
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (!isLiveStream || isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    handleUserActivity();
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, []);

  // Fullscreen logic
  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error("Fullscreen error:", err);
      });
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
      if (document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement) return;

      if (["Space", "ArrowLeft", "ArrowRight", "KeyM", "KeyF"].includes(e.code)) {
        e.preventDefault();
      }
      switch(e.code) {
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

  // Helper
  const formatTime = (t: number) => {
    if (!t || !isFinite(t)) return "0:00";
    const hours = Math.floor(t / 3600);
    const minutes = Math.floor((t % 3600) / 60);
    const seconds = Math.floor(t % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

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

      {/* Quality Selector - HLS Streams */}
      {isHlsStream && levels.length > 0 && (
        <div className="absolute top-4 right-4 z-30 flex items-center bg-gray-900/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg">
          <label htmlFor="quality" className="text-white text-sm mr-2 font-medium">Quality</label>
          <select
            id="quality"
            value={currentLevel}
            onChange={handleQualityChange}
            className="bg-black/50 text-white text-sm px-3 py-1 rounded border border-gray-600 hover:border-emerald-500 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value={-1}>Auto</option>
            {levels.map((level, idx) => (
              <option key={idx} value={idx}>
                {level.height ? `${level.height}p` : `Level ${idx + 1}`}
                {level.bitrate ? ` (${Math.round(level.bitrate / 1000)}kbps)` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Quality Selector - VOD (for future implementation with multiple quality URLs) */}
      {!isHlsStream && vodQualities.length > 0 && (
        <div className="absolute top-4 right-4 z-30 flex items-center bg-gray-900/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg">
          <label htmlFor="vod-quality" className="text-white text-sm mr-2 font-medium">Quality</label>
          <select
            id="vod-quality"
            value={currentVodQuality}
            onChange={handleVodQualityChange}
            className="bg-black/50 text-white text-sm px-3 py-1 rounded border border-gray-600 hover:border-emerald-500 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {vodQualities.map((quality) => (
              <option key={quality} value={quality}>
                {quality}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex flex-col gap-2 p-4 
          bg-gradient-to-t from-black/80 via-black/50 to-transparent transition-opacity duration-500 z-10
          ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* Progress Bar - Only for VOD */}
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

        {/* Control Buttons */}
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

            {/* Skip buttons - Only for VOD */}
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

            {/* Volume Control */}
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

            {/* Live Indicator */}
            {isLiveStream && (
              <div className="ml-4 flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-md">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                LIVE
              </div>
            )}
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1">
            {/* Stream Type Indicator */}
            {isHlsStream && !isLiveStream && (
              <div className="mr-2 px-2 py-1 bg-emerald-600/20 text-emerald-400 text-xs font-medium rounded border border-emerald-500/30">
                HLS
              </div>
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