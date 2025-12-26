"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/app/firebase/config";

// Create this as a new page: app/debug-videos/page.tsx

export default function DebugVideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllVideos = async () => {
      try {
        const snapshot = await getDocs(collection(db, "videos"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVideos(data);
        console.log("All videos data:", data);
      } catch (err) {
        console.error("Error fetching videos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllVideos();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Loading videos...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Firebase Video Data Inspector</h1>
        <p className="text-gray-400 mb-8">
          Total videos found: <span className="text-emerald-500 font-bold">{videos.length}</span>
        </p>

        {/* Summary of categories and tags */}
        <div className="mb-8 p-6 bg-gray-900 rounded-lg">
          <h2 className="text-xl font-bold mb-4">📊 Category Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-emerald-500 mb-2">
                Categories Found:
              </h3>
              <ul className="space-y-1">
                {Array.from(new Set(videos.map((v) => v.category || "No category")))
                  .sort()
                  .map((cat, i) => {
                    const count = videos.filter((v) => v.category === cat).length;
                    return (
                      <li key={i} className="text-gray-300">
                        • {cat} <span className="text-gray-500">({count} videos)</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-500 mb-2">
                Tags Found:
              </h3>
              <ul className="space-y-1">
                {Array.from(
                  new Set(videos.flatMap((v) => v.tags || []))
                )
                  .sort()
                  .map((tag, i) => {
                    const count = videos.filter((v) => v.tags?.includes(tag)).length;
                    return (
                      <li key={i} className="text-gray-300">
                        • {tag} <span className="text-gray-500">({count} videos)</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        </div>

        {/* Individual video details */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">📹 Individual Videos</h2>
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-emerald-500/50 transition"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{video.title || "Untitled"}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">
                        <span className="font-semibold text-emerald-500">ID:</span>{" "}
                        <code className="bg-gray-800 px-2 py-1 rounded">{video.id}</code>
                      </p>
                      <p className="text-gray-400 mt-2">
                        <span className="font-semibold text-emerald-500">Category Field:</span>{" "}
                        <code className="bg-gray-800 px-2 py-1 rounded">
                          {video.category || "❌ Not set"}
                        </code>
                      </p>
                      <p className="text-gray-400 mt-2">
                        <span className="font-semibold text-blue-500">Tags Array:</span>{" "}
                        {video.tags && video.tags.length > 0 ? (
                          <span className="inline-flex flex-wrap gap-1 mt-1">
                            {video.tags.map((tag: string, i: number) => (
                              <code
                                key={i}
                                className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded text-xs"
                              >
                                {tag}
                              </code>
                            ))}
                          </span>
                        ) : (
                          <code className="bg-gray-800 px-2 py-1 rounded">❌ No tags</code>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">
                        <span className="font-semibold">Views:</span> {video.views || 0}
                      </p>
                      <p className="text-gray-400 mt-2">
                        <span className="font-semibold">Visibility:</span>{" "}
                        {video.visibility || "Not set"}
                      </p>
                      <p className="text-gray-400 mt-2">
                        <span className="font-semibold">Author:</span>{" "}
                        {video.authorName || "Unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Raw data preview */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-300 text-sm">
                      🔍 View raw data
                    </summary>
                    <pre className="mt-2 p-4 bg-black rounded text-xs overflow-x-auto">
                      {JSON.stringify(video, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            </div>
          ))}
        </div>

        {videos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No videos found in Firebase</p>
          </div>
        )}
      </div>
    </div>
  );
}