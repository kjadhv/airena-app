"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, Timestamp, where } from "firebase/firestore";
import HeroSection from "./components/HeroSection";
import FoundersClubSection from "./components/FoundersClubSection";
// import BigTournamentSection from "./components/BigTournamentSection";
import Footer from "./components/Footer";
import EventCarouselSection from "./components/EventCarouselSection";
import TrendingCategoriesSection from "./components/TrendingCategoriesSection";
import { db } from "./firebase/config";
import FeaturedVideoSection from "./components/FeaturedVideoSection";
export const dynamic = 'force-dynamic';
interface Content {
  id: string;
  type: "vod";
  title: string;
  description: string;
  category: "games" | "sports";
  createdAt: Date;
  authorName: string;
  authorPhotoURL: string | null;
  views: number;
  videoUrl: string;
  thumbnailUrl: string;
  tags: string[];
  duration: number;
}

export default function HomePage() {
  const [allContent, setAllContent] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const trendingVideos = useMemo(() => {
    return allContent.map((item) => ({
      id: item.id,
      category: item.category,
      tags: item.tags || [],
      views: item.views || 0,
    }));
  }, [allContent]);

  useEffect(() => {
    const fetchAllContent = async () => {
      setIsLoading(true);
      try {
        const videosQuery = query(collection(db, "videos"), where("visibility", "==", "public"));
        const videosSnapshot = await getDocs(videosQuery);
        const fetchedVideos = videosSnapshot.docs.map((doc) => {
          const data = doc.data();
          const createdAtTimestamp = data.createdAt as Timestamp;
          return {
            id: doc.id,
            type: "vod",
            title: data.title || "Untitled Video",
            description: data.description || "",
            category: data.category || "games",
            createdAt: createdAtTimestamp ? createdAtTimestamp.toDate() : new Date(),
            authorName: data.authorName || "Unknown",
            authorPhotoURL: data.authorPhotoURL || null,
            views: data.views || 0,
            videoUrl: data.videoUrl || "",
            thumbnailUrl: data.thumbnailUrl || "",
            tags: data.tags || [],
            duration: data.duration || 0,
          } as Content;
        });
        setAllContent(fetchedVideos);
      } catch (error) {
        console.error("Failed to fetch content:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllContent();
  }, []);

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
          <div className="relative left-1/2 aspect-[1155/687] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-emerald-600 to-emerald-400 opacity-20 sm:left-[calc(50%-15rem)] sm:w-[72.1875rem]"></div>
        </div>

        {/* === Main Content === */}
        <main className="w-full flex flex-col gap-12 lg:ml-20">
          <HeroSection />
          
          {/* === Event Carousel Banner === */}
          <EventCarouselSection />

          {/* === Trending Categories Section === */}
          <TrendingCategoriesSection 
            videos={trendingVideos}
            isLoading={isLoading}
          />

          {/* <BigTournamentSection /> */}
          <FeaturedVideoSection />
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