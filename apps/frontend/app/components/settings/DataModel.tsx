"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

/* ---------- Types ---------- */
interface Video {
  id: string;
  title: string;
  createdAt: string;
}

interface WatchedVideo {
  id: string;
  title: string;
  watchedAt: string;
  authorName?: string;
}

/* ---------- UI ---------- */
function ModalTitle({ title }: { title: string }) {
  return <h2 className="text-lg font-medium mb-4">{title}</h2>;
}

/* ---------- Component ---------- */
export default function DataModal() {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [recentWatched, setRecentWatched] = useState<WatchedVideo[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        /* ================= Uploaded Videos ================= */
        const videosQuery = query(
          collection(db, "videos"),
          where("authorId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const videosSnap = await getDocs(videosQuery);

        const uploadedVideos: Video[] = videosSnap.docs.map((doc) => {
          const data = doc.data();

          let createdAt = "";
          if (data.createdAt instanceof Timestamp) {
            createdAt = data.createdAt.toDate().toLocaleDateString();
          }

          return {
            id: doc.id,
            title: data.title || "Untitled video",
            createdAt,
          };
        });

        setVideos(uploadedVideos);

        /* ================= Recent Watched ================= */
        const watchedQuery = query(
          collection(db, "users", user.uid, "watchHistory"),
          orderBy("lastWatched", "desc"),
          limit(5)
        );

        const watchedSnap = await getDocs(watchedQuery);

        const watchedVideos: WatchedVideo[] = watchedSnap.docs.map((doc) => {
          const data = doc.data();

          let watchedAt = "";
          if (data.lastWatched instanceof Timestamp) {
            watchedAt = data.lastWatched.toDate().toLocaleString();
          }

          return {
            id: doc.id,
            title: data.title || "Unknown video",
            watchedAt,
            authorName: data.authorName || "Unknown",
          };
        });

        setRecentWatched(watchedVideos);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  /* ---------- Loading ---------- */
  if (loading) {
    return <p className="text-sm text-gray-400">Loading your data…</p>;
  }

  return (
    <>
      <ModalTitle title="Your Data in Airena" />

      {/* ================= Uploaded Videos ================= */}
      <p className="text-sm text-gray-400 mb-2">
        Uploaded Videos: <strong>{videos.length}</strong>
      </p>

      {videos.length === 0 ? (
        <p className="text-sm text-gray-500 mb-6">
          You haven’t uploaded any videos yet.
        </p>
      ) : (
        <ul className="space-y-2 max-h-40 overflow-y-auto mb-6">
          {videos.map((video) => (
            <li
              key={video.id}
              className="bg-gray-900/60 px-3 py-2 rounded-md"
            >
              <div className="text-sm text-gray-200 font-medium">
                {video.title}
              </div>
              <div className="text-xs text-gray-500">
                Uploaded on {video.createdAt}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ================= Recent Watched ================= */}
      <p className="text-sm text-gray-400 mb-2">
        Recently Watched
      </p>

      {recentWatched.length === 0 ? (
        <p className="text-sm text-gray-500">
          No watch history yet.
        </p>
      ) : (
        <ul className="space-y-2 max-h-40 overflow-y-auto">
          {recentWatched.map((video) => (
            <li
              key={video.id}
              className="bg-gray-900/40 px-3 py-2 rounded-md"
            >
              <div className="text-sm text-gray-200">
                {video.title}
              </div>
              <div className="text-xs text-gray-500">
                Watched on {video.watchedAt}
                {video.authorName && ` • ${video.authorName}`}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
