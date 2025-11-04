"use client";
import React, { useRef, useState, useEffect } from "react";
import Hls from "hls.js";
import type { Level } from "hls.js";
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize2, Minimize2, Settings,
} from "lucide-react";

// Quality option for regular videos
interface VideoQuality {
  label: string; // e.g., "1080p", "720p", "480p", "360p"
  url: string;
}

interface AirenaVideoPlayerProps {
  videoUrl: string; // Primary video URL (used for HLS or single quality)
  videoQualities?: VideoQuality[]; // Optional: Multiple quality URLs for regular videos
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
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // VOD Quality for non-HLS videos
  const [currentVodQuality, setCurrentVodQuality] = useState<string>("");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>(videoUrl);

  // Detect if it's a live stream
  const isLiveStream = isLive || duration === Infinity;

  // Initialize video qualities
  useEffect(() => {
    if (videoQualities.length > 0) {
      // Find the highest quality as default
      const highestQuality = videoQualities[0];
      setCurrentVodQuality(highestQuality.label);
      setActiveVideoUrl(highestQuality.url);
    } else {
      setActiveVideoUrl(videoUrl);
    }
  }, [videoQualities, videoUrl]);

  // HLS Setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset error state when URL changes
    setHasError(false);
    setErrorMessage("");

    // Save current playback state
    const savedTime = video.currentTime;
    const wasPlaying = !video.paused;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsSource = activeVideoUrl && activeVideoUrl.endsWith(".m3u8");
    
    // Use HLS for .m3u8 files
    if (isHlsSource && Hls.isSupported()) {
      console.log("Loading HLS stream:", activeVideoUrl);
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
        startLevel: -1, // Auto quality
      });
      hlsRef.current = hls;
      hls.loadSource(activeVideoUrl);
      hls.attachMedia(video);
      setIsHlsStream(true);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS Levels found:", hls.levels);
        console.log("Number of levels:", hls.levels.length);
        hls.levels.forEach((level, idx) => {
          console.log(`Level ${idx}:`, {
            height: level.height,
            width: level.width,
            bitrate: level.bitrate,
            name: level.name,
            url: level.url
          });
        });
        setLevels(hls.levels);
        setCurrentLevel(-1);
        
        // Restore playback state
        if (!isLive && savedTime > 0) {
          video.currentTime = savedTime;
        }
        
        if (autoPlay || wasPlaying) {
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
              // Check if it's a 404 or other unrecoverable network error
              if (data.response?.code === 404) {
                console.error("Stream not found (404). Stopping playback.");
                setHasError(true);
                setErrorMessage("Stream not available");
                hls.destroy();
                return;
              }
              
              // For other network errors, try recovery once
              console.log("Network error, trying to recover...");
              hls.startLoad();
              
              // Set a timeout to give up if recovery doesn't work
              setTimeout(() => {
                if (video.paused && video.readyState < 2) {
                  setHasError(true);
                  setErrorMessage("Unable to load stream");
                  hls.destroy();
                }
              }, 5000);
              break;
              
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Media error, trying to recover...");
              hls.recoverMediaError();
              break;
              
            default:
              console.log("Fatal error, stopping playback");
              setHasError(true);
              setErrorMessage("Playback error occurred");
              hls.destroy();
              break;
          }
        }
      });
    } 
    // Safari native HLS support
    else if (isHlsSource && video.canPlayType("application/vnd.apple.mpegurl")) {
      console.log("Using native HLS support (Safari)");
      video.src = activeVideoUrl;
      setIsHlsStream(true);
      
      // Restore playback state
      if (!isLive && savedTime > 0) {
        video.currentTime = savedTime;
      }
      if (wasPlaying) {
        video.play().catch(e => console.error("Play failed:", e));
      }
    } 
    // Regular video files
    else {
      console.log("Loading regular video:", activeVideoUrl);
      video.src = activeVideoUrl;
      setIsHlsStream(false);
      
      // Restore playback state after metadata loads
      video.addEventListener('loadedmetadata', () => {
        if (!isLive && savedTime > 0) {
          video.currentTime = savedTime;
        }
        if (wasPlaying) {
          video.play().catch(e => console.error("Play failed:", e));
        }
      }, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeVideoUrl, autoPlay, muted, isLive]);

  // Handle HLS quality change
  const handleHlsQualityChange = (levelIndex: number) => {
    setCurrentLevel(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
    setShowQualityMenu(false);
    handleUserActivity();
  };

  // Handle VOD quality change
  const handleVodQualityChange = (quality: VideoQuality) => {
    const video = videoRef.current;
    if (!video) return;

    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;

    setCurrentVodQuality(quality.label);
    setActiveVideoUrl(quality.url);
    
    // Wait for new video to load, then restore state
    const handleLoadedMetadata = () => {
      video.currentTime = currentTime;
      if (wasPlaying) {
        video.play().catch(e => console.error("Play failed:", e));
      }
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    setShowQualityMenu(false);
    handleUserActivity();
  };

  // Fade out controls
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (!isLiveStream || isPlaying) {
        setShowControls(false);
        setShowQualityMenu(false);
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

  // Get current quality label
  const getCurrentQualityLabel = () => {
    if (isHlsStream) {
      if (currentLevel === -1) return "Auto";
      const level = levels[currentLevel];
      return level?.height ? `${level.height}` : `Level ${currentLevel + 1}`;
    } else if (videoQualities.length > 0) {
      return currentVodQuality.replace('p', '');
    }
    return null;
  };

  const hasQualityOptions = (isHlsStream && levels.length > 1 && levels.some(l => l.height > 0)) || videoQualities.length > 1;

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

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center px-6">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white text-xl font-semibold mb-2">{errorMessage}</h3>
            <p className="text-gray-400 text-sm">
              {errorMessage === "Stream not available" 
                ? "The stream you're trying to watch is currently offline or unavailable."
                : "There was a problem loading the video. Please try again later."}
            </p>
          </div>
        </div>
      )}

      {/* Quality Menu */}
      {hasQualityOptions && showQualityMenu && (
        <div className="absolute bottom-20 right-4 z-30 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-700 overflow-hidden min-w-[200px]">
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
                    {currentLevel === -1 && (
                      <span className="text-xs">✓</span>
                    )}
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
                      <div>
                        <div>{level.height ? `${level.height}` : `Level ${idx + 1}`}</div>
                        {level.bitrate && (
                          <div className="text-xs text-gray-400">
                            {Math.round(level.bitrate / 1000)} kbps
                          </div>
                        )}
                      </div>
                      {currentLevel === idx && (
                        <span className="text-xs">✓</span>
                      )}
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
                    {currentVodQuality === quality.label && (
                      <span className="text-xs">✓</span>
                    )}
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