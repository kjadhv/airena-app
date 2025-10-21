/**
 * Enhanced Content Processor for Social Media Embeds
 * Handles YouTube, Twitter/X, and Instagram embeds with robust error handling
 */

export const processContentForEmbeds = (content: string): string => {
  if (!content || typeof content !== 'string') return '';

  let processedContent = content;

  try {
    // Step 1: Pre-process - normalize line breaks and whitespace
    processedContent = processedContent.replace(/\r\n/g, '\n');

    // Step 2: Process YouTube URLs
    // Matches: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
    // Captures entire paragraph/link structure and ALL trailing content
    processedContent = processedContent.replace(
      /(<p[^>]*?>)?[\s]*(<a[^>]*?>)?[\s]*(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})(?:[^\s<]*?)?)[\s]*(<\/a>)?[\s]*(<\/p>)?(?:[^\S\n]*(?:\?[^\s<\n]+)?)?/gi,
      (match, openP, openA, url, videoId) => {
        console.log('🎥 YouTube detected:', videoId);
        return `<div data-social-embed="true" data-type="youtube" data-src="${url}" data-id="${videoId}" data-processed="false"></div>`;
      }
    );

    // Step 3: Process Twitter/X URLs
    // Matches both twitter.com and x.com domains
    processedContent = processedContent.replace(
      /(<p[^>]*?>)?[\s]*(<a[^>]*?>)?[\s]*(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[\w]+\/status(?:es)?\/(\d+)(?:[^\s<]*?)?)[\s]*(<\/a>)?[\s]*(<\/p>)?(?:[^\S\n]*(?:\?[^\s<\n]+)?)?/gi,
      (match, openP, openA, url, tweetId) => {
        console.log('🐦 Twitter detected:', tweetId);
        const cleanUrl = url.split('?')[0].split('#')[0];
        const normalizedUrl = cleanUrl.replace('x.com', 'twitter.com');
        return `<div data-social-embed="true" data-type="twitter" data-src="${normalizedUrl}" data-id="${tweetId}" data-processed="false"></div>`;
      }
    );

    // Step 4: Process Instagram URLs
    // Matches /p/, /reel/, /tv/ formats
    processedContent = processedContent.replace(
      /(<p[^>]*?>)?[\s]*(<a[^>]*?>)?[\s]*(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([\w-]+)\/?(?:[^\s<]*?)?)[\s]*(<\/a>)?[\s]*(<\/p>)?(?:[^\S\n]*(?:\?[^\s<\n]+)?)?/gi,
      (match, openP, openA, url, postId) => {
        console.log('📸 Instagram detected:', postId);
        const cleanUrl = url.split('?')[0].split('#')[0];
        const finalUrl = cleanUrl.endsWith('/') ? cleanUrl : cleanUrl + '/';
        return `<div data-social-embed="true" data-type="instagram" data-src="${finalUrl}" data-id="${postId}" data-processed="false"></div>`;
      }
    );

    // Step 5: Aggressive cleanup of orphaned query parameters
    // Remove any leftover utm/tracking parameters that might have escaped
    processedContent = processedContent.replace(/\?(?:utm_[^\s<]+|igsh=[^\s<]+|fbclid=[^\s<]+|feature=[^\s<]+)/gi, '');
    
    // Remove any standalone query strings on their own line
    processedContent = processedContent.replace(/^\s*\?[^\n]+$/gm, '');
    
    // Clean up excessive whitespace
    processedContent = processedContent.replace(/\n{3,}/g, '\n\n');

    console.log('✅ Content processing complete');
    return processedContent;

  } catch (error) {
    console.error('❌ Error processing content:', error);
    // Return original content if processing fails
    return content;
  }
};

export const hasSocialEmbeds = (content: string): { 
  hasYouTube: boolean; 
  hasTwitter: boolean; 
  hasInstagram: boolean; 
} => {
  if (!content || typeof content !== 'string') {
    return { hasYouTube: false, hasTwitter: false, hasInstagram: false };
  }

  try {
    return {
      hasYouTube: /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/i.test(content),
      hasTwitter: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[\w]+\/status(?:es)?\/\d+/i.test(content),
      hasInstagram: /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[\w-]+/i.test(content),
    };
  } catch (error) {
    console.error('Error detecting social embeds:', error);
    return { hasYouTube: false, hasTwitter: false, hasInstagram: false };
  }
};

export const extractSocialUrls = (content: string): {
  youtube: string[];
  twitter: string[];
  instagram: string[];
} => {
  const urls = {
    youtube: [] as string[],
    twitter: [] as string[],
    instagram: [] as string[]
  };

  if (!content || typeof content !== 'string') return urls;

  try {
    // Extract YouTube URLs
    const youtubeMatches = content.matchAll(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/gi);
    for (const match of youtubeMatches) {
      const url = match[0].split('?')[0].split('&')[0];
      if (!urls.youtube.includes(url)) urls.youtube.push(url);
    }

    // Extract Twitter URLs
    const twitterMatches = content.matchAll(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([\w]+)\/status(?:es)?\/(\d+)/gi);
    for (const match of twitterMatches) {
      const url = match[0].split('?')[0].split('#')[0].replace('x.com', 'twitter.com');
      if (!urls.twitter.includes(url)) urls.twitter.push(url);
    }

    // Extract Instagram URLs
    const instagramMatches = content.matchAll(/https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([\w-]+)/gi);
    for (const match of instagramMatches) {
      const url = match[0].split('?')[0].split('#')[0];
      const finalUrl = url.endsWith('/') ? url : url + '/';
      if (!urls.instagram.includes(finalUrl)) urls.instagram.push(finalUrl);
    }

    return urls;
  } catch (error) {
    console.error('Error extracting social URLs:', error);
    return urls;
  }
};

/**
 * Validates if a URL is a valid social media URL
 */
export const isValidSocialUrl = (url: string, type: 'youtube' | 'twitter' | 'instagram'): boolean => {
  if (!url || typeof url !== 'string') return false;

  try {
    const patterns = {
      youtube: /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})$/,
      twitter: /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[\w]+\/status(?:es)?\/\d+$/,
      instagram: /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[\w-]+\/?$/
    };

    return patterns[type].test(url);
  } catch (error) {
    console.error('Error validating social URL:', error);
    return false;
  }
};