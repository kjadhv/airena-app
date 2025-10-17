"use client";
import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement) => void;
      };
    };
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

interface SocialEmbedRendererProps {
  content: string;
}

const SocialEmbedRenderer: React.FC<SocialEmbedRendererProps> = ({ content }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    const embedElements = contentRef.current.querySelectorAll('[data-social-embed]');
    
    embedElements.forEach((element) => {
      const el = element as HTMLElement;
      if (el.dataset.processed === 'true') return;

      const src = el.getAttribute('data-src');
      const type = el.getAttribute('data-type');
      
      if (!src || !type) return;
      
      let embedHtml = '';
      
      switch (type) {
        case 'twitter':
          embedHtml = `<blockquote class="twitter-tweet" data-theme="dark" data-conversation="none"><a href="${src}"></a></blockquote>`;
          break;
          
        case 'youtube':
          const youtubeId = extractYouTubeId(src);
          if (youtubeId) {
            embedHtml = `
              <div class="relative w-full aspect-video my-12 rounded-2xl overflow-hidden shadow-2xl">
                <iframe 
                  src="https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0&controls=1" 
                  frameborder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                  class="w-full h-full"
                ></iframe>
              </div>`;
          }
          break;
          
        case 'instagram':
          embedHtml = `
            <div class="instagram-embed-wrapper">
              <blockquote class="instagram-media" 
                data-instgrm-captioned 
                data-instgrm-permalink="${src}" 
                data-instgrm-version="14">
              </blockquote>
            </div>`;
          break;
      }
      
      if (embedHtml) {
        el.innerHTML = embedHtml;
        el.dataset.processed = 'true';
      }
    });
    
    if (contentRef.current.querySelector('[data-type="twitter"]')) loadTwitterScript();
    if (contentRef.current.querySelector('[data-type="instagram"]')) loadInstagramScript();
    
  }, [content]);

  const extractYouTubeId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const loadTwitterScript = () => {
    if (!window.twttr) {
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      document.body.appendChild(script);
    } else {
      window.twttr.widgets.load(contentRef.current!);
    }
  };

  const loadInstagramScript = () => {
    if (!window.instgrm) {
      const script = document.createElement('script');
      script.src = '//www.instagram.com/embed.js';
      script.async = true;
      script.onload = () => {
        if (window.instgrm?.Embeds?.process) {
          window.instgrm.Embeds.process();
        }
      };
      document.body.appendChild(script);
    } else if (window.instgrm?.Embeds?.process) {
      window.instgrm.Embeds.process();
    }
  };

  return (
    <>
      <style jsx global>{`
        .instagram-embed-wrapper {
          display: flex;
          justify-content: center;
          margin: 3rem 0;
        }
        
        .instagram-media {
          max-width: 600px !important;
          width: 100% !important;
          background: #0a0a0a !important;
          border: 1px solid #262626 !important;
          border-radius: 16px !important;
        }
        
        .instagram-media iframe {
          background: #0a0a0a !important;
          filter: brightness(0.95);
        }
        
        .instagram-media .caption {
          background: #000 !important;
          color: #fff !important;
        }
        
        .twitter-tweet {
          margin: 3rem auto !important;
          background: #0a0a0a !important;
          border-color: #262626 !important;
          max-width: 600px !important;
        }
        
        .twitter-tweet iframe {
          background: #0a0a0a !important;
        }
        
        .relative.w-full.aspect-video {
          border: 1px solid rgba(100, 116, 139, 0.3);
          background: #000;
        }
        
        .relative.w-full.aspect-video iframe {
          background: #000;
        }
      `}</style>
      
      <div
        ref={contentRef}
        className="prose prose-invert prose-2xl max-w-none mx-auto blog-content-rendered prose-p:text-gray-100 prose-p:leading-[2] prose-p:text-[1.35rem] prose-p:mb-8 prose-p:font-light prose-h1:!text-emerald-400 prose-h1:!font-extrabold prose-h1:!text-6xl prose-h1:!leading-tight prose-h1:!mt-16 prose-h1:!mb-8 prose-h1:!tracking-tight prose-h1:text-center prose-h2:!text-emerald-400 prose-h2:!font-bold prose-h2:!text-5xl prose-h2:!mt-20 prose-h2:!mb-6 prose-h2:!tracking-tight prose-h2:text-center prose-h3:!text-emerald-300 prose-h3:!font-semibold prose-h3:!text-4xl prose-h3:!mt-16 prose-h3:!mb-5 prose-h3:text-center prose-headings:!text-emerald-400 prose-blockquote:!border-l-4 prose-blockquote:!border-emerald-500 prose-blockquote:!bg-gradient-to-r prose-blockquote:!from-emerald-500/20 prose-blockquote:!via-emerald-500/10 prose-blockquote:!to-transparent prose-blockquote:!italic prose-blockquote:!text-gray-100 prose-blockquote:!text-2xl prose-blockquote:!pl-10 prose-blockquote:!py-8 prose-blockquote:!my-12 prose-blockquote:!rounded-r-2xl prose-blockquote:!shadow-lg prose-li:text-gray-100 prose-li:leading-relaxed prose-li:mb-4 prose-li:text-xl prose-ul:!my-8 prose-ol:!my-8 prose-a:!text-emerald-400 prose-a:!font-medium prose-a:!no-underline prose-a:!border-b-2 prose-a:!border-emerald-400/30 prose-a:text-xl hover:prose-a:!text-emerald-300 hover:prose-a:!border-emerald-300 prose-strong:!text-white prose-strong:!font-bold prose-strong:text-xl prose-code:!bg-gray-800/80 prose-code:!text-emerald-400 prose-code:!px-3 prose-code:!py-2 prose-code:!rounded-lg prose-code:!text-lg prose-code:!font-mono prose-code:!border prose-code:!border-gray-700 prose-pre:!bg-gradient-to-br prose-pre:!from-slate-900 prose-pre:!to-slate-800 prose-pre:!border-2 prose-pre:!border-gray-700 prose-pre:!shadow-2xl prose-pre:!my-12 prose-pre:!rounded-2xl prose-pre:!text-base prose-img:!rounded-2xl prose-img:!shadow-2xl prose-img:!my-16 prose-img:!border-2 prose-img:!border-gray-700/50 prose-img:!mx-auto prose-table:!mx-auto prose-table:!shadow-2xl prose-table:!rounded-xl prose-table:!my-12 prose-hr:!border-t-2 prose-hr:!border-gray-700 prose-hr:!my-20 prose-hr:!opacity-50"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </>
  );
};

export default SocialEmbedRenderer;