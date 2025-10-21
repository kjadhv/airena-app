"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';

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

interface ScriptStatus {
  twitter: 'idle' | 'loading' | 'loaded' | 'error';
  instagram: 'idle' | 'loading' | 'loaded' | 'error';
}

const SocialEmbedRenderer: React.FC<SocialEmbedRendererProps> = ({ content }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scriptStatus, setScriptStatus] = useState<ScriptStatus>({
    twitter: 'idle',
    instagram: 'idle'
  });
  const processedIdsRef = useRef<Set<string>>(new Set());
  const retryCountRef = useRef<Map<string, number>>(new Map());
  const twitterLoadingPromiseRef = useRef<Promise<void> | null>(null);
  const instagramLoadingPromiseRef = useRef<Promise<void> | null>(null);
  const maxRetries = 3;

  // 🔧 FIX: Load Twitter script with proper Promise handling
  const loadTwitterScript = useCallback(() => {
    // If already loaded, return resolved promise
    if (window.twttr) {
      console.log('✅ Twitter script already loaded');
      setScriptStatus(prev => ({ ...prev, twitter: 'loaded' }));
      return Promise.resolve();
    }

    // If already loading, return the existing promise
    if (twitterLoadingPromiseRef.current) {
      console.log('⏳ Twitter script already loading, waiting...');
      return twitterLoadingPromiseRef.current;
    }

    // Create new loading promise
    console.log('📥 Loading Twitter script...');
    setScriptStatus(prev => ({ ...prev, twitter: 'loading' }));

    const promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      
      script.onload = () => {
        console.log('✅ Twitter script loaded successfully');
        setScriptStatus(prev => ({ ...prev, twitter: 'loaded' }));
        twitterLoadingPromiseRef.current = null;
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('❌ Failed to load Twitter script:', error);
        setScriptStatus(prev => ({ ...prev, twitter: 'error' }));
        twitterLoadingPromiseRef.current = null;
        reject(error);
      };

      document.body.appendChild(script);
    });

    twitterLoadingPromiseRef.current = promise;
    return promise;
  }, []);

  // 🔧 FIX: Load Instagram script with proper Promise handling
  const loadInstagramScript = useCallback(() => {
    // If already loaded, return resolved promise
    if (window.instgrm?.Embeds) {
      console.log('✅ Instagram script already loaded');
      setScriptStatus(prev => ({ ...prev, instagram: 'loaded' }));
      return Promise.resolve();
    }

    // If already loading, return the existing promise
    if (instagramLoadingPromiseRef.current) {
      console.log('⏳ Instagram script already loading, waiting...');
      return instagramLoadingPromiseRef.current;
    }

    console.log('📥 Loading Instagram script...');
    setScriptStatus(prev => ({ ...prev, instagram: 'loading' }));

    const promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      
      script.onload = () => {
        console.log('✅ Instagram script loaded successfully');
        setScriptStatus(prev => ({ ...prev, instagram: 'loaded' }));
        instagramLoadingPromiseRef.current = null;
        
        // Give Instagram a moment to initialize
        setTimeout(() => {
          if (window.instgrm?.Embeds?.process) {
            try {
              window.instgrm.Embeds.process();
            } catch (e) {
              console.error('Error processing Instagram embeds:', e);
            }
          }
          resolve();
        }, 100);
      };
      
      script.onerror = (error) => {
        console.error('❌ Failed to load Instagram script:', error);
        setScriptStatus(prev => ({ ...prev, instagram: 'error' }));
        instagramLoadingPromiseRef.current = null;
        reject(error);
      };

      document.body.appendChild(script);
    });

    instagramLoadingPromiseRef.current = promise;
    return promise;
  }, []);

  // Extract YouTube ID from URL
  const extractYouTubeId = useCallback((url: string): string | null => {
    if (!url || typeof url !== 'string') return null;

    try {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
      }
      return null;
    } catch (error) {
      console.error('Error extracting YouTube ID:', error);
      return null;
    }
  }, []);

  // Extract Tweet ID from URL
  const extractTweetId = useCallback((url: string): string | null => {
    if (!url || typeof url !== 'string') return null;

    try {
      const match = url.match(/status(?:es)?\/(\d+)/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error extracting Tweet ID:', error);
      return null;
    }
  }, []);

  // Process YouTube embed
  const processYouTubeEmbed = useCallback((element: HTMLElement, src: string, id: string) => {
    try {
      const youtubeId = id || extractYouTubeId(src);
      if (!youtubeId) {
        throw new Error('Invalid YouTube ID');
      }

      const embedHtml = `
        <div class="youtube-embed-wrapper my-12">
          <div class="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-black">
            <iframe 
              src="https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0&controls=1" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
              class="w-full h-full"
              loading="lazy"
              title="YouTube video player"
            ></iframe>
          </div>
        </div>`;

      element.innerHTML = embedHtml;
      element.dataset.processed = 'true';
      console.log('✅ YouTube embed processed:', youtubeId);
      return true;
    } catch (error) {
      console.error('❌ YouTube embed error:', error);
      return false;
    }
  }, [extractYouTubeId]);

  // Process Twitter embed
  const processTwitterEmbed = useCallback(async (element: HTMLElement, src: string, id: string): Promise<boolean> => {
    try {
      const tweetId = id || extractTweetId(src);
      if (!tweetId) {
        throw new Error('Invalid Tweet ID');
      }

      // Create container
      element.innerHTML = '<div class="twitter-tweet-container flex justify-center my-12"></div>';
      const container = element.querySelector('.twitter-tweet-container') as HTMLElement;

      if (!container) {
        throw new Error('Failed to create Twitter container');
      }

      // Method 1: Try createTweet API (most reliable)
      if (window.twttr?.widgets?.createTweet) {
        try {
          const tweet = await window.twttr.widgets.createTweet(tweetId, container, {
            theme: 'dark',
            conversation: 'none',
            cards: 'visible',
            width: 550,
            dnt: true
          });

          if (tweet) {
            element.dataset.processed = 'true';
            console.log('✅ Twitter embed processed (createTweet):', tweetId);
            return true;
          }
        } catch (createError) {
          console.warn('createTweet failed, trying fallback:', createError);
        }
      }

      // Method 2: Fallback to blockquote
      element.innerHTML = `
        <div class="twitter-embed-wrapper flex justify-center my-12">
          <blockquote class="twitter-tweet" data-theme="dark" data-conversation="none" data-dnt="true">
            <a href="${src}"></a>
          </blockquote>
        </div>`;

      if (window.twttr?.widgets?.load) {
        await new Promise(resolve => setTimeout(resolve, 100));
        window.twttr.widgets.load(element);
        element.dataset.processed = 'true';
        console.log('✅ Twitter embed processed (blockquote):', tweetId);
        return true;
      }

      throw new Error('Twitter widgets not available');

    } catch (error) {
      console.error('❌ Twitter embed error:', error);
      return false;
    }
  }, [extractTweetId]);

  // Process Instagram embed
  const processInstagramEmbed = useCallback((element: HTMLElement, src: string, id: string) => {
    try {
      const embedHtml = `
        <div class="instagram-embed-wrapper flex justify-center my-12">
          <blockquote class="instagram-media" 
            data-instgrm-captioned 
            data-instgrm-permalink="${src}" 
            data-instgrm-version="14"
            style="background:#000; border:1px solid #262626; border-radius:16px; margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);">
            <a href="${src}" target="_blank" rel="noopener noreferrer">View on Instagram</a>
          </blockquote>
        </div>`;

      element.innerHTML = embedHtml;

      // Process Instagram embeds
      if (window.instgrm?.Embeds?.process) {
        setTimeout(() => {
          try {
            window.instgrm?.Embeds?.process();
          } catch (e) {
            console.error('Instagram process error:', e);
          }
        }, 100);
      }

      element.dataset.processed = 'true';
      console.log('✅ Instagram embed processed:', id);
      return true;
    } catch (error) {
      console.error('❌ Instagram embed error:', error);
      return false;
    }
  }, []);

  // Show fallback UI
  const showFallback = useCallback((element: HTMLElement, src: string, type: string) => {
    const platformEmoji = {
      youtube: '🎥',
      twitter: '🐦',
      instagram: '📸'
    }[type] || '🔗';

    const platformName = {
      youtube: 'YouTube',
      twitter: 'Twitter/X',
      instagram: 'Instagram'
    }[type] || 'Social Media';

    element.innerHTML = `
      <div class="embed-fallback my-8 p-6 bg-gray-800/50 rounded-xl border border-gray-700 text-center max-w-2xl mx-auto">
        <p class="text-gray-300 mb-3 text-lg">${platformEmoji} ${platformName} Post</p>
        <a href="${src}" target="_blank" rel="noopener noreferrer" 
           class="text-emerald-400 hover:text-emerald-300 underline break-all inline-block">
          View original content →
        </a>
      </div>`;
    element.dataset.processed = 'true';
  }, []);

  // Main processing function
  const processEmbeds = useCallback(async () => {
    if (!contentRef.current) {
      console.log('❌ No contentRef available');
      return;
    }

    const embedElements = contentRef.current.querySelectorAll('[data-social-embed="true"]');
    if (embedElements.length === 0) {
      console.log('ℹ️ No embeds to process');
      return;
    }

    console.log(`🔍 Found ${embedElements.length} embeds to process`);

    for (const element of Array.from(embedElements)) {
      const el = element as HTMLElement;
      
      // Skip if already processed
      if (el.dataset.processed === 'true') {
        continue;
      }

      const src = el.getAttribute('data-src');
      const type = el.getAttribute('data-type');
      const id = el.getAttribute('data-id') || '';

      console.log(`🔄 Processing ${type} embed:`, { src, id });

      if (!src || !type) {
        console.warn('⚠️ Missing src or type:', el);
        continue;
      }

      // Check retry count
      const embedKey = `${type}-${id}`;
      const retryCount = retryCountRef.current.get(embedKey) || 0;

      if (retryCount >= maxRetries) {
        console.warn(`⚠️ Max retries reached for ${embedKey}`);
        showFallback(el, src, type);
        continue;
      }

      try {
        let success = false;

        switch (type) {
          case 'youtube':
            success = processYouTubeEmbed(el, src, id);
            break;

          case 'twitter':
            if (scriptStatus.twitter === 'loaded') {
              success = await processTwitterEmbed(el, src, id);
            } else if (scriptStatus.twitter === 'error') {
              showFallback(el, src, type);
              success = true;
            } else {
              console.log('⏳ Waiting for Twitter script...');
            }
            break;

          case 'instagram':
            if (scriptStatus.instagram === 'loaded') {
              success = processInstagramEmbed(el, src, id);
            } else if (scriptStatus.instagram === 'error') {
              showFallback(el, src, type);
              success = true;
            } else {
              console.log('⏳ Waiting for Instagram script...');
            }
            break;

          default:
            console.warn('⚠️ Unknown embed type:', type);
            showFallback(el, src, type);
            success = true;
        }

        if (!success) {
          retryCountRef.current.set(embedKey, retryCount + 1);
          if (retryCount + 1 >= maxRetries) {
            showFallback(el, src, type);
          }
        } else {
          processedIdsRef.current.add(embedKey);
        }

      } catch (error) {
        console.error(`❌ Error processing ${type} embed:`, error);
        retryCountRef.current.set(embedKey, retryCount + 1);
        if (retryCount + 1 >= maxRetries) {
          showFallback(el, src, type);
        }
      }
    }
  }, [scriptStatus, processYouTubeEmbed, processTwitterEmbed, processInstagramEmbed, showFallback]);

  // 🔧 FIX: Better script loading logic
  useEffect(() => {
    if (!content) return;

    const hasTwitter = content.includes('data-type="twitter"');
    const hasInstagram = content.includes('data-type="instagram"');

    console.log('📊 Embed detection:', { hasTwitter, hasInstagram });

    if (hasTwitter && scriptStatus.twitter === 'idle') {
      console.log('🚀 Initiating Twitter script load');
      loadTwitterScript().catch(err => {
        console.error('Failed to load Twitter script:', err);
      });
    }

    if (hasInstagram && scriptStatus.instagram === 'idle') {
      console.log('🚀 Initiating Instagram script load');
      loadInstagramScript().catch(err => {
        console.error('Failed to load Instagram script:', err);
      });
    }
  }, [content, scriptStatus.twitter, scriptStatus.instagram, loadTwitterScript, loadInstagramScript]);

  // Process embeds when content or scripts change
  useEffect(() => {
    console.log('🔄 Processing embeds with status:', scriptStatus);
    const timer = setTimeout(() => {
      processEmbeds();
    }, 200);

    return () => clearTimeout(timer);
  }, [content, scriptStatus, processEmbeds]);

  // 🔧 DEBUG: Log content on mount
  useEffect(() => {
    console.log('🎬 SocialEmbedRenderer mounted');
    console.log('📄 Content preview:', content.substring(0, 200));
    
    return () => {
      console.log('👋 SocialEmbedRenderer unmounting');
    };
  }, []);

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
        
        .twitter-tweet,
        .twitter-tweet-container,
        .twitter-tweet-container > * {
          margin-left: auto !important;
          margin-right: auto !important;
          max-width: 550px !important;
        }
        
        .embed-fallback a {
          word-break: break-word;
          display: inline-block;
          max-width: 100%;
        }

        /* Loading states */
        .twitter-tweet-container:empty::after {
          content: "Loading tweet...";
          display: block;
          text-align: center;
          padding: 3rem;
          color: #9ca3af;
        }

        /* Ensure embeds are centered and responsive */
        [data-social-embed] {
          width: 100%;
          display: flex;
          justify-content: center;
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