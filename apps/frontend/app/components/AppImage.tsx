"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface AppImageProps {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

const AppImage: React.FC<AppImageProps> = ({
  src = "",
  alt,
  className = "",
  priority = false,
}) => {
  // ✅ LOCAL fallback (NO external domain)
  const fallbackSrc = "/thumb-fallback.png";

  const [currentSrc, setCurrentSrc] = useState<string>(
    src || fallbackSrc
  );

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
  }, [src]);

  return (
    <div className="relative w-full h-full">
      <Image
        src={currentSrc}
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
    </div>
  );
};

export default AppImage;
