"use client";

import React, { useEffect, useState, Suspense, useMemo } from "react";
import { PlayCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { collection, getDocs, query, Timestamp, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, EffectFade } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/effect-fade";

import Footer from "@/app/components/Footer";
import UserAvatar from "@/app/components/UserAvatar";
import { db } from "@/app/firebase/config";
import { useSearch } from "@/app/context/SearchContext";

/* ===================== TYPES ===================== */

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

/* ===================== HERO ===================== */

const HeroCarousel = ({ featuredContent }: { featuredContent: Content[] }) => {
  const router = useRouter();
  if (!featuredContent.length) return null;

  return (
    <div className="relative mb-16">
      <Swiper
        modules={[Navigation, Autoplay, EffectFade]}
        navigation
        loop
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        className="w-full h-[45vh] lg:h-[60vh] rounded-2xl overflow-hidden"
      >
        {featuredContent.map((content) => (
          <SwiperSlide
            key={content.id}
            onClick={() => router.push(`/watch/player?v=${content.id}`)}
            className="cursor-pointer group"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
            <img
              src={content.thumbnailUrl}
              alt={content.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute bottom-0 left-0 p-6 lg:p-10 z-20">
              <h2 className="text-3xl lg:text-5xl font-extrabold text-white mb-3">
                {content.title}
              </h2>
              <p className="text-gray-300 text-lg max-w-2xl line-clamp-2">
                {content.description}
              </p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

/* ===================== ROW ===================== */

const ContentRow = ({ title, content }: { title: string; content: Content[] }) => {
  const swiperId = `swiper-${title.replace(/\s+/g, "-")}`;
  if (!content.length) return null;

  return (
    <div className="mb-16">
      <div className="flex justify-between items-center mb-5 px-1">
        <h3 className="text-2xl font-semibold">{title}</h3>
        <div className="flex gap-2">
          <button className={`prev-${swiperId} p-2 rounded-full bg-white/10`}>
            <ChevronLeft className="text-white" />
          </button>
          <button className={`next-${swiperId} p-2 rounded-full bg-white/10`}>
            <ChevronRight className="text-white" />
          </button>
        </div>
      </div>

      <Swiper
        modules={[Navigation]}
        navigation={{
          nextEl: `.next-${swiperId}`,
          prevEl: `.prev-${swiperId}`,
        }}
        spaceBetween={16}
        slidesPerView="auto"
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

/* ===================== CARD ===================== */

const VideoCard = ({ content }: { content: Content }) => {
  const router = useRouter();

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <button
      onClick={() => router.push(`/watch/player?v=${content.id}`)}
      className="block group text-left"
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800">
        <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 text-xs rounded">
          {formatDuration(content.duration)}
        </div>
        <PlayCircle className="absolute inset-0 m-auto w-12 h-12 text-white/40 group-hover:text-white opacity-0 group-hover:opacity-100" />
      </div>

      <div className="flex items-start gap-3 mt-3">
        <UserAvatar src={content.authorPhotoURL} alt={content.authorName} size={38} />
        <div>
          <h3 className="font-semibold text-white line-clamp-2">{content.title}</h3>
          <p className="text-sm text-gray-400">{content.authorName}</p>
        </div>
      </div>
    </button>
  );
};

/* ===================== MAIN ===================== */

const WatchContent = () => {
  const { search } = useSearch(); // ✅ GLOBAL SEARCH
  const [allContent, setAllContent] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* 🔥 FILTER BY SEARCH (CATEGORY + TAG + TITLE) */
  const filteredContent = useMemo(() => {
    if (!search) return allContent;

    return allContent.filter(
      (v) =>
        v.title.toLowerCase().includes(search) ||
        v.category.toLowerCase() === search ||
        v.tags?.some((t) => t.toLowerCase().includes(search))
    );
  }, [search, allContent]);

  /* 🔥 SORTED SECTIONS */
  const { featured, trending, latest } = useMemo(() => {
    const byViews = [...filteredContent].sort((a, b) => b.views - a.views);
    const byDate = [...filteredContent].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return {
      featured: byViews.slice(0, 5),
      trending: byViews.slice(0, 10),
      latest: byDate.slice(0, 10),
    };
  }, [filteredContent]);

  /* 🔥 FETCH ONCE */
  useEffect(() => {
    const fetchVideos = async () => {
      const snap = await getDocs(
        query(collection(db, "videos"), where("visibility", "==", "public"))
      );

      setAllContent(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: "vod",
            title: data.title,
            description: data.description,
            category: data.category,
            createdAt: (data.createdAt as Timestamp).toDate(),
            authorName: data.authorName,
            authorPhotoURL: data.authorPhotoURL,
            views: data.views || 0,
            videoUrl: data.videoUrl,
            thumbnailUrl: data.thumbnailUrl,
            tags: data.tags || [],
            duration: data.duration || 0,
          };
        })
      );

      setIsLoading(false);
    };

    fetchVideos();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="pt-24 px-6 lg:px-16 lg:ml-20">
        {isLoading ? (
          <p>Loading...</p>
        ) : filteredContent.length === 0 && search ? (
          <p className="text-gray-400 text-center mt-20">
            No videos found for "{search}"
          </p>
        ) : (
          <>
            <HeroCarousel featuredContent={featured} />
            <ContentRow title="Trending Now" content={trending} />
            <ContentRow title="Latest Uploads" content={latest} />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

/* ===================== PAGE ===================== */

const WatchPage = () => (
  <Suspense fallback={<div className="text-white">Loading...</div>}>
    <WatchContent />
  </Suspense>
);

export default WatchPage;
