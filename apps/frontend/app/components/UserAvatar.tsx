// app/components/UserAvatar.tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/app/firebase/config";

interface UserAvatarProps {
  src?: string | null;
  alt?: string | null;
  size?: number;
  userId?: string; // Used for both linking AND fetching latest photo
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt,
  size = 40,
  userId,
}) => {
  const [photoURL, setPhotoURL] = useState<string | null>(src || null);
  const [loading, setLoading] = useState(!!userId); // Only load if userId exists

  useEffect(() => {
    if (!userId) {
      setPhotoURL(src || null);
      setLoading(false);
      return;
    }

    // Real-time listener for user photo updates
    const unsubscribe = onSnapshot(
      doc(db, "users", userId),
      (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setPhotoURL(userData.photoURL || null);
        } else {
          // Fallback to src if user doc doesn't exist
          setPhotoURL(src || null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching user avatar:", error);
        // Fallback to src prop on error
        setPhotoURL(src || null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, src]);

  // Show loading skeleton while fetching
  if (loading) {
    return (
      <div
        className="rounded-full bg-gray-800 animate-pulse border-2 border-gray-700"
        style={{ width: size, height: size }}
      />
    );
  }

  const avatar = photoURL ? (
    <div
      className="relative rounded-full overflow-hidden border-2 border-gray-700"
      style={{ width: size, height: size }}
    >
      <Image
        src={photoURL}
        alt={alt || "User avatar"}
        fill
        sizes={`${size}px`}
        className="object-cover"
        key={photoURL} // Force re-render when URL changes
        unoptimized // Bypass Next.js caching for fresh images
      />
    </div>
  ) : (
    <div
      className="rounded-full bg-gray-800 flex items-center justify-center text-gray-500 border-2 border-gray-700"
      style={{ width: size, height: size }}
    >
      <User size={size * 0.6} />
    </div>
  );

  // ✅ clickable ONLY when userId is provided
  if (userId) {
    return (
      <Link
        href={`/profile/${userId}`}
        className="inline-block hover:opacity-80 transition"
      >
        {avatar}
      </Link>
    );
  }

  return avatar;
};

export default UserAvatar;