"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import "swiper/css";
import "swiper/css/navigation";

interface Video {
  id: string;
  category: string;
  views: number;
}

interface Category {
  id: string;
  name: string;
  image: string;
  gradient: string;
}

interface CategoryWithViews extends Category {
  totalViews: number;
}

interface Props {
  videos: Video[];
  isLoading?: boolean;
}

const TrendingCategoriesSection = ({ videos, isLoading = false }: Props) => {
  const router = useRouter();
  const [categoriesWithViews, setCategoriesWithViews] = useState<CategoryWithViews[]>([]);

  // Define the 10 categories using useMemo to make it stable
  const baseCategories: Category[] = useMemo(() => [
    {
      id: "boxing",
      name: "Boxing",
      image: "/player1.jpg",
      gradient: "from-red-700/80 to-orange-700/80",
    },
    {
      id: "karate",
      name: "Karate",
      image: "/player1.jpg",
      gradient: "from-amber-700/80 to-yellow-700/80",
    },
    {
      id: "bgmi",
      name: "BGMI",
      image: "/player1.jpg",
      gradient: "from-orange-600/80 to-red-600/80",
    },
    {
      id: "valorant",
      name: "Valorant",
      image: "/player1.jpg",
      gradient: "from-red-600/80 to-pink-600/80",
    },
    {
      id: "chess",
      name: "Chess",
      image: "/player1.jpg",
      gradient: "from-slate-700/80 to-gray-700/80",
    },
    {
      id: "ludo",
      name: "Ludo",
      image: "/player1.jpg",
      gradient: "from-green-600/80 to-teal-600/80",
    },
    {
      id: "grand_theft",
      name: "Grand Theft Auto",
      image: "/player1.jpg",
      gradient: "from-green-600/80 to-emerald-600/80",
    },
    {
      id: "call-of-duty",
      name: "Call of Duty",
      image: "/player1.jpg",
      gradient: "from-orange-600/80 to-red-700/80",
    },
    {
      id: "music",
      name: "Music",
      image: "/player1.jpg",
      gradient: "from-pink-600/80 to-rose-600/80",
    },
    {
      id: "podcast",
      name: "Podcast",
      image: "/player1.jpg",
      gradient: "from-purple-600/80 to-indigo-600/80",
    },
  ], []);

  useEffect(() => {
    const categoryViewsMap = new Map<string, number>();

    videos.forEach((video) => {
      const videoCategory = video.category;
      const videoViews = video.views || 0;
      
      // Match video category directly with our defined categories
      if (videoCategory && categoryViewsMap.has(videoCategory)) {
        categoryViewsMap.set(
          videoCategory,
          categoryViewsMap.get(videoCategory)! + videoViews
        );
      } else if (videoCategory) {
        categoryViewsMap.set(videoCategory, videoViews);
      }
    });

    // Update categories with real view counts
    const updatedCategories = baseCategories.map((category) => ({
      ...category,
      totalViews: categoryViewsMap.get(category.id) || 0,
    }));

    // Sort by total views (highest first)
    const sortedCategories = updatedCategories.sort((a, b) => b.totalViews - a.totalViews);

    setCategoriesWithViews(sortedCategories);
  }, [videos, baseCategories]);

  const formatViews = (count: number): string => {
    if (count === 0) return "0";
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (isLoading) {
    return (
      <section className="px-6 sm:px-10 lg:px-16 mb-12">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-800/50 rounded w-64 animate-pulse"></div>
          <div className="h-6 bg-gray-800/50 rounded w-20 animate-pulse"></div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-[140px] sm:w-[160px] lg:w-[180px] shrink-0">
              <div className="aspect-[3/4] bg-gray-800/50 rounded-xl animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-800/50 rounded w-20 animate-pulse"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 sm:px-10 lg:px-16 mb-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold">Trending Categories</h2>
        <button
          onClick={() => router.push("/videos/all")}
          className="text-emerald-400 hover:text-emerald-300 font-semibold text-sm sm:text-base flex items-center gap-1 transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Categories Carousel */}
      <div className="relative">
        {/* Navigation Buttons */}
        <button className="categories-prev hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 transition backdrop-blur-sm border border-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button className="categories-next hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 transition backdrop-blur-sm border border-white/10">
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        {/* Swiper */}
        <Swiper
          modules={[Navigation]}
          navigation={{
            nextEl: ".categories-next",
            prevEl: ".categories-prev",
          }}
          spaceBetween={16}
          slidesPerView="auto"
          className="!overflow-visible"
        >
          {categoriesWithViews.map((category) => (
            <SwiperSlide key={category.id} className="!w-[140px] sm:!w-[160px] lg:!w-[180px]">
              <CategoryCard category={category} formatViews={formatViews} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

const CategoryCard = ({
  category,
  formatViews,
}: {
  category: CategoryWithViews;
  formatViews: (count: number) => string;
}) => {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/category/${category.id}`)}
      className="group w-full text-left"
    >
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
        {/* Category Image */}
        <Image
          src={category.image}
          alt={category.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          sizes="(max-width: 640px) 140px, (max-width: 1024px) 160px, 180px"
        />

        {/* Gradient Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t ${category.gradient} to-transparent opacity-60 group-hover:opacity-70 transition-opacity`}
        />

        {/* Category Name */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="font-bold text-white text-sm sm:text-base line-clamp-2 drop-shadow-lg">
            {category.name}
          </h3>
        </div>

        {/* Hover Border Effect */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-emerald-500/60 rounded-xl transition-colors pointer-events-none" />
      </div>

      {/* View Count */}
      <p className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
        {formatViews(category.totalViews)} Views
      </p>
    </button>
  );
};

export default TrendingCategoriesSection;