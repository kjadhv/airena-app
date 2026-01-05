"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import ShareButtons from "./ShareButtons";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  videoId: string;
  title?: string;
  startAt?: number;
}

export default function ShareModal({
  open,
  onClose,
  videoId,
  title,
  startAt = 0,
}: ShareModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
useEffect(() => {
  const t = startAt ? `?t=${Math.floor(startAt)}` : "";
  setUrl(`${window.location.origin}/video/${videoId}${t}`);
}, [videoId, startAt]);

 /* ---------------------------------------------------
     Close on ESC key
  --------------------------------------------------- */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  /* ---------------------------------------------------
     Close on outside click
  --------------------------------------------------- */
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () =>
      document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  if (!open) return null;

  const embedCode = url
  ? `<iframe width="560" height="315" src="${url.replace(
      "/video/",
      "/embed/"
    )}" frameborder="0" allowfullscreen></iframe>`
  : "";
  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div
        ref={modalRef}
        className="bg-[#181818] w-full max-w-md rounded-xl p-5 text-white"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Share</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {/* SHARE BUTTONS */}
        <ShareButtons
          url={url}
          title={title}
          onCopy={copyLink}
          onEmbed={() => setShowEmbed(!showEmbed)}
        />

        {/* LINK PREVIEW */}
        <div className="mt-4 bg-black rounded-lg px-3 py-2 text-sm break-all">
          {url}
          {copied && (
            <span className="text-green-400 ml-2">Copied</span>
          )}
        </div>

        {/* EMBED */}
        {showEmbed && (
          <textarea
            readOnly
            className="mt-3 w-full bg-black text-xs p-2 rounded"
            rows={3}
            value={embedCode}
          />
        )}
      </div>
    </div>
  );
}
