"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { db } from "@/app/firebase/config";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  Timestamp, // Import Timestamp for type safety
  increment, // Import increment for robust updates
} from "firebase/firestore";
import { ThumbsUp } from "lucide-react";
import Image from "next/image";

// Define a more specific type for comments
interface Comment {
  id: string;
  text: string;
  userId: string;
  userName?: string;
  userPhotoURL?: string | null;
  createdAt: Timestamp | null; // Use Timestamp type from Firestore
  likes?: number;
}

interface CommentSectionProps {
  contentId: string;
  contentType: "video" | "blog";
}

export default function CommentSection({
  contentId,
  contentType,
}: CommentSectionProps) {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const baseCollection =
    contentType === "video"
      ? `videos/${contentId}/comments`
      : `blogs/${contentId}/comments`;

  useEffect(() => {
    const q = query(collection(db, baseCollection), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];
      setComments(commentData);
    });

    return () => unsubscribe();
  }, [baseCollection]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to comment.");
      return;
    }
    if (!commentText.trim()) return;

    try {
      setLoading(true);
      setError(null); // Clear previous errors
      await addDoc(collection(db, baseCollection), {
        text: commentText.trim(),
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        userPhotoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        likes: 0,
      });
      setCommentText("");
    } catch (err) {
      console.error(err);
      setError("Failed to post comment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id: string) => {
    if (likedComments.has(id) || !user) return; // Prevent multiple likes or liking when logged out
    setLikedComments((prev) => new Set(prev.add(id)));

    const commentRef = doc(db, baseCollection, id);
    // Use Firestore's atomic increment to prevent race conditions
    await updateDoc(commentRef, {
      likes: increment(1),
    });
  };

  // Use the specific Timestamp type for the function parameter
  const formatTimestamp = (timestamp: Timestamp | null) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate();
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const UserAvatar = ({
    src,
    alt,
    size = 40,
  }: {
    src: string | null | undefined;
    alt?: string;
    size?: number;
  }) => (
    <div
      className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-gray-800 border border-gray-700"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt || "User"}
          width={size}
          height={size}
          className="object-cover"
        />
      ) : (
        <span className="text-gray-400 text-sm">👤</span>
      )}
    </div>
  );

  return (
    <div className="mt-10 text-white">
      {/* The style jsx block remains unchanged */}
      <style jsx>{`
        /* ... your styles ... */
      `}</style>

      <div className="comment-section rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-6 text-white capitalize">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"} on{" "}
          {contentType === "video" ? "this video" : "this post"}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="flex items-start mb-8 gap-3 bg-black/30 p-4 rounded-xl border border-gray-800"
        >
          <UserAvatar src={user?.photoURL} alt={user?.displayName || "User"} />
          <div className="flex-1 w-full">
            <input
              type="text"
              className="w-full bg-black/70 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-emerald-500 focus:outline-none placeholder-gray-500"
              placeholder={user ? "Add a comment..." : "Sign in to comment"}
              value={commentText}
              disabled={!user || loading}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={500}
            />

            {/* ✅ FIX: Display the error message to the user */}
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            {commentText.trim() && (
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setCommentText("")}
                  className="px-4 py-2 text-gray-300 hover:text-white transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 px-5 py-2 rounded-lg text-white font-medium shadow-sm transition disabled:opacity-50"
                >
                  {loading ? "Posting..." : "Comment"}
                </button>
              </div>
            )}
          </div>
        </form>

        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="comment-item p-4 rounded-xl flex flex-col gap-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={comment.userPhotoURL}
                    alt={comment.userName || "User"}
                    size={36}
                  />
                  <div>
                    <p className="font-semibold">{comment.userName || "User"}</p>
                    <p className="text-xs text-gray-400">
                      {formatTimestamp(comment.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  className={`like-button px-2 py-1 rounded-md text-sm flex items-center gap-1 ${
                    likedComments.has(comment.id)
                      ? "liked cursor-default"
                      : "hover:bg-gray-700"
                  }`}
                  onClick={() => handleLike(comment.id)}
                  disabled={likedComments.has(comment.id) || !user}
                >
                  <ThumbsUp className="w-4 h-4" /> {comment.likes || 0}
                </button>
              </div>
              <p className="text-gray-300 leading-relaxed break-words pl-12">
                {comment.text}
              </p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-gray-500 text-center py-6">
              Be the first to comment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}