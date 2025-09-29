"use client";
import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { Upload, Film, Gamepad2, PlayCircle, Radio, Menu, X, Home, Search, TrendingUp, ArrowLeft, Clock, Eye, Share2, Check, Tag } from 'lucide-react';
import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// --- ACTUAL IMPORTS ---
import { useAuth } from '@/app/context/AuthContext';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import UserAvatar from '@/app/components/UserAvatar';
import { db } from '@/app/firebase/config';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

// --- Type Definitions for Clarity ---
type Category = 'all' | 'trending' | 'live' | 'games' | 'sports';

// --- Interfaces Updated for new metadata ---
interface Video {
    id: string; title: string; description: string; videoUrl: string;
    category: 'games' | 'sports'; createdAt: Timestamp; authorName: string;
    authorPhotoURL: string | null; views?: number;
    thumbnailUrl: string; 
    tags: string[]; 
    duration?: number; 
}
interface LiveStream {
    firebaseId: string; streamKey: string; displayName: string; photoURL: string | null; views?: number;
}
interface Content {
    id: string; type: 'vod' | 'live'; title: string; description?: string;
    category: 'games' | 'sports' | 'live'; createdAt?: Date; authorName: string;
    authorPhotoURL: string | null; views?: number; videoUrl?: string;
    linkUrl: string; streamKey?: string;
    thumbnailUrl?: string; 
    tags?: string[];
    duration?: number;
}

// --- Sidebar Props Interface ---
interface WatchSidebarProps {
    isOpen: boolean;
    onCategorySelect: (category: Category) => void;
    activeCategory: Category;
}

// --- Sidebar Component ---
const WatchSidebar = ({ isOpen, onCategorySelect, activeCategory }: WatchSidebarProps) => {
    const [pathname, setPathname] = useState('');
    useEffect(() => { if (typeof window !== 'undefined') setPathname(window.location.pathname) }, []);

    const mainLinks = [ { href: '/', icon: Home, label: 'Home' }, { href: '/watch', icon: PlayCircle, label: 'Watch' }];
    const categoryLinks: { category: Category; icon: React.ElementType; label: string }[] = [
        { category: 'all', icon: Home, label: 'All' },
        { category: 'trending', icon: TrendingUp, label: 'Trending' },
        { category: 'live', icon: Radio, label: 'Live Creators' },
        { category: 'games', icon: Gamepad2, label: 'Games' },
        { category: 'sports', icon: Film, label: 'Sports' }
    ];

    return (
        <aside className={`fixed top-0 left-0 z-40 h-full pt-24 hidden lg:flex flex-col bg-black/50 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
            <div className={`flex-grow px-4 space-y-2`}>
                {mainLinks.map(({ href, icon: Icon, label }) => (
                    <Link key={href} href={href} className={`flex items-center gap-4 py-3 rounded-xl transition-colors duration-200 ${pathname === href ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-gray-400 hover:text-white hover:bg-white/10'} ${isOpen ? 'px-4' : 'justify-center'}`} title={label}>
                        <Icon size={22} />
                        {isOpen && <span className="font-semibold">{label}</span>}
                    </Link>
                ))}
                <div className="border-t border-white/10 my-4"></div>
                {categoryLinks.map(({ category, icon: Icon, label }) => (
                    <button key={category} onClick={() => onCategorySelect(category)} className={`w-full flex items-center gap-4 py-3 rounded-xl transition-colors duration-200 ${activeCategory === category ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-gray-400 hover:text-white hover:bg-white/10'} ${isOpen ? 'px-4' : 'justify-center'}`} title={label}>
                        <Icon size={22} />
                        {isOpen && <span className="font-semibold">{label}</span>}
                    </button>
                ))}
            </div>
        </aside>
    );
};


// --- Skeleton Loader Component ---
const VideoCardSkeleton = () => (
    <div className="flex flex-col animate-pulse">
        <div className="relative aspect-video bg-gray-700/50 rounded-2xl"></div>
        <div className="flex items-start gap-4 mt-4">
            <div className="w-10 h-10 rounded-full bg-gray-700/50 shrink-0"></div>
            <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
                <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
                <div className="h-3 bg-gray-700/50 rounded w-1/3"></div>
            </div>
        </div>
    </div>
);

// --- Reusable Video Card Component ---
const VideoCard = ({ content, onSelect }: { content: Content, onSelect: (content: Content) => void }) => {
    const formatDuration = (seconds: number) => {
        if (isNaN(seconds) || seconds < 0) return "00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return [
            h > 0 ? h : null,
            h > 0 && m < 10 ? '0' + m : m,
            s < 10 ? '0' + s : s,
        ].filter(Boolean).join(':');
    };

    return (
        <button onClick={() => onSelect(content)} className="block group text-left">
            <div className="flex flex-col h-full">
                <div className="relative aspect-video bg-gray-800 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-emerald-500 transition-all duration-300 transform group-hover:scale-105">
                    {content.thumbnailUrl ? (
                        <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800"></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    {content.type === 'live' && (
                        <div className="absolute top-3 left-3 z-10 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse">
                            <Radio size={14} /> LIVE
                        </div>
                    )}
                    {content.duration && (
                         <div className="absolute bottom-2 right-2 z-10 bg-black/75 text-white px-2 py-1 rounded-md text-xs font-bold">
                            {formatDuration(content.duration)}
                        </div>
                    )}
                     <PlayCircle className="absolute inset-0 m-auto w-12 h-12 text-white/50 group-hover:text-white transition-all duration-300 opacity-0 group-hover:opacity-100" />
                </div>
                <div className="flex items-start gap-4 mt-4">
                    <UserAvatar src={content.authorPhotoURL} alt={content.authorName} size={40} />
                    <div className="flex-1">
                        <h3 className="font-bold text-white line-clamp-2">{content.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">{content.authorName}</p>
                        {content.type === 'vod' && content.createdAt && (
                             <p className="text-xs text-gray-500 mt-1">
                                {content.views?.toLocaleString() || 0} views • {content.createdAt.toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
};


// --- Video Player View ---
const PlayerView = ({ video, upNext, onSelectVideo, onBack }: { video: Content, upNext: Content[], onSelectVideo: (video: Content) => void, onBack: () => void }) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (video && video.id && video.type === 'vod') {
            const incrementView = async () => {
                try {
                    await fetch(`/api/videos/${video.id}`, { method: 'POST' });
                } catch (error) {
                    console.error("Failed to update view count:", error);
                }
            };
            incrementView();
        }
    }, [video]);

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/watch?v=${video.id}`;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div>
            <button onClick={onBack} className="flex items-center gap-2 text-emerald-400 font-semibold mb-6 hover:text-emerald-300 transition-colors">
                <ArrowLeft size={20} /> Back to Browse
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="space-y-8">
                        <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                            <ReactPlayer src={video.videoUrl} width="100%" height="100%" playing={true} controls={true} />
                        </div>
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-xl">
                            <h2 className="text-4xl font-bold text-white mb-6">{video.title}</h2>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                                <div className="flex items-center gap-4">
                                    <UserAvatar src={video.authorPhotoURL} alt={video.authorName} size={50} />
                                    <div>
                                        <p className="font-semibold text-white text-lg">{video.authorName}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                            {video.createdAt && <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{video.createdAt.toLocaleDateString()}</div>}
                                            <div className="flex items-center gap-1"><Eye className="w-4 h-4" />{video.views || 0} views</div>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleShare} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg font-semibold transition-colors">
                                    {copied ? <><Check size={16}/> Copied!</> : <><Share2 size={16}/> Share</>}
                                </button>
                            </div>
                            <div className="prose prose-invert max-w-none mb-6"><p className="text-gray-300 leading-relaxed text-lg">{video.description}</p></div>
                            
                            {video.tags && video.tags.length > 0 && (
                                <div className="border-t border-white/10 pt-6">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Tag size={20}/> Tags</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {video.tags.map(tag => (
                                            <span key={tag} className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm font-medium">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <div className="sticky top-28">
                        <h3 className="text-2xl font-bold text-white mb-6">Up Next</h3>
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-4 shadow-xl max-h-[800px] overflow-y-auto">
                            <div className="space-y-4">
                                {upNext.map((nextVideo) => (
                                    <VideoListItem key={nextVideo.id} video={nextVideo} onSelect={() => onSelectVideo(nextVideo)} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const VideoListItem = ({ video, onSelect }: { video: Content, onSelect: () => void }) => (
    <button onClick={onSelect} className="w-full text-left group relative flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-300 hover:bg-white/10 border border-transparent hover:border-white/10">
        <div className="relative w-32 h-20 bg-black rounded-xl overflow-hidden shrink-0 border border-white/10">
            {video.thumbnailUrl ? (
                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover"/>
            ) : (
                 <PlayCircle className={`absolute inset-0 m-auto w-8 h-8 text-gray-500 group-hover:text-white transition-all duration-300 z-10`} />
            )}
        </div>
        <div className="flex-1 overflow-hidden">
            <h4 className={`font-bold text-sm text-white line-clamp-2`}>{video.title}</h4>
            <p className="text-xs text-gray-400 mt-2">{video.authorName}</p>
        </div>
    </button>
);


// --- Main Content Grid ---
const ContentGrid = ({ onVideoSelect, allContent, isLoading }: { onVideoSelect: (content: Content) => void, allContent: Content[], isLoading: boolean }) => {
    const { isAdmin } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<Category>('all');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const filteredContent = useMemo(() => {
        let content = [...allContent];
        if (activeCategory === 'trending') {
            content = content.filter(c => c.type === 'vod').sort((a, b) => (b.views || 0) - (a.views || 0));
        } else if (activeCategory !== 'all') {
             if (activeCategory === 'live') content = content.filter(c => c.type === 'live');
             else content = content.filter(c => c.category === activeCategory && c.type === 'vod');
        }
        if (searchQuery) {
            content = content.filter(c =>
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.authorName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return content;
    }, [allContent, activeCategory, searchQuery]);
    
    return (
        <>
            <WatchSidebar 
                isOpen={isSidebarOpen}
                onCategorySelect={setActiveCategory}
                activeCategory={activeCategory}
            />
            <div className={`transition-all duration-300 ${isSidebarOpen ? 'lg:pl-72' : 'lg:pl-28'}`}>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={toggleSidebar} className="hidden lg:block p-2 rounded-full hover:bg-white/10" title="Toggle Sidebar">
                            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <h1 className="text-3xl font-bold">
                            {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}
                        </h1>
                    </div>
                    {isAdmin && (
                        <Link href="/watch/upload" className="group bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-6 py-3 rounded-2xl font-semibold border border-emerald-500/30 hover:border-emerald-400/50 transition-all flex items-center gap-2">
                            <Upload size={20} /> <span className="hidden sm:inline">Upload Video</span>
                        </Link>
                    )}
                </div>

                <div className="relative mb-8">
                    <Search className="absolute top-1/2 left-5 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search for videos and creators..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-lg"
                    />
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
                        {Array.from({ length: 8 }).map((_, index) => <VideoCardSkeleton key={index} />)}
                    </div>
                ) : filteredContent.length === 0 ? (
                    <div className="text-center py-20">
                    <h3 className="text-2xl font-bold text-gray-300 mb-2">No Content Found</h3>
                        <p className="text-gray-500">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
                        {filteredContent.map((item) => <VideoCard key={item.id} content={item} onSelect={onVideoSelect} />)}
                    </div>
                )}
            </div>
        </>
    )
}

// --- Watch Content Component (uses searchParams) ---
const WatchContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();

    const [selectedVideo, setSelectedVideo] = useState<Content | null>(null);
    const [allContent, setAllContent] = useState<Content[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const handleSelectVideo = (content: Content) => {
        const updatedContent = { ...content, views: (content.views || 0) + 1 };
        setSelectedVideo(updatedContent);
        
        setAllContent(prevContent => prevContent.map(c => c.id === content.id ? updatedContent : c));

        router.push(`/watch?v=${content.id}`);
    };

    const handleClearVideo = () => {
        setSelectedVideo(null);
        router.push('/watch');
    };
    
    useEffect(() => {
        if (!loading) {
            const fetchAllContent = async () => {
                 setIsLoading(true);
                 try {
                     const videosQuery = query(collection(db, 'videos'), where('visibility', '==', 'public'));
                     const videosSnapshot = await getDocs(videosQuery);
                     const fetchedVideos = videosSnapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            type: 'vod',
                            title: data.title,
                            category: data.category,
                            createdAt: (data.createdAt as Timestamp).toDate(),
                            authorName: data.authorName,
                            authorPhotoURL: data.authorPhotoURL,
                            views: data.views,
                            linkUrl: `/watch?v=${doc.id}`,
                            videoUrl: data.videoUrl,
                            description: data.description,
                            thumbnailUrl: data.thumbnailUrl,
                            tags: data.tags,
                            duration: data.duration
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
        }
    }, [user, loading]);

    useEffect(() => {
        const videoId = searchParams.get('v');
        if (videoId && allContent.length > 0) {
            const videoFromUrl = allContent.find(v => v.id === videoId);
            if (videoFromUrl) {
                setSelectedVideo(videoFromUrl);
            }
        } else {
            setSelectedVideo(null);
        }
    }, [searchParams, allContent]);

    const upNextVideos = useMemo(() => {
        if (!selectedVideo) return [];
        return allContent.filter(v => v.id !== selectedVideo.id);
    }, [allContent, selectedVideo]);
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white flex flex-col">
            <Header />
            <main className="flex-grow pt-28 pb-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    {selectedVideo ? (
                         <PlayerView 
                            video={selectedVideo} 
                            upNext={upNextVideos}
                            onSelectVideo={handleSelectVideo}
                            onBack={handleClearVideo}
                        />
                    ) : (
                        <ContentGrid 
                            onVideoSelect={handleSelectVideo} 
                            allContent={allContent}
                            isLoading={isLoading}
                        />
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

// --- Main Watch Page Component ---
const WatchPage = () => {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                 <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        }>
            <WatchContent />
        </Suspense>
    );
};

export default WatchPage;