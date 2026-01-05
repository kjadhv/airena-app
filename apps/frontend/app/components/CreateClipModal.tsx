"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Download } from "lucide-react";

interface CreateClipModalProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string;
}

const CreateClipModal: React.FC<CreateClipModalProps> = ({
  open,
  onClose,
  videoUrl,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(15);
  const [isRecording, setIsRecording] = useState(false);


  /* ---------- Format time mm:ss ---------- */
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  /* ---------- Load video duration ---------- */
  useEffect(() => {
  if (!open || !videoRef.current) return;

  const v = videoRef.current;

  const onLoaded = () => {
    const d = Math.floor(v.duration || 0);
    if (d > 0) {
      setDuration(d);
      setEnd(Math.min(15, d));
    }
  };

  v.addEventListener("loadedmetadata", onLoaded);
  return () => v.removeEventListener("loadedmetadata", onLoaded);
}, [open]);

  if (!open) return null;

  /* ---------- Download clip (FFmpeg backend) ---------- */
  const handleDownload = async () => {
    if (end <= start) {
      alert("End time must be greater than start time");
      return;
    }

    try {
      setIsRecording(true);

      const res = await fetch("/api/clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          start,
          end,
        }),
      });

      if (!res.ok) {
        throw new Error("Clip failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `clip_${formatTime(start)}-${formatTime(end)}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download clip");
    } finally {
      setIsRecording(false);
    }
  };

  /* ---------- Sync seek ---------- */
  const handleSeek = (value: number) => {
    setStart(value);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-gray-900 w-full max-w-xl rounded-xl border border-gray-800">

        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-800">
          <h2 className="text-white font-semibold">Create clip</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Video */}
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full max-h-64 bg-black"
        />

        {/* Timeline */}
        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-400">
            Start: {formatTime(start)} &nbsp; | &nbsp;
            End: {formatTime(end)} &nbsp; | &nbsp;
            Duration: {formatTime(end - start)}
          </div>

          {/* Start slider */}
          <input
  type="range"
  min={0}
  max={duration || 1}
  value={start}
  disabled={duration === 0}
  onChange={(e) => handleSeek(Number(e.target.value))}
  className="w-full"
/>

<input
  type="range"
  min={start + 1}
  max={duration || 1}
  value={end}
  disabled={duration === 0}
  onChange={(e) => setEnd(Number(e.target.value))}
  className="w-full"
/>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 py-3 border-t border-gray-800">
          <button
            onClick={handleDownload}
            disabled={isRecording}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isRecording ? "Downloading..." : "Download clip"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateClipModal;
