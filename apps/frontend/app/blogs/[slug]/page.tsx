"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { doc, onSnapshot, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { CalendarDays, ArrowLeft, Clock, User, Share2, Bookmark, Eye } from "lucide-react";
import dynamic from "next/dynamic";
import { processContentForEmbeds } from "@/app/lib/processContent";
import ReadingProgress from "@/app/components/ReadingProgress";
import ReactionBar from "@/app/components/ReactionBar";
import { useAuth } from "@/app/context/AuthContext";

// Dynamic import with no SSR for comment section
const CommentSection = dynamic(() => import("@/app/components/CommentSection"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
    </div>
  ),
});

// Import SocialEmbedRenderer directly (no dynamic import for faster loading)
import SocialEmbedRenderer from "@/app/components/SocialEmbedRenderer";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: Date;
  slug: string;
  imageUrl?: string;
  views: number;
}

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const slug = params?.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [shareSuccess, setShareSuccess] = useState(false);
  
  const viewLoggedRef = useRef(false);
  const postIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Calculate reading time from word count
  const calculateReadingTime = useCallback((content: string): number => {
    if (!content) return 0;
    try {
      const text = content.replace(/<[^>]*>/g, " ");
      const words = text.trim().split(/\s+/);
      const wordCount = words.filter(word => word.length > 0).length;
      return Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute
    } catch (error) {
      console.error("Error calculating reading time:", error);
      return 1;
    }
  }, []);

  // Fetch post by slug and set up real-time listener
  useEffect(() => {
    if (!slug) {
      console.error("❌ No slug provided");
      setError(true);
      setLoading(false);
      return;
    }

    console.log("🔍 Fetching post with slug:", slug);

    const fetchAndListenToPost = async () => {
      try {
        // Query to find post by slug
        const postsRef = collection(db, "posts");
        const q = query(postsRef, where("slug", "==", slug));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.error("❌ No post found with slug:", slug);
          setError(true);
          setLoading(false);
          return;
        }

        const docSnap = querySnapshot.docs[0];
        const postId = docSnap.id;
        postIdRef.current = postId;

        console.log("✅ Found post with ID:", postId);

        // Set up real-time listener
        const postDocRef = doc(db, "posts", postId);
        const unsubscribe = onSnapshot(
          postDocRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              console.error("❌ Post no longer exists");
              setError(true);
              setLoading(false);
              return;
            }

            try {
              const data = snapshot.data();
              
              if (!data) {
                throw new Error("No data in document");
              }

              // Process content for embeds
              const processedContent = processContentForEmbeds(data.content || "");
              
              // Calculate reading time
              const minutes = calculateReadingTime(data.content || "");

              // Handle createdAt timestamp
              let createdAtDate: Date;
              if (data.createdAt instanceof Timestamp) {
                createdAtDate = data.createdAt.toDate();
              } else if (data.createdAt?.toDate) {
                createdAtDate = data.createdAt.toDate();
              } else {
                createdAtDate = new Date();
              }

              const postData: BlogPost = {
                id: snapshot.id,
                title: data.title || "Untitled",
                content: processedContent,
                authorName: data.authorName || "Anonymous",
                createdAt: createdAtDate,
                slug: data.slug || slug,
                imageUrl: data.imageUrl,
                views: typeof data.views === "number" ? data.views : 0,
              };

              console.log("📄 Post data updated. Views:", postData.views);

              setPost(postData);
              setReadingTime(minutes);
              setLoading(false);
            } catch (processingError) {
              console.error("❌ Error processing post data:", processingError);
              setError(true);
              setLoading(false);
            }
          },
          (err) => {
            console.error("❌ Error in real-time listener:", err);
            setError(true);
            setLoading(false);
          }
        );

        unsubscribeRef.current = unsubscribe;
      } catch (err) {
        console.error("❌ Error fetching post:", err);
        setError(true);
        setLoading(false);
      }
    };

    fetchAndListenToPost();

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        console.log("🧹 Cleaning up real-time listener");
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [slug, calculateReadingTime]);

  // Log view when post loads
  useEffect(() => {
    const logView = async () => {
      const currentPostId = postIdRef.current;
      if (!currentPostId || viewLoggedRef.current) {
        return;
      }

      viewLoggedRef.current = true;
      console.log("🎯 Logging view for post:", currentPostId);

      try {
        const headers = new Headers({
          "Content-Type": "application/json",
        });

        if (user) {
          const token = await user.getIdToken();
          headers.append("Authorization", `Bearer ${token}`);
          console.log("🔐 Authenticated view logged");
        } else {
          console.log("👤 Anonymous view logged");
        }

        const response = await fetch(`/api/posts/${currentPostId}/view`, {
          method: "POST",
          headers: headers,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log("✅ View logged successfully:", data.message);
      } catch (err) {
        viewLoggedRef.current = false;
        console.error("❌ Failed to log view:", err);
      }
    };

    if (postIdRef.current && !loading) {
      // Small delay to ensure everything is loaded
      const timer = setTimeout(logView, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, loading]);

  // Handle share functionality
  const handleShare = useCallback(async () => {
    try {
      if (navigator.share && post) {
        await navigator.share({
          title: post.title,
          text: `Check out: ${post.title}`,
          url: window.location.href,
        });
        console.log("✅ Shared via Web Share API");
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
        console.log("✅ Link copied to clipboard");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Share error:", err);
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(window.location.href);
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
        } catch (clipboardErr) {
          console.error("Clipboard error:", clipboardErr);
        }
      }
    }
  }, [post]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin"></div>
          </div>
          <p className="text-gray-400 text-lg animate-pulse">Loading your story...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <div className="text-5xl">📭</div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
            Story Not Found
          </h1>
          <p className="text-gray-400 text-lg">
            The blog post you&apos;re looking for seems to have wandered off into the digital void.
          </p>
          <button
            onClick={() => router.push("/blogs")}
            className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/50"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to All Stories
          </button>
        </div>
      </div>
    );
  }

  // Main Content
  return (
    <>
      <ReadingProgress />

      <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 backdrop-blur-lg bg-black/70 border-b border-gray-800 transition-all duration-300">
          <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
            <button
              onClick={() => router.push("/blogs")}
              className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Back to all stories"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">All Stories</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="relative p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                aria-label="Share post"
              >
                <Share2 className="w-5 h-5" />
                {shareSuccess && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Copied!
                  </span>
                )}
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

        {/* Hero Section */}
        <section className="relative">
          {post.imageUrl ? (
            <div className="relative w-full h-[55vh] md:h-[65vh] overflow-hidden">
              <Image
    src={post.imageUrl}
    alt={post.title}
    fill
    className="object-cover object-top"
    priority
    sizes="100vw"
  />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6 md:p-12">
                <div className="max-w-4xl mx-auto text-center">
                  <h1 className="text-4xl md:text-6xl font-extrabold leading-tight drop-shadow-2xl">
                    <span className="bg-gradient-to-r from-white via-emerald-200 to-cyan-200 bg-clip-text text-transparent">
                      {post.title}
                    </span>
                  </h1>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-emerald-950/30 via-black to-cyan-950/30 py-32 text-center">
              <div className="max-w-4xl mx-auto px-6">
                <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
                  <span className="bg-gradient-to-r from-white via-emerald-200 to-cyan-200 bg-clip-text text-transparent">
                    {post.title}
                  </span>
                </h1>
              </div>
            </div>
          )}
        </section>

        {/* Blog Content */}
        <main className="max-w-3xl mx-auto px-6 md:px-8 py-16">
          {/* Meta Info */}
          <div className="flex flex-wrap items-center justify-center gap-6 pb-10 mb-10 text-center border-b border-gray-800/50">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-500">Written by</p>
                <p className="font-medium text-white">{post.authorName}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-500" />
                <span>
                  {post.createdAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <span className="text-gray-700">•</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>{readingTime} min read</span>
              </div>
              <span className="text-gray-700">•</span>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-500" />
                <span>{post.views.toLocaleString()} views</span>
              </div>
            </div>
          </div>

          {/* Reaction Bar */}
          <div className="flex justify-center mb-16 border-y border-gray-800/50 py-8">
            <ReactionBar postId={post.id} collectionName="posts" />
          </div>

          {/* Article Content */}
          <article className="prose prose-invert prose-emerald mx-auto text-center leading-relaxed text-gray-200">
            <SocialEmbedRenderer content={post.content} />
          </article>

          {/* Share CTA */}
          <div className="mt-20 pt-12 border-t border-gray-800/50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 border border-emerald-500/20 text-center md:text-left">
              <div>
                <h3 className="text-xl font-semibold mb-1">Enjoyed this post?</h3>
                <p className="text-gray-400">Share it with your network 🌟</p>
              </div>
              <button
                onClick={handleShare}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/50 flex items-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="mt-20 pt-12 border-t border-gray-800/50">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Join the Discussion
              </h2>
              <p className="text-gray-400">
                Share your thoughts and engage with our community
              </p>
            </div>
            <CommentSection contentId={post.id} contentType="blog" />
          </div>
        </main>
      </div>
    </>
  );
}