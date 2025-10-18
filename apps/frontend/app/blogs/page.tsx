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

  // Fetch post(s)
  useEffect(() => {
    if (slug) {
      setLoading(true);
      const fetchPost = () => {
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
      const unsubscribe = fetchPost();
      return () => unsubscribe();
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

  // Log unique view
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
            headers: headers,
          });
          if (!response.ok)
            throw new Error(`API call failed with status: ${response.status}`);
        } catch (err) {
          viewLoggedRef.current = false;
          console.error("Failed to log view:", err);
        }
      }
    };
    logView();
  }, [post, user]);

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

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white text-center p-6 bg-black">
        <div className="w-24 h-24 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-5xl">
          🔍
        </div>
        <h1 className="text-4xl font-bold mt-6">Story Not Found</h1>
        <p className="text-gray-400 text-lg mt-2">
          The blog post you&apos;re looking for seems to have wandered off.
        </p>
        <button
          onClick={() => router.push("/blogs")}
          className="group mt-6 inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl font-medium hover:scale-105 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />{" "}
          Back to Blogs
        </button>
      </div>
    );

  // --- Single Post View ---
  if (slug && post)
    return (
      <>
        <ReadingProgress />
        <div className="min-h-screen bg-black text-white">
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
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50"
                  aria-label="Share post"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50"
                  aria-label="Bookmark post"
                >
                  <Bookmark className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          <main className="max-w-3xl mx-auto px-6 py-16">
            <h1 className="text-4xl md:text-6xl font-extrabold text-center mb-8 bg-gradient-to-r from-white via-emerald-200 to-cyan-200 bg-clip-text text-transparent">
              {post.title}
            </h1>

            <div className="flex justify-center text-gray-400 gap-4 text-sm mb-12">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-500" />
                <span>{post.authorName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span>
                  {post.createdAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>{readingTime} min read</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-500" />
                <span>{post.views.toLocaleString()} views</span>
              </div>
            </div>

            <div className="prose prose-invert prose-emerald text-center leading-relaxed text-gray-200 prose-p:text-[1.2rem] prose-p:leading-relaxed prose-h2:text-3xl prose-h2:font-semibold">
              <SocialEmbedRenderer content={post.content} />
            </div>

            <div className="mt-16 border-t border-gray-800/50 pt-12">
              <ReactionBar postId={post.id} collectionName="posts" />
              <CommentSection contentId={post.id} contentType="blog" />
            </div>
          </main>
        </div>
      </>
    );

  // --- Blog List View ---
  const topStory = posts.find((p) => p.isFeatured) || posts[0];
  const otherStories = posts.filter((p) => p.id !== topStory?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      <main className="max-w-7xl mx-auto px-4 py-20">
        {posts.length === 0 ? (
          <div className="text-center">
            <BookOpen className="w-10 h-10 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold">No Stories Yet</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Be the first to share an amazing story with our community!
            </p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {topStory && (
              <section className="mb-10">
                <h2 className="text-xs font-semibold text-yellow-300 uppercase tracking-wider mb-3">
                  Featured Story
                </h2>
                <Link
                  href={`/blogs/${topStory.slug}`}
                  className="block rounded-xl border border-gray-700/50 hover:border-emerald-500/30 overflow-hidden group"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    {topStory.imageUrl && (
                      <img
                        src={topStory.imageUrl}
                        alt={topStory.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                    <div className="absolute bottom-0 p-6">
                      <h3 className="text-3xl font-bold group-hover:text-emerald-400 transition-colors">
                        {topStory.title}
                      </h3>
                      <p className="text-gray-400 mt-2 line-clamp-2">
                        {topStory.excerpt}
                      </p>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Latest */}
            {otherStories.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                  Latest Stories
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherStories.map((p) => (
                    <Link
                      href={`/blogs/${p.slug}`}
                      key={p.id}
                      className="block rounded-xl bg-gray-800/30 border border-gray-700/50 hover:border-emerald-500/30 overflow-hidden group"
                    >
                      {p.imageUrl && (
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-full h-40 object-cover group-hover:scale-110 transition-transform"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="text-lg font-bold mb-1 group-hover:text-emerald-400 transition-colors">
                          {p.title}
                        </h3>
                        <p className="text-gray-400 text-sm line-clamp-2">
                          {p.excerpt}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">
              Delete Story?
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePost(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md font-medium text-sm"
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
