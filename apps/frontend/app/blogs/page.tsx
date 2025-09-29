"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/app/firebase/config';
import Script from 'next/script';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import BlogCard from '@/app/components/BlogCard';
import { useAuth } from '@/app/context/AuthContext';
import AdBanner from '../components/AdBanner';
import { PenSquare, Sparkles, AlertTriangle, BookOpen, Star, Clock, TrendingUp, Calendar, User, ArrowRight, Tag } from 'lucide-react';

interface Post {
    id: string;
    slug: string;
    title: string;
    authorName: string;
    createdAt: string;
    excerpt: string;
    imageUrl: string;
    isFeatured: boolean;
}

const BlogPage = () => {
    const { user, isAdmin } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    useEffect(() => {
        const postsCollection = collection(db, 'posts');
        const q = query(postsCollection, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q,
            (querySnapshot) => {
                const postsData = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    if (!data.slug || !data.title || !data.createdAt || !data.content) return null;
                    const createdAtTimestamp = data.createdAt as Timestamp;
                    return {
                        id: doc.id,
                        slug: data.slug,
                        title: data.title,
                        authorName: data.authorName || 'Anonymous',
                        createdAt: createdAtTimestamp.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                        excerpt: data.content.substring(0, 150).replace(/<[^>]+>/g, '') + '...',
                        imageUrl: data.imageUrl || '',
                        isFeatured: data.isFeatured || false,
                    };
                }).filter((post): post is Post => post !== null);
                setPosts(postsData);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error("Error fetching posts:", err);
                setError("Failed to load stories. Please try again later.");
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    const handleDeletePost = async (postId: string) => {
        if (!isAdmin || !user) return;
        try {
            const idToken = await user.getIdToken();
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (!response.ok) throw new Error('Failed to delete post');
            setDeleteConfirm(null);
        } catch (error) {
            setError("Failed to delete post. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
                </div>
                
                <Header />
                <div className="relative h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="relative mb-8">
                            <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Loading Stories</h2>
                        <p className="text-gray-400 text-sm">Just a moment...</p>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }
    
    if (error) {
       return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl animate-pulse" />
                </div>
                
                <Header />
                <div className="relative h-screen flex items-center justify-center px-4">
                    <div className="text-center max-w-md">
                        <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-2xl p-8">
                            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-red-300 mb-2">Something went wrong</h2>
                            <p className="text-gray-300 text-sm">{error}</p>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const topStory = posts.find(p => p.isFeatured) || (posts.length > 0 ? posts[0] : null);
    const otherStories = posts.filter(p => p.id !== topStory?.id);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
            {/* Subtle animated background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '3s'}} />
            </div>

            <Header />
            
            <main className="relative pt-24 pb-20">
                {/* Hero Section */}
                <div className="border-b border-gray-800/50 bg-gradient-to-b from-gray-900/50 to-transparent">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="max-w-3xl">
                                {/* Badge */}
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-3">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Stories & Insights</span>
                                </div>
                                
                                {/* Title */}
                                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-emerald-200 to-cyan-300 bg-clip-text text-transparent mb-3">
                                    Airena Blog
                                </h1>
                                
                                {/* Description */}
                                <p className="text-base text-gray-400 leading-relaxed mb-4">
                                    Latest news, updates, and inspiring stories from our gaming community.
                                </p>
                                
                                {/* Stats */}
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                        </div>
                                        <span><span className="text-white font-semibold">{posts.length}</span> Stories</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                            <Star className="w-3.5 h-3.5 text-yellow-400" />
                                        </div>
                                        <span><span className="text-white font-semibold">{posts.filter(p => p.isFeatured).length}</span> Featured</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                                        </div>
                                        <span>Updated Daily</span>
                                    </div>
                                </div>
                            </div>
                            
                            {isAdmin && (
                                <Link 
                                    href="/blogs/new" 
                                    className="group relative bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-medium hover:from-emerald-400 hover:to-cyan-400 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105 whitespace-nowrap text-sm"
                                >
                                    <PenSquare size={16} className="group-hover:rotate-12 transition-transform duration-300" /> 
                                    Write a Story
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                    {/* Top Ad */}
                    <div className="flex justify-center mb-16">
                        <AdBanner adSlot="4538040333" adFormat="horizontal" className="w-full max-w-4xl" />
                    </div>

                    {posts.length === 0 ? (
                        <div className="text-center py-32">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 mb-6">
                                <BookOpen className="w-10 h-10 text-gray-500" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-3">No Stories Yet</h2>
                            <p className="text-gray-400 max-w-md mx-auto mb-8">
                                Be the first to share an amazing story with our community!
                            </p>
                            {isAdmin && (
                                <Link 
                                    href="/blogs/new" 
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-medium hover:from-emerald-400 hover:to-cyan-400 transition-all duration-300 shadow-lg"
                                >
                                    <PenSquare size={18} />
                                    Write the First Story
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-16">
                            {/* Featured Story */}
                            {topStory && (
                                <section>
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
                                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                            <span className="text-sm font-semibold text-yellow-300">Featured Story</span>
                                        </div>
                                        <div className="flex-1 h-px bg-gradient-to-r from-yellow-500/30 to-transparent"></div>
                                    </div>
                                    
                                    <Link href={`/blogs/${topStory.slug}`} className="group block">
                                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 hover:border-emerald-500/30 transition-all duration-500">
                                            {topStory.imageUrl && (
                                                <div className="relative h-96 overflow-hidden">
                                                    <img 
                                                        src={topStory.imageUrl} 
                                                        alt={topStory.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
                                                    <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-500/90 backdrop-blur-sm rounded-full">
                                                        <span className="text-xs font-bold text-gray-900">FEATURED</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="p-8">
                                                <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4" />
                                                        <span>{topStory.authorName}</span>
                                                    </div>
                                                    <span>•</span>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{topStory.createdAt}</span>
                                                    </div>
                                                </div>
                                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 group-hover:text-emerald-400 transition-colors duration-300">
                                                    {topStory.title}
                                                </h2>
                                                <p className="text-gray-400 leading-relaxed mb-6">
                                                    {topStory.excerpt}
                                                </p>
                                                <div className="flex items-center gap-2 text-emerald-400 font-medium group-hover:gap-4 transition-all duration-300">
                                                    <span>Read Story</span>
                                                    <ArrowRight className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>

                                    {isAdmin && (
                                        <button
                                            onClick={() => setDeleteConfirm(topStory.id)}
                                            className="mt-4 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            Delete Post
                                        </button>
                                    )}
                                </section>
                            )}

                            {/* Middle Ad */}
                            {topStory && otherStories.length > 0 && (
                                <div className="flex justify-center py-8">
                                    <AdBanner adSlot="1234567890" adFormat="rectangle" className="mx-auto" />
                                </div>
                            )}
                            
                            {/* Latest Stories Grid */}
                            {otherStories.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-lg border border-emerald-500/20">
                                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                                            <span className="text-sm font-semibold text-emerald-300">Latest Stories</span>
                                        </div>
                                        <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/30 to-transparent"></div>
                                        <span className="text-sm text-gray-500">{otherStories.length} {otherStories.length === 1 ? 'Story' : 'Stories'}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {otherStories.map((post, index) => (
                                            <React.Fragment key={post.id}>
                                                <Link href={`/blogs/${post.slug}`} className="group block">
                                                    <article className="h-full rounded-xl bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-700/50 hover:border-emerald-500/30 overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-emerald-500/10">
                                                        {post.imageUrl && (
                                                            <div className="relative h-48 overflow-hidden">
                                                                <img 
                                                                    src={post.imageUrl} 
                                                                    alt={post.title}
                                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
                                                            </div>
                                                        )}
                                                        <div className="p-6">
                                                            <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                                                                <span className="flex items-center gap-1">
                                                                    <User className="w-3 h-3" />
                                                                    {post.authorName}
                                                                </span>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {post.createdAt}
                                                                </span>
                                                            </div>
                                                            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors line-clamp-2">
                                                                {post.title}
                                                            </h3>
                                                            <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 mb-4">
                                                                {post.excerpt}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
                                                                <span>Read More</span>
                                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                            </div>
                                                        </div>
                                                    </article>
                                                </Link>
                                                
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => setDeleteConfirm(post.id)}
                                                        className="px-3 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                                
                                                {/* Ad after every 6 posts */}
                                                {(index + 1) % 6 === 0 && index < otherStories.length - 1 && (
                                                    <div className="md:col-span-2 lg:col-span-3 flex justify-center my-8">
                                                        <AdBanner 
                                                            adSlot={`ad-${Math.floor(index / 6) + 2}`} 
                                                            adFormat="horizontal" 
                                                            className="w-full max-w-4xl"
                                                        />
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Bottom Ad */}
                            {posts.length >= 3 && (
                                <div className="flex justify-center pt-8">
                                    <AdBanner adSlot="9876543210" adFormat="horizontal" className="w-full max-w-4xl" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
            
            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-7 h-7 text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Delete Story?</h3>
                            <p className="text-gray-400 text-sm">
                                This action cannot be undone. The story will be permanently removed.
                            </p>
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDeleteConfirm(null)} 
                                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleDeletePost(deleteConfirm)} 
                                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <Footer />
        </div>
    );
};

export default BlogPage;