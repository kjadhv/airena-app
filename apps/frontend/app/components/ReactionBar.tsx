"use client";
import { useState, useEffect } from "react";
import { db } from "@/app/firebase/config";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";

interface ReactionBarProps {
  postId: string;
  collectionName: string;
}

export default function ReactionBar({ postId, collectionName }: ReactionBarProps) {
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);

  useEffect(() => {
    const fetchReactions = async () => {
      const ref = doc(db, collectionName, postId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setLikes(data.reactions?.likes || 0);
        setDislikes(data.reactions?.dislikes || 0);
      }
    };
    fetchReactions();
  }, [postId, collectionName]);

  const handleReaction = async (type: "likes" | "dislikes") => {
    const ref = doc(db, collectionName, postId);
    await updateDoc(ref, {
      [`reactions.${type}`]: increment(1),
    });
    if (type === "likes") setLikes(prev => prev + 1);
    else setDislikes(prev => prev + 1);
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={() => handleReaction("likes")}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-full text-white text-sm"
      >
        👍 {likes}
      </button>
      <button
        onClick={() => handleReaction("dislikes")}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-full text-white text-sm"
      >
        👎 {dislikes}
      </button>
    </div>
  );
}
