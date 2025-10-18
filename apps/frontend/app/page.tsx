"use client";

import React, { useEffect, useState, useMemo } from "react";
import { PlayCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { collection, getDocs, query, Timestamp, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

import HeroSection from "./components/HeroSection";
import FoundersClubSection from "./components/FoundersClubSection";
import BigTournamentSection from "./components/BigTournamentSection";
import Footer from "./components/Footer";
import UserAvatar from "./components/UserAvatar";
import { db } from "./firebase/config";

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

const ContentRow = ({ title, content }: { title: string; content: Content[] }) => {
  const router = useRouter();
  const swiperId = `swiper-${title.replace(/\s+/g, "-")}`;
  if (!content.length) return null;

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-2xl font-semibold">{title}</h3>
        <div className="flex gap-2">
          <button
            className={`prev-${swiperId} p-2 rounded-full bg-white/10 hover:bg-white/20 transition`}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            className={`next-${swiperId} p-2 rounded-full bg-white/10 hover:bg-white/20 transition`}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      <Swiper
        modules={[Navigation]}
        navigation={{
          nextEl: `.next-${swiperId}`,
          prevEl: `.prev-${swiperId}`,
        }}
        spaceBetween={12}
        slidesPerView="auto"
        className="!pb-1"
      >
        {content.map((item) => (
          <SwiperSlide key={item.id} className="!w-[280px] sm:!w-[300px]">
            <VideoCard content={item} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

const VideoCard = ({ content }: { content: Content }) => {
  const router = useRouter();

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h > 0 ? h : null, h > 0 && m < 10 ? "0" + m : m, s < 10 ? "0" + s : s]
      .filter(Boolean)
      .join(":");
  };

  return (
    <button
      onClick={() => router.push(`/watch/player?v=${content.id}`)}
      className="block group text-left w-full"
    >
      <div className="flex flex-col">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800 border border-transparent group-hover:border-emerald-500/60 transition-all duration-300">
          <img
            src={content.thumbnailUrl || "/placeholder-image.png"}
            alt={content.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {content.duration > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 text-xs rounded font-semibold">
              {formatDuration(content.duration)}
            </div>
          )}
          <PlayCircle className="absolute inset-0 m-auto w-12 h-12 text-white/40 group-hover:text-white transition duration-300 opacity-0 group-hover:opacity-100" />
        </div>

        <div className="flex items-start gap-2.5 mt-2.5">
          <UserAvatar src={content.authorPhotoURL} alt={content.authorName} size={36} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white line-clamp-2 leading-tight text-sm mb-0.5">
              {content.title}
            </h3>
            <p className="text-xs text-gray-400 truncate">{content.authorName}</p>
            <p className="text-xs text-gray-500">
              {content.views?.toLocaleString() || 0} views • {content.createdAt.toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
};

const VideoCardSkeleton = () => (
  <div className="w-[280px] sm:w-[300px] shrink-0">
    <div className="flex flex-col animate-pulse">
      <div className="aspect-video bg-gray-700/50 rounded-xl"></div>
      <div className="flex items-start gap-2.5 mt-2.5">
        <div className="w-9 h-9 rounded-full bg-gray-700/50 shrink-0"></div>
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-gray-700/50 rounded w-3/4"></div>
          <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  </div>
);

export default function HomePage() {
  const [allContent, setAllContent] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { gamingContent, sportsContent } = useMemo(() => {
    const gaming = allContent
      .filter((item) => item.category === "games")
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    
    const sports = allContent
      .filter((item) => item.category === "sports")
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    
    return {
      gamingContent: gaming,
      sportsContent: sports,
    };
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
          
          {/* Gaming Content Section */}
          <section className="px-6 sm:px-10 lg:px-16">
            {isLoading ? (
              <div>
                <div className="h-6 bg-gray-800/50 rounded w-48 mb-4"></div>
                <div className="flex gap-3 overflow-hidden">
                  <VideoCardSkeleton />
                  <VideoCardSkeleton />
                  <VideoCardSkeleton />
                  <VideoCardSkeleton />
                </div>
              </div>
            ) : (
              <ContentRow title="🎮 Gaming Content" content={gamingContent} />
            )}
          </section>

          {/* Sports Content Section */}
          <section className="px-6 sm:px-10 lg:px-16">
            {isLoading ? (
              <div>
                <div className="h-6 bg-gray-800/50 rounded w-48 mb-4"></div>
                <div className="flex gap-3 overflow-hidden">
                  <VideoCardSkeleton />
                  <VideoCardSkeleton />
                  <VideoCardSkeleton />
                  <VideoCardSkeleton />
                </div>
              </div>
            ) : (
              <ContentRow title="⚽ Sports Content" content={sportsContent} />
            )}
          </section>

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