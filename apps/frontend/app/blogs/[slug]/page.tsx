"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { CalendarDays, ArrowLeft, Clock, User, Share2, Bookmark, Eye } from "lucide-react";
import dynamic from "next/dynamic";
import { processContentForEmbeds } from "@/app/lib/processContent";
import ReadingProgress from "@/app/components/ReadingProgress";
import ReactionBar from "@/app/components/ReactionBar";
import { useAuth } from "@/app/context/AuthContext";

const CommentSection = dynamic(() => import("@/app/components/CommentSection"), {
  ssr: false,
});
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
  
  const viewLoggedRef = useRef(false);
  const postIdRef = useRef<string | null>(null);

  // Fetch post with real-time updates
  useEffect(() => {
    if (!slug) return;

    console.log('🔍 Fetching post with slug:', slug);
    
    // Query to find post by slug
    const fetchPostBySlug = async () => {
      try {
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const postsRef = collection(db, "posts");
        const q = query(postsRef, where("slug", "==", slug));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.error('❌ No post found with slug:', slug);
          setError(true);
          setLoading(false);
          return null;
        }

        const docSnap = querySnapshot.docs[0];
        console.log('✅ Found post:', docSnap.id);
        return docSnap.id;
      } catch (err) {
        console.error("Error finding post:", err);
        setError(true);
        setLoading(false);
        return null;
      }
    };

    const setupListener = async () => {
      const postId = await fetchPostBySlug();
      if (!postId) return;

      postIdRef.current = postId;

      // Set up real-time listener on the document
      const postDocRef = doc(db, "posts", postId);
      const unsubscribe = onSnapshot(
        postDocRef,
        (docSnap) => {
          if (!docSnap.exists()) {
            console.error('❌ Post document no longer exists');
            setError(true);
            setLoading(false);
            return;
          }

          const data = docSnap.data();
          const createdAtTimestamp = data.createdAt as Timestamp;
          const processedContent = processContentForEmbeds(data.content);
          const wordCount = data.content.replace(/<[^>]*>/g, "").split(/\s+/).length;
          const minutes = Math.ceil(wordCount / 200);

          console.log('📄 Post data updated. Views:', data.views || 0);

          setPost({
            id: docSnap.id,
            title: data.title,
            content: processedContent,
            authorName: data.authorName,
            createdAt: createdAtTimestamp.toDate(),
            slug: data.slug,
            imageUrl: data.imageUrl,
            views: data.views || 0,
          });
          setReadingTime(minutes);
          setLoading(false);
        },
        (err) => {
          console.error("Error in real-time listener:", err);
          setError(true);
          setLoading(false);
        }
      );

      return unsubscribe;
    };

    const unsubscribePromise = setupListener();
    return () => {
      unsubscribePromise.then((unsub) => {
        if (unsub) unsub();
      });
    };
  }, [slug]);

  // Log view when post loads
  useEffect(() => {
    const logView = async () => {
      if (!postIdRef.current || viewLoggedRef.current) return;
      
      viewLoggedRef.current = true;
      console.log('🎯 Attempting to log view for post:', postIdRef.current);
      
      try {
        const headers = new Headers();
        if (user) {
          const token = await user.getIdToken();
          headers.append('Authorization', `Bearer ${token}`);
          console.log('🔑 Token added to request');
        } else {
          console.log('👤 No user - logging anonymous view');
        }
        
        const response = await fetch(`/api/posts/${postIdRef.current}/view`, {
          method: 'POST',
          headers: headers,
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ View logged successfully:', data.message);

      } catch (err) {
        viewLoggedRef.current = false;
        console.error("❌ Failed to log view:", err);
      }
    };

    // Only log view after we have the post ID
    if (postIdRef.current) {
      logView();
    }
  }, [postIdRef.current, user]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          url: window.location.href,
        });
      } catch {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin"></div>
          </div>
          <p className="text-gray-400 text-sm">Loading your story...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <div className="text-5xl">🔍</div>
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
            Back to Blogs
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ReadingProgress />

      <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white">
        {/* Header */}
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

        {/* Hero Section */}
        <section className="relative">
          {post.imageUrl ? (
            <div className="relative w-full h-[55vh] md:h-[65vh] overflow-hidden">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-full object-cover scale-105 animate-fade-in"
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
              <h1 className="text-5xl font-extrabold">
                <span className="bg-gradient-to-r from-white via-emerald-200 to-cyan-200 bg-clip-text text-transparent">
                  {post.title}
                </span>
              </h1>
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
              <div>
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

          {/* Article */}
          <article
            className="prose prose-invert prose-emerald mx-auto text-center leading-relaxed text-gray-200 
              prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-[1.15rem] 
              prose-headings:text-white prose-h2:mt-12 prose-h2:text-3xl prose-h2:font-semibold 
              prose-img:rounded-xl prose-img:mx-auto prose-img:shadow-xl"
          >
            <SocialEmbedRenderer content={post.content} />
          </article>

          {/* Share */}
          <div className="mt-20 pt-12 border-t border-gray-800/50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 border border-emerald-500/20 text-center md:text-left">
              <div>
                <h3 className="text-xl font-semibold mb-1">Enjoyed this post?</h3>
                <p className="text-gray-400">Share it with your network 🌐</p>
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

          {/* Comments */}
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