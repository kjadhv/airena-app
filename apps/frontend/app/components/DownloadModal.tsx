// app/components/DownloadModal.tsx
"use client";

import React, { useState } from "react";
import { X, Download, Check } from "lucide-react";

interface DownloadModalProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string;
  videoTitle: string;
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
}

interface QualityOption {
  label: string;
  resolution: string;
  size: string;
  url: string; // In real app, you'd have different URLs for different qualities
}

const DownloadModal: React.FC<DownloadModalProps> = ({
  open,
  onClose,
  videoUrl,
  videoTitle,
  onDownloadStart,
  onDownloadComplete,
}) => {
  const [selectedQuality, setSelectedQuality] = useState<string>("standard");
  const [rememberSettings, setRememberSettings] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // In a real app, you'd have different quality URLs
  // For now, we'll use the same URL but different labels
  const qualityOptions: QualityOption[] = [
    {
      label: "Standard (480p)",
      resolution: "480p",
      size: "109 MB",
      url: videoUrl,
    },
    {
      label: "Low (144p)",
      resolution: "144p",
      size: "32 MB",
      url: videoUrl,
    },
    {
      label: "Full HD (1080p)",
      resolution: "1080p",
      size: "352 MB",
      url: videoUrl,
    },
    {
      label: "High (720p)",
      resolution: "720p",
      size: "198 MB",
      url: videoUrl,
    },
  ];

  const handleDownload = async () => {
    const selectedOption = qualityOptions.find(
      (opt) => opt.resolution.toLowerCase().replace(/[^a-z0-9]/g, "") === selectedQuality
    );

    if (!selectedOption) return;

    setIsDownloading(true);
    if (onDownloadStart) onDownloadStart();

    try {
      // Fetch the video
      const response = await fetch(selectedOption.url);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      
      // Create download link
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      
      // Generate filename
      const sanitizedTitle = videoTitle
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "_")
        .substring(0, 100);
      link.download = `${sanitizedTitle}_${selectedOption.resolution}.mp4`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      // Save preference if remember is checked
      if (rememberSettings) {
        localStorage.setItem("preferredDownloadQuality", selectedQuality);
      }

      if (onDownloadComplete) onDownloadComplete();
      
      // Keep modal open to show downloading state
      setTimeout(() => {
        setIsDownloading(false);
      }, 2000);

    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download video. Please try again.");
      setIsDownloading(false);
    }
  };

  const handleCancel = () => {
    if (!isDownloading) {
      onClose();
    }
  };

  if (!open) return null;

  console.log("DownloadModal rendering - open:", open);
  console.log("videoUrl:", videoUrl);
  console.log("videoTitle:", videoTitle);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ zIndex: 9999, pointerEvents: 'auto' }}
      onClick={(e) => {
        console.log("Modal backdrop clicked");
        if (e.target === e.currentTarget && !isDownloading) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md mx-4 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">
            {isDownloading ? "Downloading" : "Download quality"}
          </h2>
          <button
            onClick={handleCancel}
            disabled={isDownloading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isDownloading ? (
            // Downloading State
            <div className="flex flex-col items-center justify-center py-8">
              <div className="flex items-center gap-3 mb-4">
                <Download className="w-6 h-6 text-emerald-500 animate-bounce" />
                <span className="text-white font-medium">Downloading...</span>
              </div>
              <div className="w-full max-w-xs bg-gray-800 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-emerald-500 animate-pulse" style={{ width: "70%" }} />
              </div>
            </div>
          ) : (
            // Quality Selection
            <>
              <div className="space-y-2 mb-4">
                {qualityOptions.map((option) => {
                  const optionId = option.resolution.toLowerCase().replace(/[^a-z0-9]/g, "");
                  const isSelected = selectedQuality === optionId;

                  return (
                    <button
                      key={option.resolution}
                      onClick={() => setSelectedQuality(optionId)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-gray-800 border-2 border-emerald-500"
                          : "bg-gray-800/50 border-2 border-transparent hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-gray-600"
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <span className="text-white font-medium">{option.label}</span>
                      </div>
                      <span className="text-gray-400 text-sm">{option.size}</span>
                    </button>
                  );
                })}
              </div>

              {/* Remember Settings */}
              <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg mb-4">
                <button
                  onClick={() => setRememberSettings(!rememberSettings)}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      rememberSettings
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-gray-600"
                    }`}
                  >
                    {rememberSettings && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-gray-300 text-sm">
                    Remember my settings for 30 days
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isDownloading && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-800 bg-gray-900/50">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full transition-colors"
            >
              Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadModal;