"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { db } from "@/app/firebase/config";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { useAuth } from "@/app/context/AuthContext";
import {
  PenSquare,
  Trash2,
  AlertTriangle,
  BookOpen,
  Calendar,
  User,
  ArrowRight,
  Eye,
  Plus,
  Clock,
  Share2,
  Bookmark,
  ArrowLeft,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { processContentForEmbeds } from "@/app/lib/processContent";
import ReadingProgress from "@/app/components/ReadingProgress";
import ReactionBar from "@/app/components/ReactionBar";
const CommentSection = dynamic(
  () => import("@/app/components/CommentSection"),
  { ssr: false }
);
import SocialEmbedRenderer from "@/app/components/SocialEmbedRenderer";
import Footer from "@/app/components/Footer";

// Interfaces
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

interface SinglePost extends Omit<PostListItem, "createdAt" | "excerpt"> {
  content: string;
  createdAt: Date;
}

// Main Component
const BlogPage = () => {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string | undefined;

  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [post, setPost] = useState<SinglePost | null>(null);
  const [readingTime, setReadingTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const viewLoggedRef = useRef(false);

  // Fetch a single post or all posts
  useEffect(() => {
    if (slug) {
      setLoading(true);
      const fetchPost = async () => {
        const postsRef = collection(db, "posts");
        const q = query(postsRef, where("slug", "==", slug));

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (snapshot.empty) {
              setError(true);
              setLoading(false);
              return;
            }
            const docSnap = snapshot.docs[0];
            const data = docSnap.data();
            const createdAtTimestamp = data.createdAt as Timestamp;
            const processedContent = processContentForEmbeds(data.content);
            const wordCount = data.content
              .replace(/<[^>]*>/g, "")
              .split(/\s+/).length;
            const minutes = Math.ceil(wordCount / 200);

            setPost({
              id: docSnap.id,
              slug: data.slug,
              title: data.title,
              authorName: data.authorName,
              createdAt: createdAtTimestamp.toDate(),
              imageUrl: data.imageUrl || "",
              isFeatured: data.isFeatured || false,
              views: data.views || 0,
              content: processedContent,
            });
            setReadingTime(minutes);
            setLoading(false);
          },
          (err) => {
            console.error("Error fetching post:", err);
            setError(true);
            setLoading(false);
          }
        );
        return unsubscribe;
      };

let unsubscribe: (() => void) | undefined;

fetchPost().then((unsub) => {
  unsubscribe = unsub;
});

return () => {
  if (unsubscribe) unsubscribe();
};
    } else {
      const postsCollection = collection(db, "posts");
      const q = query(postsCollection, orderBy("createdAt", "desc"));

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const postsData = querySnapshot.docs
            .map((doc) => {
              const data = doc.data();
              if (!data.slug || !data.title || !data.createdAt || !data.content)
                return null;
              const createdAtTimestamp = data.createdAt as Timestamp;
              return {
                id: doc.id,
                slug: data.slug,
                title: data.title,
                authorName: data.authorName || "Anonymous",
                createdAt: createdAtTimestamp
                  .toDate()
                  .toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                excerpt:
                  data.content.substring(0, 150).replace(/<[^>]+>/g, "") + "...",
                imageUrl: data.imageUrl || "",
                isFeatured: data.isFeatured || false,
                views: data.views || 0,
              };
            })
            .filter((p): p is PostListItem => p !== null);

          setPosts(postsData);
          setLoading(false);
        },
        (err) => {
          console.error("Error fetching posts:", err);
          setError(true);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    }
  }, [slug]);

  // Log unique views
  useEffect(() => {
    const logView = async () => {
      if (post && !viewLoggedRef.current) {
        viewLoggedRef.current = true;
        try {
          const headers = new Headers();
          if (user) {
            const token = await user.getIdToken();
            headers.append("Authorization", `Bearer ${token}`);
          }

          const response = await fetch(`/api/posts/${post.id}/view`, {
            method: "POST",
            headers,
          });
          if (!response.ok) throw new Error(`API failed: ${response.status}`);
        } catch (err) {
          console.error("View logging failed:", err);
          viewLoggedRef.current = false;
        }
      }
    };
    logView();
  }, [post, user]);

  // Handlers
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
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!response.ok) throw new Error("Failed to delete post.");
      setDeleteConfirm(null);
      if (slug && post?.id === postId) router.push("/blogs");
    } catch (err) {
      console.error("Delete Post Error:", err);
    }
  };

  // Loading & error states
  if (loading)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white text-center p-8">
        <div className="w-20 h-20 mb-6 flex items-center justify-center rounded-full bg-red-500/10 text-4xl">
          🔍
        </div>
        <h1 className="text-4xl font-bold text-red-400 mb-2">
          Story Not Found
        </h1>
        <p className="text-gray-400 mb-6">
          The blog post you&apos;re looking for doesn&apos;t exist or was
          removed.
        </p>
        <button
          onClick={() => router.push("/blogs")}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Blogs
        </button>
      </div>
    );

  // Single Post View
  if (slug && post) {
    return (
      <>
        <ReadingProgress />
        <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white">
          <header className="sticky top-0 z-40 backdrop-blur-lg bg-black/70 border-b border-gray-800">
            <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
              <button
                onClick={() => router.push("/blogs")}
                className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">All Stories</span>
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                  aria-label="Share post"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                  aria-label="Bookmark post"
                >
                  <Bookmark className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          <main className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h1 className="text-5xl font-extrabold mb-6 bg-gradient-to-r from-white via-emerald-200 to-cyan-200 bg-clip-text text-transparent">
              {post.title}
            </h1>
            <div className="flex justify-center gap-6 text-sm text-gray-400 mb-10">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4 text-emerald-500" /> {post.authorName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-emerald-500" />{" "}
                {post.createdAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-emerald-500" /> {readingTime} min
                read
              </span>
            </div>

            <div className="prose prose-invert prose-emerald mx-auto leading-relaxed text-gray-200 text-left">
              <SocialEmbedRenderer content={post.content} />
            </div>

            <div className="mt-20 pt-12 border-t border-gray-800/50">
              <CommentSection contentId={post.id} contentType="blog" />
            </div>
          </main>
        </div>
      </>
    );
  }

  // Blog List View
  const topStory = posts.find((p) => p.isFeatured) || posts[0];
  const otherStories = posts.filter((p) => p.id !== topStory?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      <main className="relative pt-20 pb-4 max-w-7xl mx-auto px-6">
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-10 h-10 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Stories Yet</h2>
            <p className="text-gray-400">
              Be the first to share an amazing story with our community!
            </p>
          </div>
        ) : (
          <>
            {topStory && (
              <section className="mb-10">
                <h2 className="text-xs font-semibold text-yellow-300 mb-3 uppercase tracking-wider">
                  Featured Story
                </h2>
                <Link
                  href={`/blogs/${topStory.slug}`}
                  className="group block rounded-xl overflow-hidden border border-gray-700 hover:border-emerald-500/30 transition"
                >
                  {topStory.imageUrl && (
                    <img
                      src={topStory.imageUrl}
                      alt={topStory.title}
                      className="w-full object-cover h-60 sm:h-80 group-hover:scale-105 transition-transform duration-700"
                    />
                  )}
                  <div className="p-6 bg-gradient-to-b from-gray-900/90 via-black/70 to-black">
                    <h3 className="text-2xl font-bold mb-2 group-hover:text-emerald-400 transition">
                      {topStory.title}
                    </h3>
                    <p className="text-gray-400 mb-3 line-clamp-2">
                      {topStory.excerpt}
                    </p>
                    <div className="flex items-center gap-1 text-emerald-400 text-sm">
                      Read Story <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>

                {isAdmin && (
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/admin/edit-post/${topStory.id}`}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10 rounded-md transition"
                    >
                      <PenSquare size={12} /> Edit
                    </Link>
                    <button
                      onClick={() => setDeleteConfirm(topStory.id)}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </section>
            )}

            <section>
              <h2 className="text-xs font-semibold text-emerald-300 mb-3 uppercase tracking-wider">
                Latest Stories
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherStories.map((p) => (
                  <div key={p.id} className="flex flex-col">
                    <Link
                      href={`/blogs/${p.slug}`}
                      className="group block flex-grow rounded-xl overflow-hidden border border-gray-700 hover:border-emerald-500/30 transition"
                    >
                      {p.imageUrl && (
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="h-40 w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                      <div className="p-4 flex flex-col flex-grow">
                        <h3 className="text-lg font-bold mb-2 group-hover:text-emerald-400 transition">
                          {p.title}
                        </h3>
                        <p className="text-sm text-gray-400 flex-grow line-clamp-2 mb-2">
                          {p.excerpt}
                        </p>
                        <div className="text-sm text-emerald-400 flex items-center gap-1">
                          Read More <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </Link>

                    {isAdmin && (
                      <div className="mt-2 flex items-center gap-2">
                        <Link
                          href={`/admin/edit-post/${p.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1 text-xs text-cyan-300 bg-gray-800/50 hover:bg-cyan-500/10 rounded-md transition"
                        >
                          <PenSquare size={12} /> Edit
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1 text-xs text-red-400 bg-gray-800/50 hover:bg-red-500/10 rounded-md transition"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {isAdmin && (
        <Link
          href="/blogs/new"
          className="fixed bottom-8 right-8 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform z-40"
          aria-label="Write a new blog post"
        >
          <Plus size={24} />
        </Link>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-2">Delete Story?</h3>
            <p className="text-gray-400 text-sm mb-4">
              This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePost(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md text-sm"
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
