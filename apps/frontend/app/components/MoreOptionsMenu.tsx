// app/components/MoreOptionsMenu.tsx
"use client";

import React, { useRef, useEffect } from "react";
import { Clock, Scissors, Flag } from "lucide-react";

interface MoreOptionsMenuProps {
  open: boolean;
  onClose: () => void;
  onWatchLater: () => void;
  onClip: () => void;
  isInWatchLater: boolean;
  isSignedIn: boolean;
}

const MoreOptionsMenu: React.FC<MoreOptionsMenuProps> = ({
  open,
  onClose,
  onWatchLater,
  onClip,
  isInWatchLater,
  isSignedIn,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 overflow-hidden"
    >
      {/* Watch Later */}
      <button
        onClick={onWatchLater}
        disabled={!isSignedIn}
        className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        title={!isSignedIn ? "Sign in to save to watch later" : ""}
      >
        <Clock className="w-5 h-5 text-gray-300" />
        <div className="flex-1">
          <div className="font-medium text-white">
            {isInWatchLater ? "Remove from Watch Later" : "Save to Watch Later"}
          </div>
        </div>
      </button>

      {/* Clip */}
      {/* <button
        onClick={onClip}
        disabled={!isSignedIn}
        className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        title={!isSignedIn ? "Sign in to create clips" : ""}
      >
        <Scissors className="w-5 h-5 text-gray-300" />
        <div className="flex-1">
          <div className="font-medium text-white">Clip</div>
        </div>
      </button>

      {/* Divider */}
      {/* <div className="border-t border-gray-700" /> */}

      {/* Report */}
      {/* <button
        onClick={() => {
          alert("Report feature coming soon!");
          onClose();
        }}
        className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3"
      >
        <Flag className="w-5 h-5 text-gray-300" />
        <div className="flex-1">
          <div className="font-medium text-white">Report</div>
        </div>
      </button>  */}
    </div>
  );
};

export default MoreOptionsMenu;