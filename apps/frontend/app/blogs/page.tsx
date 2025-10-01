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
                <Header />
                <div className="relative h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white">Loading Stories...</h2>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }
    
    if (error) {
       return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
                <Header />
                <div className="relative h-screen flex items-center justify-center px-4">
                    <div className="text-center max-w-md bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-red-300 mb-2">Something went wrong</h2>
                        <p className="text-gray-300 text-sm">{error}</p>
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
            <Header />
            
            <main className="relative pt-4 pb-4">
                {/* Hero Section */}
                <div className="border-b border-gray-800/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                            <div className="max-w-3xl">
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-2">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Stories & Insights</span>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-emerald-200 to-cyan-300 bg-clip-text text-transparent mb-1">
                                    Airena Blog
                                </h1>
                                <p className="text-sm text-gray-400 leading-relaxed mb-2">
                                    Latest news, updates, and inspiring stories from our gaming community.
                                </p>
                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1.5 text-gray-400">
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                        <span><span className="text-white font-semibold">{posts.length}</span> Stories</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-400">
                                        <Star className="w-3.5 h-3.5 text-yellow-400" />
                                        <span><span className="text-white font-semibold">{posts.filter(p => p.isFeatured).length}</span> Featured</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-400">
                                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                                        <span>Updated Daily</span>
                                    </div>
                                </div>
                            </div>
                            
                            {isAdmin && (
                                <Link 
                                    href="/blogs/new" 
                                    className="group shrink-0 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-400 hover:to-cyan-400 transition-all duration-300 flex items-center gap-2 text-sm"
                                >
                                    <PenSquare size={16} /> 
                                    Write a Story
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    {/* Top Ad */}
                    <div className="flex justify-center my-4">
                        <AdBanner adSlot="4538040333" adFormat="horizontal" className="w-full max-w-4xl" />
                    </div>

                    {posts.length === 0 ? (
                        <div className="text-center py-16">
                            <BookOpen className="w-10 h-10 text-gray-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">No Stories Yet</h2>
                            <p className="text-gray-400 max-w-md mx-auto mb-4">
                                Be the first to share an amazing story with our community!
                            </p>
                            {isAdmin && (
                                <Link 
                                    href="/blogs/new" 
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-5 py-2.5 rounded-lg font-medium"
                                >
                                    <PenSquare size={18} />
                                    Write the First Story
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Featured Story */}
                            {topStory && (
                                <section>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 rounded-md border border-yellow-500/20">
                                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                            <span className="text-xs font-semibold text-yellow-300">Featured Story</span>
                                        </div>
                                        <div className="flex-1 h-px bg-yellow-500/20"></div>
                                    </div>
                                    
                                    <Link href={`/blogs/${topStory.slug}`} className="group block">
                                        <div className="relative overflow-hidden rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-emerald-500/30">
                                            {topStory.imageUrl && (
                                                <div className="relative w-full overflow-hidden aspect-[16/9] md:aspect-[3/1]">
                                                    <img 
                                                        src={topStory.imageUrl} 
                                                        alt={topStory.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
                                                </div>
                                            )}
                                            <div className="p-4">
                                                <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                                                    <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /><span>{topStory.authorName}</span></div>
                                                    <span>•</span>
                                                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>{topStory.createdAt}</span></div>
                                                </div>
                                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                                                    {topStory.title}
                                                </h2>
                                                <p className="text-gray-400 text-sm leading-relaxed mb-3 line-clamp-2">
                                                    {topStory.excerpt}
                                                </p>
                                                <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-sm">
                                                    <span>Read Story</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>

                                    {isAdmin && (
                                        <button onClick={() => setDeleteConfirm(topStory.id)} className="mt-2 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-md">
                                            Delete Post
                                        </button>
                                    )}
                                </section>
                            )}

                            {/* Middle Ad */}
                            {topStory && otherStories.length > 0 && (
                                <div className="flex justify-center my-4">
                                    <AdBanner adSlot="1234567890" adFormat="rectangle" className="mx-auto" />
                                </div>
                            )}
                            
                            {/* Latest Stories Grid */}
                            {otherStories.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                                            <span className="text-xs font-semibold text-emerald-300">Latest Stories</span>
                                        </div>
                                        <div className="flex-1 h-px bg-emerald-500/20"></div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {otherStories.map((post) => (
                                            <div key={post.id} className="flex flex-col">
                                                <Link href={`/blogs/${post.slug}`} className="group block flex-grow">
                                                    <article className="h-full flex flex-col rounded-xl bg-gray-800/30 border border-gray-700/50 hover:border-emerald-500/30 overflow-hidden">
                                                        {post.imageUrl && (
                                                            <div className="relative h-40 overflow-hidden">
                                                                <img 
                                                                    src={post.imageUrl} 
                                                                    alt={post.title}
                                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="p-4 flex flex-col flex-grow">
                                                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                                                <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.authorName}</span>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{post.createdAt}</span>
                                                            </div>
                                                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
                                                                {post.title}
                                                            </h3>
                                                            <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 flex-grow mb-2">
                                                                {post.excerpt}
                                                            </p>
                                                            <div className="mt-auto flex items-center gap-1.5 text-sm text-emerald-400 font-medium">
                                                                <span>Read More</span>
                                                                <ArrowRight className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    </article>
                                                </Link>
                                                {isAdmin && (
                                                    <button onClick={() => setDeleteConfirm(post.id)} className="mt-2 w-full py-1 text-xs text-red-400 bg-gray-800/50 hover:bg-red-500/10 rounded-md">
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Bottom Ad */}
                            {posts.length >= 3 && (
                                <div className="flex justify-center pt-4">
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
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full">
                        <div className="text-center mb-4">
                            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-white">Delete Story?</h3>
                            <p className="text-gray-400 text-sm mt-1">This action is permanent and cannot be undone.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md font-medium text-sm">
                                Cancel
                            </button>
                            <button onClick={() => handleDeletePost(deleteConfirm)} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md font-medium text-sm">
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