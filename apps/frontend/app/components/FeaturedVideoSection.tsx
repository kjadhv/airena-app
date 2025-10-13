// app/components/FeaturedVideoSection.tsx
"use client";
import React, { useState, useEffect, useRef } from 'react';
import AirenaVideoPlayer from './CustomVideoPlayer';

const FeaturedVideoSection = () => {
    const [isClient, setIsClient] = useState(false);
    const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
    const sectionRef = useRef<HTMLElement>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !shouldAutoPlay) {
                        setShouldAutoPlay(true);
                    }
                });
            },
            {
                threshold: 0.5, // Trigger when 50% of the video is visible
            }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => {
            if (sectionRef.current) {
                observer.unobserve(sectionRef.current);
            }
        };
    }, [isClient, shouldAutoPlay]);

    return (
        <section ref={sectionRef} className="py-16 sm:py-24 px-4 sm:px-8">
            <div className="container mx-auto max-w-6xl">
                <div className="relative aspect-video rounded-2xl overflow-hidden group shadow-2xl shadow-emerald-500/10">
                   {isClient && (
                        <AirenaVideoPlayer
                            videoUrl="/featvid.mp4"
                            poster="/video-thumbnail.jpg"
                            autoPlay={shouldAutoPlay}
                        />
                   )}
                </div>
            </div>
        </section>
    );
};

export default FeaturedVideoSection;