"use client";
import React, { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { db } from '@/app/firebase/config';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useAuth } from '@/app/context/AuthContext';
import AdBanner from '../components/AdBanner';
import { PenSquare, Trash2, AlertTriangle, BookOpen, Star, TrendingUp, Calendar, User, ArrowRight, Eye, X, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Post {
    id: string;
    slug: string;
    title: string;
    authorName: string;
    createdAt: string;
    excerpt: string;
    imageUrl: string;
    isFeatured: boolean;
    views: number;
    content: string; 
}

const BlogPage = () => {
    const { user, isAdmin } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
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
                    content: data.content,
                };
            }).filter((post): post is Post => post !== null);
            setPosts(postsData);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching posts:", err);
            setError("Failed to load stories. Please try again later.");
            setLoading(false);
        });
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

            if (!response.ok) {
                throw new Error('Failed to delete post from server.');
            }
            setDeleteConfirm(null);
        } catch (error) {
            console.error("Delete Post Error:", error);
            setError("Failed to delete post. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
                <Header />
                <div className="relative h-screen flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
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
            
            <main className="relative pt-20 pb-4">
                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {posts.length === 0 && !loading ? (
                        <div className="text-center py-16">
                             <BookOpen className="w-10 h-10 text-gray-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">No Stories Yet</h2>
                            <p className="text-gray-400 max-w-md mx-auto mb-4">
                                Be the first to share an amazing story with our community!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {topStory && (
                                <section>
                                    <h2 className="text-xs font-semibold text-yellow-300 mb-3 uppercase tracking-wider">Featured Story</h2>
                                    <div className="relative">
                                        <Link href={`/blogs/${topStory.slug}`} className="group block">
                                            <div className="overflow-hidden rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-emerald-500/30">
                                                {topStory.imageUrl && (
                                                    <div className="relative w-full overflow-hidden aspect-[16/9] md:aspect-[3/1]">
                                                        <img src={topStory.imageUrl} alt={topStory.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                                                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
                                                    </div>
                                                )}
                                                <div className="p-4">
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mb-2">
                                                        <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /><span>{topStory.authorName}</span></div>
                                                        <span className='hidden sm:inline'>•</span>
                                                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>{topStory.createdAt}</span></div>
                                                        <span className='hidden sm:inline'>•</span>
                                                        <div className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /><span>{topStory.views.toLocaleString()} Views</span></div>
                                                    </div>
                                                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{topStory.title}</h3>
                                                    <p className="text-gray-400 text-sm leading-relaxed mb-3 line-clamp-2">{topStory.excerpt}</p>
                                                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-sm"><span>Read Story</span><ArrowRight className="w-4 h-4" /></div>
                                                </div>
                                            </div>
                                        </Link>
                                        {isAdmin && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <Link 
                                                    href={`/admin/edit-post/${topStory.id}`}
                                                    className="flex items-center gap-1.5 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10 rounded-md transition-colors"
                                                >
                                                    <PenSquare size={12} /> Edit
                                                </Link>
                                                <button onClick={() => setDeleteConfirm(topStory.id)} className="flex items-center gap-1.5 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
                                                    <Trash2 size={12} /> Delete
                                                </button>
                                            </div>
                                        )}
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
                                                        {post.imageUrl && (
                                                            <div className="relative h-40 overflow-hidden">
                                                                <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform"/>
                                                            </div>
                                                        )}
                                                        <div className="p-4 flex flex-col flex-grow">
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mb-2">
                                                                <span className="flex items-center gap-1">{post.authorName}</span>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1">{post.createdAt}</span>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1">{post.views.toLocaleString()} views</span>
                                                            </div>
                                                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">{post.title}</h3>
                                                            <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 flex-grow mb-2">{post.excerpt}</p>
                                                            <div className="mt-auto flex items-center gap-1.5 text-sm text-emerald-400 font-medium"><span>Read More</span><ArrowRight className="w-4 h-4" /></div>
                                                        </div>
                                                    </article>
                                                </Link>
                                                {isAdmin && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <Link 
                                                            href={`/admin/edit-post/${post.id}`}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-1 text-xs text-cyan-300 bg-gray-800/50 hover:bg-cyan-500/10 rounded-md transition-colors"
                                                        >
                                                            <PenSquare size={12} /> Edit
                                                        </Link>
                                                        <button onClick={() => setDeleteConfirm(post.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1 text-xs text-red-400 bg-gray-800/50 hover:bg-red-500/10 rounded-md transition-colors">
                                                            <Trash2 size={12} /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Floating Action Button for Admins */}
            {isAdmin && (
                <Link
                    href="/blogs/new"
                    className="fixed bottom-8 right-8 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white p-4 rounded-full shadow-lg hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-400 transition-transform duration-300 z-40"
                    aria-label="Write a new blog post"
                >
                    <Plus size={24} />
                </Link>
            )}
            
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