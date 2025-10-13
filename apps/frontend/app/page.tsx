"use client";

import React, { useEffect } from "react";
import HeroSection from "./components/HeroSection";
import FeaturedVideoSection from "./components/FeaturedVideoSection";
import BigTournamentSection from "./components/BigTournamentSection";
import FoundersClubSection from "./components/FoundersClubSection";
import Footer from "./components/Footer";

export default function HomePage() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      {/* === Dynamic Mouse Light Effect === */}
      <style jsx global>{`
        .mouse-gradient-background::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
            400px at var(--mouse-x) var(--mouse-y),
            rgba(29, 78, 216, 0.15),
            transparent 80%
          );
          z-index: -10;
          pointer-events: none;
        }
      `}</style>

      {/* === Page Wrapper === */}
      <div className="relative isolate overflow-x-hidden bg-black text-white font-sans antialiased mouse-gradient-background">
        {/* === Top Gradient Accent === */}
        <div
          className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl"
          aria-hidden="true"
        >
          <div className="relative left-1/2 aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-emerald-600 to-emerald-400 opacity-20 sm:left-[calc(50%-15rem)] sm:w-[72.1875rem]"></div>
        </div>

        {/* === Main Content === */}
        <main className="w-full flex flex-col gap-16">
          <HeroSection />
          <FeaturedVideoSection />
          <BigTournamentSection />
          <FoundersClubSection />
        </main>

        {/* === Footer === */}
        <Footer />

        {/* === Bottom Gradient Accent === */}
        <div
          className="absolute inset-x-0 top-[60%] -z-10 transform-gpu overflow-hidden blur-3xl"
          aria-hidden="true"
        >
          <div className="relative left-1/2 aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-emerald-600 to-emerald-400 opacity-10 sm:left-[calc(50%+20rem)] sm:w-[72.1875rem]"></div>
        </div>
      </div>
    </>
  );
}