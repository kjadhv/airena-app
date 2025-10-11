"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/firebase/config";
import { useAuth } from "@/app/context/AuthContext";
import {
  collection,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import UserAvatar from "@/app/components/UserAvatar";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  text: string;
  createdAt: Timestamp | null;
  editedAt?: Timestamp | null;
}

export default function CommentSection({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Real-time listener for comments
  useEffect(() => {
    if (!videoId) return;
    const q = query(
      collection(db, "videos", videoId, "comments"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as Comment);
      setComments(result);
    });
    return () => unsubscribe();
  }, [videoId]);

  // Action menu outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    if (activeMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenu]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user || loading) return;
    setLoading(true);
    setError(null);

    const commentData = {
      userId: user.uid,
      userName: user.displayName || "Anonymous",
      userPhotoURL: user.photoURL || null,
      text: commentText.trim(),
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(
        collection(db, "videos", videoId, "comments"),
        commentData
      );
      setCommentText("");
    } catch (err) {
      let errorMsg = "Failed to post comment. Please try again.";
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseError = err as { code: string; message?: string };
        if (firebaseError.code === "permission-denied" || firebaseError.code === "PERMISSION_DENIED") {
          errorMsg = "Permission denied. Please check if you're logged in.";
        } else if (firebaseError.code === "unavailable") {
          errorMsg = "Network error. Please check your connection.";
        } else if (firebaseError.message?.includes("index")) {
          errorMsg = "Database index required. Check console.";
        }
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
    setActiveMenu(null);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    setError(null);
    try {
      const commentRef = doc(db, "videos", videoId, "comments", commentId);
      await updateDoc(commentRef, {
        text: editText.trim(),
        editedAt: serverTimestamp()
      });
      setEditingId(null);
      setEditText("");
    } catch {
      setError("Failed to edit comment.");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setError(null);
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    setError(null);
    try {
      const commentRef = doc(db, "videos", videoId, "comments", commentId);
      await deleteDoc(commentRef);
      setActiveMenu(null);
    } catch {
      setError("Failed to delete comment.");
    }
  };

  const formatTimestamp = (timestamp: Timestamp | null) => {
    if (!timestamp) return "just now";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffInSeconds < 60) return "just now";
      if (diffInSeconds < 3600) {
        const mins = Math.floor(diffInSeconds / 60);
        return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
      }
      if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
      }
      if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} ${days === 1 ? "day" : "days"} ago`;
      }
      if (diffInSeconds < 2592000) {
        const weeks = Math.floor(diffInSeconds / 604800);
        return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
      }
      if (diffInSeconds < 31536000) {
        const months = Math.floor(diffInSeconds / 2592000);
        return `${months} ${months === 1 ? "month" : "months"} ago`;
      }
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} ${years === 1 ? "year" : "years"} ago`;
    } catch {
      return "recently";
    }
  };

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="flex items-start mb-8 gap-3">
        {user ? (
          <UserAvatar src={user.photoURL} alt={user.displayName} size={40} />
        ) : (
          <UserAvatar src={null} alt="guest" size={40} />
        )}
        <div className="flex-1">
          <input
            className="w-full px-0 py-2 bg-transparent text-white border-b-2 border-gray-700 focus:border-emerald-500 focus:outline-none transition-colors"
            placeholder={user ? "Add a comment..." : "Sign in to comment"}
            value={commentText}
            disabled={!user || loading}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            maxLength={500}
          />
          {commentText.trim() && (
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  setCommentText("");
                  setError(null);
                }}
                className="px-4 py-2 rounded-full text-white hover:bg-gray-800 transition"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !commentText.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Posting...
                  </span>
                ) : "Comment"}
              </button>
            </div>
          )}
        </div>
      </form>
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 flex items-start gap-2">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <div className="font-semibold">Error</div>
            <div className="text-sm">{error}</div>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 px-2"
          >
            ✕
          </button>
        </div>
      )}
      <div className="space-y-4">
        {comments.length === 0 && (
          <div className="text-gray-400 text-center py-10">
            No comments yet. Be the first to comment!
          </div>
        )}
        {comments.map(comment => (
          <div key={comment.id} className="flex gap-4 items-start group">
            <UserAvatar
              src={comment.userPhotoURL}
              alt={comment.userName}
              size={40}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{comment.userName}</span>
                <span className="text-gray-500 text-xs">
                  {formatTimestamp(comment.createdAt)}
                  {comment.editedAt && " (edited)"}
                </span>
              </div>
              {editingId === comment.id ? (
                <div className="mt-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveEdit(comment.id);
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-emerald-500 focus:outline-none"
                    maxLength={500}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleSaveEdit(comment.id)}
                      disabled={!editText.trim()}
                      className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-full transition disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-1 hover:bg-gray-800 text-white text-sm rounded-full transition"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Press Enter to save • Esc to cancel
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-gray-100 text-sm break-words whitespace-pre-wrap">
                  {comment.text}
                </p>
              )}
            </div>
            {user && user.uid === comment.userId && editingId !== comment.id && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === comment.id ? null : comment.id);
                  }}
                  className="p-2 hover:bg-gray-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title="More options"
                >
                  <MoreVertical size={18} />
                </button>
                {activeMenu === comment.id && (
                  <div
                    className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-10"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleEdit(comment)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 transition"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 text-red-400 transition"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}