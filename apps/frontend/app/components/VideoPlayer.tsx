'use client';

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import 'video.js/dist/video-js.css'; // Default Video.js styles

interface VideoPlayerProps {
  src: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let hls: Hls | null = null;
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(videoElement);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoElement.play().catch(() => {
          console.log('Autoplay was prevented by the browser.');
        });
      });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari and other native HLS players
      videoElement.src = src;
      videoElement.addEventListener('loadedmetadata', () => {
        videoElement.play().catch(() => {
          console.log('Autoplay was prevented by the browser.');
        });
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  return (
    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        controls
        playsInline // Important for iOS
        className="w-full h-full"
      />
    </div>
  );
};

export default VideoPlayer;
