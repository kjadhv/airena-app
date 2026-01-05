"use client";

import React, { useState, useEffect, FormEvent, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import UserAvatar from "@/app/components/UserAvatar";
import { db } from "@/app/firebase/config";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  Timestamp,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { ThumbsUp, ThumbsDown, MoreVertical, Edit2, Trash2 } from "lucide-react";
import Image from "next/image";

// Import notification functions
// ...existing code...
import { sendNewCommentNotification, sendReplyNotification } from "@/app/utils/notifications/commentNotifications";
import { sendCommentLikeNotification } from "@/app/utils/notifications/reactionNotifications";
// ...existing code...
interface Comment {
  id: string;
  text: string;
  userId: string;
  userName?: string;
  userPhotoURL?: string | null;
  createdAt: Timestamp | null;
  likes?: number;
  dislikes?: number;
  contentOwnerId?: string;
  contentTitle?: string;
  replyToUserId?: string;
  replyToUserName?: string;
  replyToCommentId?: string;
}

interface CommentSectionProps {
  contentId: string;
  contentType: "video" | "blog" | "post";
  contentOwnerId?: string;
  contentTitle?: string;
}

export default function CommentSection({
  contentId,
  contentType,
  contentOwnerId,
  contentTitle,
}: CommentSectionProps) {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [dislikedComments, setDislikedComments] = useState<Set<string>>(new Set());
  const [commentLikeCounts, setCommentLikeCounts] = useState<Record<string, number>>({});
  const [commentDislikeCounts, setCommentDislikeCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const baseCollection =
    contentType === "video"
      ? `videos/${contentId}/comments`
      : contentType === "blog"
      ? `blogs/${contentId}/comments`
      : `posts/${contentId}/comments`;

  // Check if user is superadmin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setIsSuperAdmin(userDoc.data()?.role === "superadmin");
        }
      } catch (error) {
        console.error("Error checking superadmin status:", error);
      }
    };
    checkSuperAdmin();
  }, [user]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load comments
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

  // Load user's liked/disliked comments and counts
  useEffect(() => {
    if (!user) return;

    const loadReactionsData = async () => {
      const userLikes = new Set<string>();
      const userDislikes = new Set<string>();
      const likeCounts: Record<string, number> = {};
      const dislikeCounts: Record<string, number> = {};

      for (const comment of comments) {
        // Check if user has reacted to this comment
        const reactionRef = doc(db, `${baseCollection}/${comment.id}/reactions`, user.uid);
        const reactionDoc = await getDoc(reactionRef);
        if (reactionDoc.exists()) {
          const reactionType = reactionDoc.data()?.type;
          if (reactionType === "like") {
            userLikes.add(comment.id);
          } else if (reactionType === "dislike") {
            userDislikes.add(comment.id);
          }
        }

        // Count total likes and dislikes for this comment
        const reactionsQuery = query(collection(db, `${baseCollection}/${comment.id}/reactions`));
        const reactionsSnapshot = await getDocs(reactionsQuery);
        let likes = 0;
        let dislikes = 0;
        reactionsSnapshot.forEach((doc) => {
          if (doc.data()?.type === "like") likes++;
          if (doc.data()?.type === "dislike") dislikes++;
        });
        likeCounts[comment.id] = likes;
        dislikeCounts[comment.id] = dislikes;
      }

      setLikedComments(userLikes);
      setDislikedComments(userDislikes);
      setCommentLikeCounts(likeCounts);
      setCommentDislikeCounts(dislikeCounts);
    };

    loadReactionsData();
  }, [comments, user, baseCollection]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to comment.");
      return;
    }
    if (!commentText.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const commentData: any = {
        text: commentText.trim(),
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        userPhotoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        likes: 0,
      };

      if (contentOwnerId) {
        commentData.contentOwnerId = contentOwnerId;
      }
      if (contentTitle) {
        commentData.contentTitle = contentTitle;
      }

      await addDoc(collection(db, baseCollection), commentData);

      // Send notification to content owner (if not commenting on own content)
      if (contentOwnerId && contentOwnerId !== user.uid) {
        await sendNewCommentNotification({
          recipientId: contentOwnerId,
          senderName: user.displayName || "Someone",
          senderPhotoURL: user.photoURL,
          commentText: commentText.trim(),
          contentType,
          contentId,
        });
      }

      setCommentText("");
    } catch (err) {
      console.error("❌ Error posting comment:", err);
      setError("Failed to post comment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReplySubmit = async (commentId: string, commentData: Comment) => {
    if (!user || !replyText.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const replyData: any = {
        text: replyText.trim(),
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        userPhotoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        likes: 0,
        replyToUserId: commentData.userId,
        replyToUserName: commentData.userName,
        replyToCommentId: commentId,
      };

      if (contentOwnerId) {
        replyData.contentOwnerId = contentOwnerId;
      }
      if (contentTitle) {
        replyData.contentTitle = contentTitle;
      }

      await addDoc(collection(db, baseCollection), replyData);

      // Notify the comment author about the reply (if not replying to self)
      if (user.uid !== commentData.userId) {
        await sendReplyNotification({
          recipientId: commentData.userId,
          senderName: user.displayName || "Someone",
          senderPhotoURL: user.photoURL,
          commentText: replyText.trim(),
          contentType,
          contentId,
        });
      }

      setReplyText("");
      setReplyingTo(null);
    } catch (err) {
      console.error("❌ Error posting reply:", err);
      setError("Failed to post reply. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (commentId: string, commentData: Comment, reactionType: "like" | "dislike") => {
    if (!user) return;

    const isLiked = likedComments.has(commentId);
    const isDisliked = dislikedComments.has(commentId);
    const isSameReaction = (reactionType === "like" && isLiked) || (reactionType === "dislike" && isDisliked);

    try {
      const reactionRef = doc(db, `${baseCollection}/${commentId}/reactions`, user.uid);

      if (isSameReaction) {
        // Remove reaction
        await deleteDoc(reactionRef);
        if (reactionType === "like") {
          setLikedComments((prev) => {
            const next = new Set(prev);
            next.delete(commentId);
            return next;
          });
          setCommentLikeCounts((prev) => ({
            ...prev,
            [commentId]: Math.max(0, (prev[commentId] || 0) - 1),
          }));
        } else {
          setDislikedComments((prev) => {
            const next = new Set(prev);
            next.delete(commentId);
            return next;
          });
          setCommentDislikeCounts((prev) => ({
            ...prev,
            [commentId]: Math.max(0, (prev[commentId] || 0) - 1),
          }));
        }
      } else {
        // Add or change reaction
        const wasLiked = isLiked;
        const wasDisliked = isDisliked;

        await setDoc(reactionRef, {
          userId: user.uid,
          userName: user.displayName || "Anonymous",
          createdAt: serverTimestamp(),
          type: reactionType,
        });

        if (reactionType === "like") {
          setLikedComments((prev) => new Set([...prev, commentId]));
          setCommentLikeCounts((prev) => ({
            ...prev,
            [commentId]: (prev[commentId] || 0) + 1,
          }));
          if (wasDisliked) {
            setDislikedComments((prev) => {
              const next = new Set(prev);
              next.delete(commentId);
              return next;
            });
            setCommentDislikeCounts((prev) => ({
              ...prev,
              [commentId]: Math.max(0, (prev[commentId] || 0) - 1),
            }));
          }

          // Notify on like (not dislike, and not liking own comment)
          if (user.uid !== commentData.userId && !wasLiked) {
            await sendCommentLikeNotification({
              recipientId: commentData.userId,
              senderName: user.displayName || "Someone",
              senderPhotoURL: user.photoURL,
              commentText: commentData.text,
              contentType,
              contentId,
            });
          }
        } else {
          setDislikedComments((prev) => new Set([...prev, commentId]));
          setCommentDislikeCounts((prev) => ({
            ...prev,
            [commentId]: (prev[commentId] || 0) + 1,
          }));
          if (wasLiked) {
            setLikedComments((prev) => {
              const next = new Set(prev);
              next.delete(commentId);
              return next;
            });
            setCommentLikeCounts((prev) => ({
              ...prev,
              [commentId]: Math.max(0, (prev[commentId] || 0) - 1),
            }));
          }
        }
      }
    } catch (error) {
      console.error("❌ Error toggling reaction:", error);
      setError("Failed to update reaction. Please try again.");
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      setLoading(true);
      const commentRef = doc(db, baseCollection, commentId);
      await updateDoc(commentRef, {
        text: editText.trim(),
        editedAt: serverTimestamp(),
      });
      setEditingCommentId(null);
      setEditText("");
      setOpenMenuId(null);
    } catch (error) {
      console.error("❌ Error editing comment:", error);
      setError("Failed to edit comment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      setLoading(true);
      
      // Delete all reactions for this comment
      const reactionsQuery = query(collection(db, `${baseCollection}/${commentId}/reactions`));
      const reactionsSnapshot = await getDocs(reactionsQuery);
      await Promise.all(reactionsSnapshot.docs.map((doc) => deleteDoc(doc.ref)));

      // Delete all replies to this comment
      const replies = comments.filter((c) => c.replyToCommentId === commentId);
      for (const reply of replies) {
        const replyReactionsQuery = query(collection(db, `${baseCollection}/${reply.id}/reactions`));
        const replyReactionsSnapshot = await getDocs(replyReactionsQuery);
        await Promise.all(replyReactionsSnapshot.docs.map((doc) => deleteDoc(doc.ref)));
        await deleteDoc(doc(db, baseCollection, reply.id));
      }

      // Delete the comment itself
      await deleteDoc(doc(db, baseCollection, commentId));
      setOpenMenuId(null);
    } catch (error) {
      console.error("❌ Error deleting comment:", error);
      setError("Failed to delete comment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canEditOrDelete = (comment: Comment) => {
    if (!user) return false;
    return user.uid === comment.userId || isSuperAdmin;
  };

  const formatTimestamp = (timestamp: Timestamp | null) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const getReplies = (commentId: string) => {
    return comments.filter((c) => c.replyToCommentId === commentId);
  };

  const getTopLevelComments = () => {
    return comments.filter((c) => !c.replyToCommentId);
  };

  return (
    <div className="mt-10 text-white">
      <style jsx>{`
        .comment-section {
          background: linear-gradient(135deg, rgba(16, 16, 16, 0.8), rgba(24, 24, 24, 0.6));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .comment-item {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s;
        }

        .comment-item:hover {
          background: rgba(0, 0, 0, 0.5);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .reaction-button {
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.2s;
        }

        .reaction-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
        }

        .reaction-button.liked {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .reaction-button.disliked {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .menu-dropdown {
          background: rgba(17, 24, 39, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
      `}</style>

      <div className="comment-section rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-6 text-white capitalize">
          {getTopLevelComments().length} {getTopLevelComments().length === 1 ? "Comment" : "Comments"}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="flex items-start mb-8 gap-3 bg-black/30 p-4 rounded-xl border border-gray-800"
        >
          <UserAvatar
            userId={user?.uid}
            alt={user?.displayName || "User"}
            size={32}
          />
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
          {getTopLevelComments().map((comment) => {
            const replies = getReplies(comment.id);
            const isExpanded = expandedReplies.has(comment.id);
            const isEditing = editingCommentId === comment.id;

            return (
              <div key={comment.id}>
                <div className="comment-item p-4 rounded-xl">
                  <div className="flex gap-3">
                    <UserAvatar
                      userId={comment.userId}
                      alt={comment.userName || "User"}
                      size={40}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">{comment.userName || "User"}</p>
                          <p className="text-xs text-gray-400">
                            {formatTimestamp(comment.createdAt)}
                          </p>
                        </div>
                        {canEditOrDelete(comment) && (
                           <div className="relative menu-container">
                            <button
                              className="text-gray-400 hover:text-white p-1 transition"
                              onClick={() => setOpenMenuId(openMenuId === comment.id ? null : comment.id)}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === comment.id && (
                              <div className="menu-dropdown absolute right-0 mt-2 w-40 rounded-lg py-2 z-50">
                                <button
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditText(comment.text);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-500/20 text-red-400 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mb-3">
                          <input
                            type="text"
                            className="w-full bg-black/70 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-emerald-500 focus:outline-none"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            maxLength={500}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditText("");
                              }}
                              className="px-3 py-1 text-sm text-gray-300 hover:text-white transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleEditComment(comment.id)}
                              disabled={loading}
                              className="bg-emerald-600 hover:bg-emerald-700 px-4 py-1 rounded-lg text-white text-sm font-medium transition disabled:opacity-50"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-300 leading-relaxed break-words mb-3">
                          {comment.text}
                        </p>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          className={`reaction-button px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                            likedComments.has(comment.id) ? "liked" : ""
                          }`}
                          onClick={() => handleReaction(comment.id, comment, "like")}
                          disabled={!user}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{commentLikeCounts[comment.id] || 0}</span>
                        </button>
                        <button
                          className={`reaction-button px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                            dislikedComments.has(comment.id) ? "disliked" : ""
                          }`}
                          onClick={() => handleReaction(comment.id, comment, "dislike")}
                          disabled={!user}
                        >
                          <ThumbsDown className="w-4 h-4" />
                          <span>{commentDislikeCounts[comment.id] || 0}</span>
                        </button>
                        <button
                          className="text-gray-400 hover:text-white text-sm font-semibold"
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          disabled={!user}
                        >
                          Reply
                        </button>
                      </div>

                      {replyingTo === comment.id && (
                        <div className="mt-3 flex items-start gap-2">
                          <UserAvatar
                            userId={user?.uid}
                            alt={user?.displayName || "User"}
                            size={32}
                          />
                          <div className="flex-1">
                            <input
                              type="text"
                              className="w-full bg-black/70 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-emerald-500 focus:outline-none placeholder-gray-500 text-sm"
                              placeholder={`Reply to ${comment.userName}...`}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              maxLength={500}
                              autoFocus
                            />
                            {replyText.trim() && (
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText("");
                                  }}
                                  className="px-3 py-1 text-sm text-gray-300 hover:text-white transition"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleReplySubmit(comment.id, comment)}
                                  disabled={loading}
                                  className="bg-emerald-600 hover:bg-emerald-700 px-4 py-1 rounded-lg text-white text-sm font-medium transition disabled:opacity-50"
                                >
                                  Reply
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {replies.length > 0 && (
                  <div className="ml-12 mt-2">
                    <button
                      onClick={() => toggleReplies(comment.id)}
                      className="text-blue-400 hover:text-blue-300 text-sm font-semibold flex items-center gap-1 mb-2"
                    >
                      {isExpanded ? "▼" : "▶"} {replies.length} {replies.length === 1 ? "reply" : "replies"}
                    </button>
                    {isExpanded && (
                      <div className="space-y-3">
                        {replies.map((reply) => {
                          const isEditingReply = editingCommentId === reply.id;

                          return (
                            <div key={reply.id} className="comment-item p-3 rounded-xl">
                              <div className="flex gap-3">
                                <UserAvatar
                                  userId={reply.userId}
                                  alt={reply.userName || "User"}
                                  size={32}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="font-semibold text-sm">{reply.userName || "User"}</p>
                                      <p className="text-xs text-gray-400">
                                        {formatTimestamp(reply.createdAt)}
                                      </p>
                                    </div>
                                    {canEditOrDelete(reply) && (
                                      <div className="relative menu-container">
                                        <button
                                          className="text-gray-400 hover:text-white p-1 transition"
                                          onClick={() => setOpenMenuId(openMenuId === reply.id ? null : reply.id)}
                                        >
                                          <MoreVertical className="w-3 h-3" />
                                        </button>
                                        {openMenuId === reply.id && (
                                          <div className="menu-dropdown absolute right-0 mt-2 w-40 rounded-lg py-2 z-50">
                                            <button
                                              onClick={() => {
                                                setEditingCommentId(reply.id);
                                                setEditText(reply.text);
                                                setOpenMenuId(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition"
                                            >
                                              <Edit2 className="w-4 h-4" />
                                              Edit
                                            </button>
                                            <button
                                              onClick={() => handleDeleteComment(reply.id)}
                                              className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-500/20 text-red-400 transition"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              Delete
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {isEditingReply ? (
                                    <div className="mb-2">
                                      <input
                                        type="text"
                                        className="w-full bg-black/70 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        maxLength={500}
                                        autoFocus
                                      />
                                      <div className="flex justify-end gap-2 mt-2">
                                        <button
                                          onClick={() => {
                                            setEditingCommentId(null);
                                            setEditText("");
                                          }}
                                          className="px-3 py-1 text-xs text-gray-300 hover:text-white transition"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => handleEditComment(reply.id)}
                                          disabled={loading}
                                          className="bg-emerald-600 hover:bg-emerald-700 px-4 py-1 rounded-lg text-white text-xs font-medium transition disabled:opacity-50"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-gray-300 text-sm leading-relaxed break-words mb-2">
                                      {reply.text}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-2">
                                    <button
                                      className={`reaction-button px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                                        likedComments.has(reply.id) ? "liked" : ""
                                      }`}
                                      onClick={() => handleReaction(reply.id, reply, "like")}
                                      disabled={!user}
                                    >
                                      <ThumbsUp className="w-3 h-3" />
                                      <span>{commentLikeCounts[reply.id] || 0}</span>
                                    </button>
                                    <button
                                      className={`reaction-button px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                                        dislikedComments.has(reply.id) ? "disliked" : ""
                                      }`}
                                      onClick={() => handleReaction(reply.id, reply, "dislike")}
                                      disabled={!user}
                                    >
                                      <ThumbsDown className="w-3 h-3" />
                                      <span>{commentDislikeCounts[reply.id] || 0}</span>
                                    </button>
                                    <button
                                      className="text-gray-400 hover:text-white text-xs font-semibold"
                                      onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                                      disabled={!user}
                                    >
                                      Reply
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {getTopLevelComments().length === 0 && (
            <p className="text-gray-500 text-center py-6">
              Be the first to comment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}