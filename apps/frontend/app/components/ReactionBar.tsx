"use client";
import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, runTransaction, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface ReactionBarProps {
  postId: string;
  collectionName: string;
}

interface ReactionData {
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
}

export default function ReactionBar({ postId, collectionName }: ReactionBarProps) {
  const { user } = useAuth();
  
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(null);

  useEffect(() => {
    if (!postId || !collectionName) return;

    const postRef = doc(db, collectionName, postId);

    const unsubscribe = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()?.reactions as ReactionData | undefined;
        setLikes(data?.likes || 0);
        setDislikes(data?.dislikes || 0);

        if (user) {
          if (data?.likedBy?.includes(user.uid)) {
            setUserReaction("like");
          } else if (data?.dislikedBy?.includes(user.uid)) {
            setUserReaction("dislike");
          } else {
            setUserReaction(null);
          }
        } else {
          setUserReaction(null);
        }
      }
    });

    return () => unsubscribe();
  }, [postId, collectionName, user]);

  const handleReaction = async (newReaction: "like" | "dislike") => {
    if (!user) {
      console.log("Please log in to react.");
      return;
    }

    const postRef = doc(db, collectionName, postId);

    try {
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) {
          throw new Error("Document does not exist!");
        }

        // ✅ FIXED: This now safely handles incomplete 'reactions' objects
        const reactions = postDoc.data()?.reactions || {}; // Get existing reactions or an empty object
        const currentData: ReactionData = {
          // Start with a complete default structure
          likes: 0,
          dislikes: 0,
          likedBy: [],
          dislikedBy: [],
          // Then, overwrite the defaults with any values that actually exist in the database
          ...reactions, 
        };
        
        const userId = user.uid;
        const isLiked = currentData.likedBy.includes(userId);
        const isDisliked = currentData.dislikedBy.includes(userId);
        
        if (newReaction === "like") {
          if (isDisliked) {
            currentData.dislikes--;
            currentData.dislikedBy = currentData.dislikedBy.filter(id => id !== userId);
          }
          if (isLiked) {
            currentData.likes--;
            currentData.likedBy = currentData.likedBy.filter(id => id !== userId);
          } else {
            currentData.likes++;
            currentData.likedBy.push(userId);
          }
        } else if (newReaction === "dislike") {
          if (isLiked) {
            currentData.likes--;
            currentData.likedBy = currentData.likedBy.filter(id => id !== userId);
          }
          if (isDisliked) {
            currentData.dislikes--;
            currentData.dislikedBy = currentData.dislikedBy.filter(id => id !== userId);
          } else {
            currentData.dislikes++;
            currentData.dislikedBy.push(userId);
          }
        }
        transaction.update(postRef, { reactions: currentData });
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleReaction("like")}
        disabled={!user}
        className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
          userReaction === 'like' 
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
      >
        <ThumbsUp size={16} />
        <span>{likes.toLocaleString()}</span>
      </button>
      <button
        onClick={() => handleReaction("dislike")}
        disabled={!user}
        className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
          userReaction === 'dislike' 
            ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' 
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
      >
        <ThumbsDown size={16} />
        <span>{dislikes.toLocaleString()}</span>
      </button>
    </div>
  );
}