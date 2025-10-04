"use client";

import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { PlayCircle, Eye, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, EffectFade } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade';

import Header from '@/app/components/Sidebar';
import Footer from '@/app/components/Footer';
import UserAvatar from '@/app/components/UserAvatar';
import { db } from '@/app/firebase/config';

interface Content {
    id: string; type: 'vod'; title: string; description: string;
    category: 'games' | 'sports'; createdAt: Date; authorName: string;
    authorPhotoURL: string | null; views: number; videoUrl: string;
    thumbnailUrl: string; tags: string[]; duration: number;
}

const HeroCarousel = ({ featuredContent }: { featuredContent: Content[] }) => {
    const router = useRouter();
    if (!featuredContent.length) return null;
    return (
        <div className="relative -mt-8 mb-12">
            <Swiper
                modules={[Navigation, Autoplay, EffectFade]}
                navigation loop={true}
                autoplay={{ delay: 5000, disableOnInteraction: false }}
                effect="fade" fadeEffect={{ crossFade: true }}
                className="w-full h-[50vh] lg:h-[65vh] rounded-3xl overflow-hidden"
            >
                {featuredContent.map((content) => (
                    <SwiperSlide 
                        key={content.id} 
                        onClick={() => router.push(`/watch/player?v=${content.id}`)} 
                        className="cursor-pointer group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
                        <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-0 left-0 p-8 lg:p-12 z-20">
                            <h2 className="text-3xl lg:text-5xl font-extrabold text-white mb-3 drop-shadow-lg">{content.title}</h2>
                            <p className="text-gray-300 text-lg max-w-2xl line-clamp-2 drop-shadow-lg">{content.description}</p>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
};

const ContentRow = ({ title, content }: { title: string, content: Content[] }) => {
    const router = useRouter();
    const swiperId = `swiper-${title.replace(/\s+/g, '-')}`;
    if (!content.length) return null;
    return (
        <div className="mb-12">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold">{title}</h3>
                <div className="flex gap-2">
                    <button className={`prev-${swiperId} p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50`}><ChevronLeft/></button>
                    <button className={`next-${swiperId} p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50`}><ChevronRight/></button>
                </div>
            </div>
            <Swiper
                modules={[Navigation]}
                navigation={{ nextEl: `.next-${swiperId}`, prevEl: `.prev-${swiperId}` }}
                spaceBetween={20} slidesPerView="auto" className="!pb-4"
            >
                {content.map(item => (
                    <SwiperSlide key={item.id} className="!w-[300px] sm:!w-[320px]">
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
        return [ h > 0 ? h : null, h > 0 && m < 10 ? '0' + m : m, s < 10 ? '0' + s : s ].filter(Boolean).join(':');
    };
    return (
        <button onClick={() => router.push(`/watch/player?v=${content.id}`)} className="block group text-left w-full">
            <div className="flex flex-col h-full">
                <div className="relative aspect-video bg-gray-800 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-emerald-500 transition-all duration-300 transform group-hover:scale-105">
                    <img src={content.thumbnailUrl || '/placeholder-image.png'} alt={content.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    {content.duration > 0 && (<div className="absolute bottom-2 right-2 z-10 bg-black/75 text-white px-2 py-1 rounded-md text-xs font-bold">{formatDuration(content.duration)}</div>)}
                    <PlayCircle className="absolute inset-0 m-auto w-12 h-12 text-white/50 group-hover:text-white transition-all duration-300 opacity-0 group-hover:opacity-100" />
                </div>
                <div className="flex items-start gap-4 mt-4">
                    <UserAvatar src={content.authorPhotoURL} alt={content.authorName} size={40} />
                    <div className="flex-1">
                        <h3 className="font-bold text-white line-clamp-2">{content.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">{content.authorName}</p>
                        <p className="text-xs text-gray-500 mt-1">{content.views?.toLocaleString() || 0} views • {content.createdAt.toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
        </button>
    );
};

const VideoCardSkeleton = () => (
    <div className="w-[300px] sm:w-[320px] shrink-0">
        <div className="flex flex-col animate-pulse">
            <div className="relative aspect-video bg-gray-700/50 rounded-2xl"></div>
            <div className="flex items-start gap-4 mt-4">
                <div className="w-10 h-10 rounded-full bg-gray-700/50 shrink-0"></div>
                <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
                </div>
            </div>
        </div>
    </div>
);

const WatchContent = () => {
    const [allContent, setAllContent] = useState<Content[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { featured, trending, latest } = useMemo(() => {
        const sortedByDate = [...allContent].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const sortedByViews = [...allContent].sort((a, b) => b.views - a.views);
        return { featured: sortedByViews.slice(0, 5), trending: sortedByViews.slice(0, 10), latest: sortedByDate.slice(0, 10) };
    }, [allContent]);

    useEffect(() => {
        const fetchAllContent = async () => {
            setIsLoading(true);
            try {
                const videosQuery = query(collection(db, 'videos'), where('visibility', '==', 'public'));
                const videosSnapshot = await getDocs(videosQuery);
                const fetchedVideos = videosSnapshot.docs.map(doc => {
                    const data = doc.data();
                    const createdAtTimestamp = data.createdAt as Timestamp;
                    return {
                        id: doc.id, type: 'vod', title: data.title || 'Untitled Video', description: data.description || '',
                        category: data.category || 'games', createdAt: createdAtTimestamp ? createdAtTimestamp.toDate() : new Date(),
                        authorName: data.authorName || 'Unknown', authorPhotoURL: data.authorPhotoURL || null, views: data.views || 0,
                        videoUrl: data.videoUrl || '', thumbnailUrl: data.thumbnailUrl || '', tags: data.tags || [], duration: data.duration || 0,
                    } as Content;
                });
                setAllContent(fetchedVideos);
            } catch (error) { console.error("Failed to fetch content:", error); } 
            finally { setIsLoading(false); }
        };
        fetchAllContent();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white flex flex-col">
            <Header />
            <main className="flex-grow pt-28 pb-16 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 0rem)' }}>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    {isLoading ? (
                        <>
                            <div className="relative h-[50vh] lg:h-[65vh] bg-gray-700/50 rounded-3xl animate-pulse mb-12"></div>
                            <div className="space-y-12">
                                <div>
                                    <div className="h-8 bg-gray-700/50 rounded w-1/4 mb-4"></div>
                                    <div className="flex gap-5"><VideoCardSkeleton /><VideoCardSkeleton /><VideoCardSkeleton /><VideoCardSkeleton /></div>
                                </div>
                                <div>
                                    <div className="h-8 bg-gray-700/50 rounded w-1/4 mb-4"></div>
                                    <div className="flex gap-5"><VideoCardSkeleton /><VideoCardSkeleton /><VideoCardSkeleton /><VideoCardSkeleton /></div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <HeroCarousel featuredContent={featured} />
                            <ContentRow title="Trending Now" content={trending} />
                            <ContentRow title="Latest Uploads" content={latest} />
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

const WatchPage = () => (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
        <WatchContent />
    </Suspense>
);

export default WatchPage;