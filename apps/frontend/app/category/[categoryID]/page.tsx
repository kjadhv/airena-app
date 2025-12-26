"use client";

import React, { useEffect, useState, useMemo } from "react";
import { PlayCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, EffectFade } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/effect-fade";

import Footer from "@/app/components/Footer";
import UserAvatar from "@/app/components/UserAvatar";
import { db } from "@/app/firebase/config";
export const dynamic = 'force-dynamic';
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

// Category definitions - matches your TrendingCategoriesSection
const CATEGORIES = {
  boxing: {
    name: "Boxing",
    gradient: "from-red-700/80 to-orange-700/80",
  },
  karate: {
    name: "Karate",
    gradient: "from-amber-700/80 to-yellow-700/80",
  },
  bgmi: {
    name: "BGMI",
    gradient: "from-orange-600/80 to-red-600/80",
  },
  valorant: {
    name: "Valorant",
    gradient: "from-red-600/80 to-pink-600/80",
  },
  chess: {
    name: "Chess",
    gradient: "from-slate-700/80 to-gray-700/80",
  },
  ludo: {
    name: "Ludo",
    gradient: "from-green-600/80 to-teal-600/80",
  },
  grand_theft: {
    name: "Grand Theft Auto",
    gradient: "from-green-600/80 to-emerald-600/80",
  },
  "call-of-duty": {
    name: "Call of Duty",
    gradient: "from-orange-600/80 to-red-700/80",
  },
  music: {
    name: "Music",
    gradient: "from-pink-600/80 to-rose-600/80",
  },
  podcast: {
    name: "Podcast",
    gradient: "from-purple-600/80 to-indigo-600/80",
  },
};



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
          <button className={`prev-${swiperId} p-2 rounded-full bg-white/10 hover:bg-white/20 transition`}>
            <ChevronLeft className="text-white" />
          </button>
          <button className={`next-${swiperId} p-2 rounded-full bg-white/10 hover:bg-white/20 transition`}>
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
          <img
            src={content.thumbnailUrl || "/placeholder-image.png"}
            alt={content.title}
            className="w-full h-full object-cover"
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

const CategoryPageContent = () => {
  const params = useParams();
  const categoryId = params.categoryID as string;
  const [videos, setVideos] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryInfo = CATEGORIES[categoryId as keyof typeof CATEGORIES];

  const { featured, trending, latest } = useMemo(() => {
    const byViews = [...videos].sort((a, b) => b.views - a.views);
    const byDate = [...videos].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      featured: byViews.slice(0, 5),
      trending: byViews.slice(0, 10),
      latest: byDate.slice(0, 10),
    };
  }, [videos]);

  useEffect(() => {
    const fetchCategoryVideos = async () => {
      // if (!categoryInfo) {
      //   setLoading(false);
      //   return;
      // }

      setLoading(true);
      try {
        // Query videos where category matches the categoryId
        const q = query(
          collection(db, "videos"),
          where("visibility", "==", "public"),
          where("category", "==", categoryId)
        );
        
        const snapshot = await getDocs(q);

        const filteredVideos = snapshot.docs.map((doc) => {
          const d = doc.data();
          const createdAtTimestamp = d.createdAt as Timestamp;
          return {
            id: doc.id,
            type: "vod",
            title: d.title || "Untitled",
            description: d.description || "",
            category: d.category || "",
            createdAt: createdAtTimestamp ? createdAtTimestamp.toDate() : new Date(),
            authorName: d.authorName || "Unknown",
            authorPhotoURL: d.authorPhotoURL || null,
            views: d.views || 0,
            videoUrl: d.videoUrl || "",
            thumbnailUrl: d.thumbnailUrl || "",
            tags: d.tags || [],
            duration: d.duration || 0,
          } as Content;
        });

        setVideos(filteredVideos);
      } catch (err) {
        console.error("Failed to fetch category videos", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryVideos();
  }, [categoryId, categoryInfo]);

  // if (!categoryInfo) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white flex items-center justify-center">
  //       <div className="text-center">
  //         <h1 className="text-4xl font-bold mb-4">Category Not Found</h1>
  //         <p className="text-gray-400">The category you're looking for doesn't exist.</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white flex flex-col">
      <main className="flex-grow pt-24 pb-20 transition-all duration-300 px-6 sm:px-10 lg:px-16 lg:ml-20">
        {loading ? (
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
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-3xl font-bold mb-4">No videos found in {categoryInfo?.name || categoryId}</h2>
            <p className="text-gray-400">Check back later for new content!</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2 capitalize">{categoryId}</h1>
              <p className="text-gray-400">{videos.length} videos</p>
            </div>
            <HeroCarousel featuredContent={featured} />
            <ContentRow
  title={`Trending in ${categoryInfo?.name || categoryId}`}
  content={trending}
/>
            <ContentRow title="Latest Uploads" content={latest} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CategoryPageContent;