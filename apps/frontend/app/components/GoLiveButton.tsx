// app/components/GoLiveButton.tsx
"use client";
import React from "react";
import Link from "next/link";
import { Radio } from "lucide-react";

export default function GoLiveButton() {
  return (
    <Link
      href="/creator/goLive"
      className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold rounded-full transition-all duration-300 shadow-lg hover:shadow-red-500/50 hover:scale-105"
    >
      {/* Pulsing dot animation */}
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
      </span>
      
      <Radio className="w-5 h-5" />
      <span>Go Live</span>
      
      {/* Glowing border effect */}
      <span className="absolute inset-0 rounded-full bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
    </Link>
  );
}