"use client";
import React, { useEffect, useRef, useCallback, useMemo } from 'react';

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement) => void;
        createTweet: (tweetId: string, element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLElement | null>;
      };
      ready?: (callback: () => void) => void;
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

// Global script loading state
const scriptLoadState = {
  twitter: { loaded: false, loading: false, promise: null as Promise<void> | null },
  instagram: { loaded: false, loading: false, promise: null as Promise<void> | null }
};

const SocialEmbedRenderer: React.FC<SocialEmbedRendererProps> = ({ content }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef(false);

  // Memoized embed detection
  const embedTypes = useMemo(() => ({
    hasYouTube: content.includes('data-type="youtube"'),
    hasTwitter: content.includes('data-type="twitter"'),
    hasInstagram: content.includes('data-type="instagram"')
  }), [content]);

  // Load Twitter script
  const loadTwitterScript = useCallback((): Promise<void> => {
    if (window.twttr) {
      scriptLoadState.twitter.loaded = true;
      return Promise.resolve();
    }
    if (scriptLoadState.twitter.promise) return scriptLoadState.twitter.promise;

    scriptLoadState.twitter.loading = true;
    scriptLoadState.twitter.promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      
      script.onload = () => {
        scriptLoadState.twitter.loaded = true;
        scriptLoadState.twitter.loading = false;
        console.log('✅ Twitter script loaded');
        resolve();
      };
      
      script.onerror = () => {
        scriptLoadState.twitter.loading = false;
        scriptLoadState.twitter.promise = null;
        console.error('❌ Twitter script failed');
        reject(new Error('Twitter script failed'));
      };

      document.body.appendChild(script);
    });

    return scriptLoadState.twitter.promise;
  }, []);

  // Load Instagram script
  const loadInstagramScript = useCallback((): Promise<void> => {
    if (window.instgrm?.Embeds) {
      scriptLoadState.instagram.loaded = true;
      return Promise.resolve();
    }
    if (scriptLoadState.instagram.promise) return scriptLoadState.instagram.promise;

    scriptLoadState.instagram.loading = true;
    scriptLoadState.instagram.promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      
      script.onload = () => {
        scriptLoadState.instagram.loaded = true;
        scriptLoadState.instagram.loading = false;
        console.log('✅ Instagram script loaded');
        resolve();
      };
      
      script.onerror = () => {
        scriptLoadState.instagram.loading = false;
        scriptLoadState.instagram.promise = null;
        console.error('❌ Instagram script failed');
        reject(new Error('Instagram script failed'));
      };

      document.body.appendChild(script);
    });

    return scriptLoadState.instagram.promise;
  }, []);

  // Embed processors
  const processYouTubeEmbed = useCallback((element: HTMLElement, id: string) => {
    console.log('🎥 Processing YouTube:', id);
    element.innerHTML = `<div class="youtube-embed-wrapper my-12"><div class="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-black"><iframe src="https://www.youtube.com/embed/${id}?modestbranding=1&rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full" loading="lazy" title="YouTube video"></iframe></div></div>`;
  }, []);

  const processTwitterEmbed = useCallback(async (element: HTMLElement, src: string, id: string) => {
    console.log('🐦 Processing Twitter:', id);
    element.innerHTML = `<div class="twitter-embed-wrapper flex justify-center my-12"><blockquote class="twitter-tweet" data-theme="dark" data-conversation="none" data-dnt="true"><a href="${src}"></a></blockquote></div>`;
    
    if (window.twttr?.widgets?.load) {
      window.twttr.widgets.load(element);
    }
  }, []);

  const processInstagramEmbed = useCallback((element: HTMLElement, src: string, id: string) => {
    console.log('📸 Processing Instagram:', id);
    element.innerHTML = `<div class="instagram-embed-wrapper flex justify-center my-12"><blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${src}" data-instgrm-version="14" style="background:#000; border:1px solid #262626; border-radius:16px; margin:1px; max-width:540px; min-width:326px; padding:0; width:99.375%;"><a href="${src}" target="_blank" rel="noopener noreferrer">View on Instagram</a></blockquote></div>`;
  }, []);

  const showFallback = useCallback((element: HTMLElement, src: string, type: string) => {
    const emoji = { youtube: '🎥', twitter: '🐦', instagram: '📸' }[type] || '🔗';
    const name = { youtube: 'YouTube', twitter: 'Twitter/X', instagram: 'Instagram' }[type] || 'Social Media';
    
    element.innerHTML = `<div class="embed-fallback my-8 p-6 bg-gray-800/50 rounded-xl border border-gray-700 text-center max-w-2xl mx-auto"><p class="text-gray-300 mb-3 text-lg">${emoji} ${name} Post</p><a href="${src}" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:text-emerald-300 underline break-all">View original →</a></div>`;
  }, []);

  // Process all embeds
  const processAllEmbeds = useCallback(async () => {
    if (!contentRef.current || processedRef.current) {
      console.log('⏭️ Skipping embed processing');
      return;
    }

    const embedElements = contentRef.current.querySelectorAll('[data-social-embed="true"]');
    if (embedElements.length === 0) {
      console.log('ℹ️ No embeds found');
      return;
    }

    console.log(`🔍 Processing ${embedElements.length} embeds`);
    processedRef.current = true;

    // Process all embeds
    for (const element of Array.from(embedElements)) {
      const el = element as HTMLElement;
      const src = el.getAttribute('data-src');
      const type = el.getAttribute('data-type');
      const id = el.getAttribute('data-id') || '';

      console.log(`📝 Found ${type} embed:`, { src, id });

      if (!src || !type) {
        console.warn('⚠️ Missing src or type');
        continue;
      }

      try {
        switch (type) {
          case 'youtube':
            processYouTubeEmbed(el, id);
            break;

          case 'twitter':
            if (scriptLoadState.twitter.loaded || window.twttr) {
              await processTwitterEmbed(el, src, id);
            } else {
              console.log('⏳ Twitter script not ready, showing fallback');
              showFallback(el, src, type);
            }
            break;

          case 'instagram':
            if (scriptLoadState.instagram.loaded || window.instgrm?.Embeds) {
              processInstagramEmbed(el, src, id);
            } else {
              console.log('⏳ Instagram script not ready, showing fallback');
              showFallback(el, src, type);
            }
            break;

          default:
            console.warn('⚠️ Unknown embed type:', type);
            showFallback(el, src, type);
        }
      } catch (error) {
        console.error(`❌ Error processing ${type}:`, error);
        showFallback(el, src, type);
      }
    }

    // Trigger Instagram processing after all embeds are ready
    if ((scriptLoadState.instagram.loaded || window.instgrm?.Embeds) && window.instgrm?.Embeds?.process) {
      setTimeout(() => {
        try {
          console.log('🔄 Processing Instagram embeds');
          window.instgrm?.Embeds?.process();
        } catch (e) {
          console.error('Instagram process error:', e);
        }
      }, 100);
    }

    console.log('✅ All embeds processed');
  }, [processYouTubeEmbed, processTwitterEmbed, processInstagramEmbed, showFallback]);

  // Load scripts and process embeds
  useEffect(() => {
    console.log('🎬 SocialEmbedRenderer effect triggered');
    console.log('📊 Embed types:', embedTypes);
    
    // Reset processed flag when content changes
    processedRef.current = false;

    const init = async () => {
      try {
        // Load required scripts
        const loadPromises: Promise<void>[] = [];
        
        if (embedTypes.hasTwitter) {
          console.log('🚀 Loading Twitter script');
          loadPromises.push(loadTwitterScript().catch(err => {
            console.error('Twitter load error:', err);
          }));
        }
        
        if (embedTypes.hasInstagram) {
          console.log('🚀 Loading Instagram script');
          loadPromises.push(loadInstagramScript().catch(err => {
            console.error('Instagram load error:', err);
          }));
        }

        // Wait for scripts to load
        if (loadPromises.length > 0) {
          await Promise.allSettled(loadPromises);
          // Give scripts time to initialize
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        // Process embeds
        processAllEmbeds();
      } catch (error) {
        console.error('❌ Embed initialization error:', error);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      init();
    }, 100);

    return () => clearTimeout(timer);
  }, [content, embedTypes, loadTwitterScript, loadInstagramScript, processAllEmbeds]);

  return (
    <>
      <style jsx global>{`
        .youtube-embed-wrapper,
        .twitter-embed-wrapper,
        .instagram-embed-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .instagram-media {
          max-width: 540px !important;
          width: 100% !important;
          margin: 0 auto !important;
        }
        
        .twitter-tweet {
          margin: 0 auto !important;
          max-width: 550px !important;
        }
        
        [data-social-embed] {
          width: 100%;
          display: flex;
          justify-content: center;
          min-height: 50px;
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