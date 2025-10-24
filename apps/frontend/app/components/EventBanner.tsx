"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Play } from "lucide-react";

const DiwaliCupBanner = () => {
  const router = useRouter();

  const handleWatchLive = () => {
    // Replace with your actual live stream URL or route
    router.push("/live");
  };

  return (
    <section className="px-6 sm:px-10 lg:px-16 mb-12">
      <div className="relative group rounded-2xl overflow-hidden shadow-2xl max-w-7xl mx-auto">
        {/* Optimized Banner Image */}
        <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[500px]">
          <Image
            src="/FFL banner.png"
            alt="Friends Football League Ulhasnagar - Diwali Cup"
            fill
            className="object-contain object-center"
            priority
            quality={85}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 85vw"
          />
        </div>

        {/* Overlay Gradient for Better Button Visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Watch Live Button - Positioned at Bottom */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={handleWatchLive}
            className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-2xl backdrop-blur-sm"
          >
            <Play className="w-6 h-6 fill-current" />
            Watch Live
          </button>
        </div>

        {/* Animated Glow Effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-transparent to-emerald-500/20 animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default DiwaliCupBanner;