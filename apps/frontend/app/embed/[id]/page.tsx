"use client";

import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/app/firebase/config";
import AirenaVideoPlayer from "@/app/components/CustomVideoPlayer";

export default function EmbedPage() {
  const { id } = useParams();
  const [video, setVideo] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const fetchVideo = async () => {
      const ref = doc(db, "videos", id as string);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setVideo({ id: snap.id, ...snap.data() });
      }
    };

    fetchVideo();
  }, [id]);

  if (!video) return null;

  return (
    <div className="w-screen h-screen bg-black">
      <AirenaVideoPlayer
        videoUrl={video.videoUrl}
        poster={video.thumbnailUrl}
        isLive={video.isLive}
        contentId={video.id}
        contentTitle={video.title}
        authorName={video.authorName}
      />
    </div>
  );
}
