"use client";

import React, { useEffect, useState, Suspense, useMemo } from "react";
import { PlayCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { collection, getDocs, query, Timestamp, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, EffectFade } from "swiper/modules";
import Image from "next/image";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/effect-fade";

import Footer from "@/app/components/Footer";
import UserAvatar from "@/app/components/UserAvatar";
import { db } from "@/app/firebase/config";

interface Content {
  id: string;
  type: "vod";
  title: string;
  description: string;
  category: string;
  createdAt: Date;
  authorName: string;
  authorPhotoURL: string | null;
  views: number;
  videoUrl: string;
  thumbnailUrl: string;
  tags: string[];
  duration: number;
}

// Sports categories based on your CATEGORIES definition
const SPORTS_TAGS = ["boxing", "karate"];
const SPORTS_CATEGORY = "sports"; // Add this to check the category field too

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
            <Image
  src={content.thumbnailUrl}
  alt={content.title}
  fill
  priority
  className="object-cover group-hover:scale-105 transition-transform duration-500"
/>
            <div className="absolute bottom-0 left-0 p-6 lg:p-10 z-20">
              <h2 className="text-3xl lg:text-5xl font-extrabold text-white mb-3 drop-shadow-lg">
                {content.title}
              </h2>
              <p className="text-gray-300 text-lg max-w-2xl line-clamp-2 drop-shadow-lg">
                {content.description}
              </p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

const ContentRow = ({ title, content }: { title: string; content: Content[] }) => {
  const swiperId = `swiper-${title.replace(/\s+/g, "-")}`;
  if (!content.length) return null;

  return (
    <div className="mb-16">
      <div className="flex justify-between items-center mb-5 px-1">
        <h3 className="text-2xl font-semibold">{title}</h3>
        <div className="flex gap-2">
          <button
            className={`prev-${swiperId} p-2 rounded-full bg-white/10 hover:bg-white/20 transition`}
          >
            <ChevronLeft className="text-white" />
          </button>
          <button
            className={`next-${swiperId} p-2 rounded-full bg-white/10 hover:bg-white/20 transition`}
          >
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
        className="!pb-2"
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
      className="block group text-left"
    >
      <div className="flex flex-col">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800 border border-transparent group-hover:border-emerald-500/60 transition-all duration-300">
          <Image
  src={content.thumbnailUrl || "/placeholder-image.png"}
  alt={content.title}
  fill
  className="object-cover"
/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {content.duration > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 text-xs rounded-md font-semibold">
              {formatDuration(content.duration)}
            </div>
          )}
          <PlayCircle className="absolute inset-0 m-auto w-12 h-12 text-white/40 group-hover:text-white transition duration-300 opacity-0 group-hover:opacity-100" />
        </div>

        <div className="flex items-start gap-3 mt-3">
          <UserAvatar src={content.authorPhotoURL} alt={content.authorName} size={38} />
          <div className="flex-1">
            <h3 className="font-semibold text-white line-clamp-2 leading-tight">{content.title}</h3>
            <p className="text-sm text-gray-400">{content.authorName}</p>
            <p className="text-xs text-gray-500">
              {content.views?.toLocaleString() || 0} views •{" "}
              {content.createdAt.toLocaleDateString()}
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
      <div className="flex items-start gap-4 mt-3">
        <div className="w-10 h-10 rounded-full bg-gray-700/50"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
          <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  </div>
);

const SportsContent = () => {
  const [allContent, setAllContent] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { featured, trending, latest } = useMemo(() => {
    const sortedByDate = [...allContent].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const sortedByViews = [...allContent].sort((a, b) => b.views - a.views);
    return {
      featured: sortedByViews.slice(0, 5),
      trending: sortedByViews.slice(0, 10),
      latest: sortedByDate.slice(0, 10),
    };
  }, [allContent]);

  useEffect(() => {
    const fetchSportsVideos = async () => {
      setIsLoading(true);
      try {
        // Fetch all public videos
        const q = query(
          collection(db, "videos"),
          where("visibility", "==", "public")
        );

        const snapshot = await getDocs(q);

        // Filter videos that have sports tags OR sports category
        const videos = snapshot.docs
          .map((doc) => {
            const d = doc.data();
            const createdAt = d.createdAt instanceof Timestamp
              ? d.createdAt.toDate()
              : new Date();

            return {
              id: doc.id,
              type: "vod" as const,
              category: d.category || "",
              createdAt,
              title: d.title || "Untitled",
              description: d.description || "",
              authorName: d.authorName || "Unknown",
              authorPhotoURL: d.authorPhotoURL || null,
              views: d.views || 0,
              videoUrl: d.videoUrl || "",
              thumbnailUrl: d.thumbnailUrl || "",
              tags: d.tags || [],
              duration: d.duration || 0,
            };
          })
          .filter((video) => {
            // Check if video has sports in tags array, OR has specific sport tags, OR has boxing/karate as category
            const hasSportsTag = video.tags.includes(SPORTS_CATEGORY);
            const hasSpecificSportTags = video.tags.some((tag: string) => SPORTS_TAGS.includes(tag));
            const isSportsCategory = SPORTS_TAGS.includes(video.category);
            
            return hasSportsTag || hasSpecificSportTags || isSportsCategory;
          });

        setAllContent(videos);
      } catch (e) {
        console.error("Sports fetch failed", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSportsVideos();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white flex flex-col">
      <main className="flex-grow pt-24 pb-20 transition-all duration-300 px-6 sm:px-10 lg:px-16 lg:ml-20">
        {isLoading ? (
          <>
            <div className="h-[45vh] lg:h-[60vh] bg-gray-800/40 rounded-2xl animate-pulse mb-12" />
            <div className="space-y-12">
              <div>
                <div className="h-7 bg-gray-800/50 rounded w-1/4 mb-4"></div>
                <div className="flex gap-5">
                  <VideoCardSkeleton />
                  <VideoCardSkeleton />
                  <VideoCardSkeleton />
                  <VideoCardSkeleton />
                </div>
              </div>
            </div>
          </>
        ) : allContent.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-3xl font-bold mb-4">No Sports Videos Yet</h2>
            <p className="text-gray-400">Check back later for new content!</p>
          </div>
        ) : (
          <>
            <HeroCarousel featuredContent={featured} />
            <ContentRow title="Trending in Sports" content={trending} />
            <ContentRow title="Latest Sports Uploads" content={latest} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

const SportsPage = () => (
  <Suspense
    fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading Sports...
      </div>
    }
  >
    <SportsContent />
  </Suspense>
);

export default SportsPage;