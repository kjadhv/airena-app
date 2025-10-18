"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { db } from '@/app/firebase/config';
import { collection, onSnapshot, orderBy, query, Timestamp, where, doc } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import { PenSquare, Trash2, AlertTriangle, BookOpen, Calendar, User, ArrowRight, Eye, Plus, Clock, Share2, Bookmark, ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Import Helper and Sub-components
import { processContentForEmbeds } from "@/app/lib/processContent";
import ReadingProgress from "@/app/components/ReadingProgress";
import ReactionBar from "@/app/components/ReactionBar";
const CommentSection = dynamic(() => import("@/app/components/CommentSection"), { ssr: false });
import SocialEmbedRenderer from "@/app/components/SocialEmbedRenderer";
import Footer from '@/app/components/Footer';

// Interfaces for our data structures
interface PostListItem {
    id: string;
    slug: string;
    title: string;
    authorName: string;
    createdAt: string;
    excerpt: string;
    imageUrl: string;
    isFeatured: boolean;
    views: number;
}

interface SinglePost extends Omit<PostListItem, 'createdAt' | 'excerpt'>{
    content: string;
    createdAt: Date;
}

// Main Component
const BlogPage = () => {
    const { user, isAdmin } = useAuth();
    const router = useRouter();
    const params = useParams();
    const slug = params?.slug as string | undefined;

    // State for the list of posts
    const [posts, setPosts] = useState<PostListItem[]>([]);
    
    // State for a single post view
    const [post, setPost] = useState<SinglePost | null>(null);
    const [readingTime, setReadingTime] = useState(0);

    // General state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    
    // Ref for view counting
    const viewLoggedRef = useRef(false);

    // ✅ FIX 1: Effect to fetch a SINGLE POST with real-time updates
    useEffect(() => {
        if (slug) {
            setLoading(true);
            
            // First, get the post ID from the slug
            const fetchPostId = async () => {
                try {
                    const postsRef = collection(db, "posts");
                    const q = query(postsRef, where("slug", "==", slug));
                    const querySnapshot = await onSnapshot(q, (snapshot) => {
                        if (snapshot.empty) {
                            setError(true);
                            setLoading(false);
                            return;
                        }

                        const docSnap = snapshot.docs[0];
                        const data = docSnap.data();
                        const createdAtTimestamp = data.createdAt as Timestamp;
                        const processedContent = processContentForEmbeds(data.content);
                        const wordCount = data.content.replace(/<[^>]*>/g, "").split(/\s+/).length;
                        const minutes = Math.ceil(wordCount / 200);

                        setPost({
                            id: docSnap.id,
                            slug: data.slug,
                            title: data.title,
                            authorName: data.authorName,
                            createdAt: createdAtTimestamp.toDate(),
                            imageUrl: data.imageUrl || '',
                            isFeatured: data.isFeatured || false,
                            views: data.views || 0,
                            content: processedContent,
                        });
                        setReadingTime(minutes);
                        setLoading(false);
                    }, (err) => {
                        console.error("Error fetching post:", err);
                        setError(true);
                        setLoading(false);
                    });

                    return querySnapshot;
                } catch (err) {
                    console.error("Error setting up post listener:", err);
                    setError(true);
                    setLoading(false);
                }
            };

            const unsubscribe = fetchPostId();
            return () => {
                if (unsubscribe && typeof unsubscribe === 'object' && 'then' in unsubscribe) {
                    unsubscribe.then((unsub) => unsub && typeof unsub === 'function' && unsub());
                }
            };
        } 
        // --- Fetch ALL POSTS if no slug exists ---
        else {
            const postsCollection = collection(db, 'posts');
            const q = query(postsCollection, orderBy('createdAt', 'desc'));

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
                        views: data.views || 0,
                    };
                }).filter((p): p is PostListItem => p !== null);
                
                setPosts(postsData);
                setLoading(false);
            }, (err) => {
                console.error("Error fetching posts:", err);
                setError(true);
                setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [slug]);

    // ✅ FIX 2: Effect for logging a unique view for a single post
    useEffect(() => {
        const logView = async () => {
            if (post && !viewLoggedRef.current) {
                viewLoggedRef.current = true;
                try {
                    const headers = new Headers();
                    if (user) {
                        const token = await user.getIdToken();
                        headers.append('Authorization', `Bearer ${token}`);
                    }
                    
                    const response = await fetch(`/api/posts/${post.id}/view`, {
                        method: 'POST',
                        headers: headers,
                    });

                    // ✅ Check if the API returned an error
                    if (!response.ok) {
                        throw new Error(`API call failed with status: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log('View logged:', data.message);

                } catch (err) {
                    viewLoggedRef.current = false;
                    console.error("Failed to log view:", err);
                }
            }
        };
        logView();
    }, [post, user]);

    // --- Handler Functions ---
    const handleShare = async () => {
        if (navigator.share && post) {
            await navigator.share({ title: post.title, url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Link copied to clipboard!");
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!isAdmin || !user) return;
        try {
            const idToken = await user.getIdToken();
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (!response.ok) throw new Error('Failed to delete post.');
            setDeleteConfirm(null);
            // If viewing the deleted post, redirect back to the list
            if (slug && post?.id === postId) {
                router.push('/blogs');
            }
        } catch (err) {
            console.error("Delete Post Error:", err);
        }
    };

    // --- RENDER LOGIC ---

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center p-6">
                 <div className="text-center max-w-md space-y-6">
                    <div className="w-24 h-24 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-5xl">🔍</div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">Story Not Found</h1>
                    <p className="text-gray-400 text-lg">The blog post you're looking for seems to have wandered off.</p>
                    <button onClick={() => router.push("/blogs")} className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl font-medium transition-all transform hover:scale-105">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back to Blogs
                    </button>
                </div>
            </div>
        );
    }

    // --- RENDER SINGLE POST VIEW ---
    if (slug && post) {
        return (
            <>
                <ReadingProgress />
                <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white">
                    <header className="sticky top-0 z-40 backdrop-blur-lg bg-black/70 border-b border-gray-800">
                        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
                            <button onClick={() => router.push("/blogs")} className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                <span className="font-medium">All Stories</span>
                            </button>
                            <div className="flex items-center gap-3">
                                <button onClick={handleShare} className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors" aria-label="Share post"><Share2 className="w-5 h-5" /></button>
                                <button className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors" aria-label="Bookmark post"><Bookmark className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </header>
                    <section className="relative">
                        {post.imageUrl ? (
                            <div className="relative w-full h-[55vh] md:h-[65vh] overflow-hidden">
                                <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                                <div className="absolute bottom-0 inset-x-0 p-6 md:p-12">
                                    <div className="max-w-4xl mx-auto text-center">
                                        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight drop-shadow-2xl bg-gradient-to-r from-white via-emerald-200 to-cyan-200 bg-clip-text text-transparent">{post.title}</h1>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-emerald-950/30 via-black to-cyan-950/30 py-32 text-center">
                                <h1 className="text-5xl font-extrabold bg-gradient-to-r from-white via-emerald-200 to-cyan-200 bg-clip-text text-transparent">{post.title}</h1>
                            </div>
                        )}
                    </section>
                    <main className="max-w-3xl mx-auto px-6 md:px-8 py-16">
                        <div className="flex flex-wrap items-center justify-center gap-6 pb-10 mb-10 text-center">
                            <div className="flex items-center gap-2 text-gray-400">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center"><User className="w-5 h-5 text-white" /></div>
                                <div>
                                    <p className="text-sm text-gray-500">Written by</p>
                                    <p className="font-medium text-white">{post.authorName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-500" /><span>{post.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span></div><span className="text-gray-700">•</span>
                                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-500" /><span>{readingTime} min read</span></div><span className="text-gray-700">•</span>
                                {/* ✅ FIX 3: Real-time view count display */}
                                <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-emerald-500" /><span>{post.views.toLocaleString()} views</span></div>
                            </div>
                        </div>

                        {/* REACTION BAR */}
                        <div className="flex justify-center mb-16 border-y border-gray-800/50 py-8">
                            <ReactionBar postId={post.id} collectionName="posts" />
                        </div>
                        
                        <article className="prose prose-invert prose-emerald mx-auto text-center leading-relaxed text-gray-200 prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-[1.15rem] prose-headings:text-white prose-h2:mt-12 prose-h2:text-3xl prose-h2:font-semibold prose-img:rounded-xl prose-img:mx-auto prose-img:shadow-xl">
                            <SocialEmbedRenderer content={post.content} />
                        </article>
                        
                        <div className="mt-20 pt-12 border-t border-gray-800/50">
                             <CommentSection contentId={post.id} contentType="blog" />
                        </div>
                    </main>
                </div>
            </>
        );
    }

    // --- RENDER BLOG LIST VIEW ---
    const topStory = posts.find(p => p.isFeatured) || (posts.length > 0 ? posts[0] : null);
    const otherStories = posts.filter(p => p.id !== topStory?.id);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
            <main className="relative pt-20 pb-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {posts.length === 0 && !loading ? (
                    <div className="text-center py-16">
                        <BookOpen className="w-10 h-10 text-gray-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">No Stories Yet</h2>
                        <p className="text-gray-400 max-w-md mx-auto mb-4">Be the first to share an amazing story with our community!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {topStory && (
                             <section>
                                <h2 className="text-xs font-semibold text-yellow-300 mb-3 uppercase tracking-wider">Featured Story</h2>
                                <div className="relative">
                                    <Link href={`/blogs/${topStory.slug}`} className="group block">
                                        <div className="overflow-hidden rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-emerald-500/30">
                                            {topStory.imageUrl && <div className="relative w-full overflow-hidden aspect-[16/9] md:aspect-[3/1]"><img src={topStory.imageUrl} alt={topStory.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/><div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div></div>}
                                            <div className="p-4">
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mb-2">
                                                    <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /><span>{topStory.authorName}</span></div><span className='hidden sm:inline'>•</span>
                                                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>{topStory.createdAt}</span></div><span className='hidden sm:inline'>•</span>
                                                    <div className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /><span>{topStory.views.toLocaleString()} Views</span></div>
                                                </div>
                                                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{topStory.title}</h3>
                                                <p className="text-gray-400 text-sm leading-relaxed mb-3 line-clamp-2">{topStory.excerpt}</p>
                                                <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-sm"><span>Read Story</span><ArrowRight className="w-4 h-4" /></div>
                                            </div>
                                        </div>
                                    </Link>
                                    {isAdmin && (<div className="mt-2 flex items-center gap-2"><Link href={`/admin/edit-post/${topStory.id}`} className="flex items-center gap-1.5 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10 rounded-md transition-colors"><PenSquare size={12} /> Edit</Link><button onClick={() => setDeleteConfirm(topStory.id)} className="flex items-center gap-1.5 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition-colors"><Trash2 size={12} /> Delete</button></div>)}
                                </div>
                            </section>
                        )}
                        {otherStories.length > 0 && (
                            <section>
                                <h2 className="text-xs font-semibold text-emerald-300 mb-3 uppercase tracking-wider">Latest Stories</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {otherStories.map((post) => (
                                    <div key={post.id} className="flex flex-col">
                                        <Link href={`/blogs/${post.slug}`} className="group block flex-grow">
                                            <article className="h-full flex flex-col rounded-xl bg-gray-800/30 border border-gray-700/50 hover:border-emerald-500/30 overflow-hidden">
                                                {post.imageUrl && <div className="relative h-40 overflow-hidden"><img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform"/></div>}
                                                <div className="p-4 flex flex-col flex-grow">
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mb-2">
                                                        <span className="flex items-center gap-1">{post.authorName}</span><span>•</span>
                                                        <span className="flex items-center gap-1">{post.createdAt}</span><span>•</span>
                                                        <span className="flex items-center gap-1">{post.views.toLocaleString()} views</span>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">{post.title}</h3>
                                                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 flex-grow mb-2">{post.excerpt}</p>
                                                    <div className="mt-auto flex items-center gap-1.5 text-sm text-emerald-400 font-medium"><span>Read More</span><ArrowRight className="w-4 h-4" /></div>
                                                </div>
                                            </article>
                                        </Link>
                                        {isAdmin && (<div className="mt-2 flex items-center gap-2"><Link href={`/admin/edit-post/${post.id}`} className="flex-1 flex items-center justify-center gap-1.5 py-1 text-xs text-cyan-300 bg-gray-800/50 hover:bg-cyan-500/10 rounded-md transition-colors"><PenSquare size={12} /> Edit</Link><button onClick={() => setDeleteConfirm(post.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1 text-xs text-red-400 bg-gray-800/50 hover:bg-red-500/10 rounded-md transition-colors"><Trash2 size={12} /> Delete</button></div>)}
                                    </div>
                                ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
                </div>
            </main>
            {isAdmin && (<Link href="/blogs/new" className="fixed bottom-8 right-8 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white p-4 rounded-full shadow-lg hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-400 transition-transform duration-300 z-40" aria-label="Write a new blog post"><Plus size={24} /></Link>)}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full">
                        <div className="text-center mb-4"><AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" /><h3 className="text-lg font-bold text-white">Delete Story?</h3><p className="text-gray-400 text-sm mt-1">This action is permanent and cannot be undone.</p></div>
                        <div className="flex gap-2">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md font-medium text-sm">Cancel</button>
                            <button onClick={() => handleDeletePost(deleteConfirm)} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md font-medium text-sm">Delete</button>
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
};

export default BlogPage;