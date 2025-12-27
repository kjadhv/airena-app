// app/components/AppImage.tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface AppImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackText: string;
  priority?: boolean;
}

const AppImage: React.FC<AppImageProps> = ({
  src,
  alt,
  className = "",
  fallbackText,
  priority = false,
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);

  // Reset image source if src prop changes
  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  const fallbackSrc = `https://placehold.co/600x400/111111/FFFFFF?text=${encodeURIComponent(
    fallbackText
  )}`;

  return (
    <Image
      src={currentSrc || fallbackSrc}
      alt={alt}
      fill
      priority={priority}
      sizes="(max-width: 768px) 100vw,
             (max-width: 1200px) 50vw,
             33vw"
      className={`object-cover ${className}`}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
};

export default AppImage;
