/**
 * Optimized Content Processor for Social Media Embeds
 * Performance improvements: reduced regex complexity, early returns, minimal allocations
 */

export const processContentForEmbeds = (content: string): string => {
  if (!content || typeof content !== 'string') return '';

  try {
    // Single-pass normalization
    let processed = content.replace(/\r\n/g, '\n');

    // YouTube: Optimized regex with non-greedy matching
    processed = processed.replace(
      /(<p[^>]*?>)?\s*(<a[^>]*?>)?\s*(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11}))(?:[^\s<]*?)\s*(<\/a>)?\s*(<\/p>)?/gi,
      (_match, _openP, _openA, url, videoId) => 
        `<div data-social-embed="true" data-type="youtube" data-src="${url}" data-id="${videoId}"></div>`
    );

    // Twitter/X: Combined pattern for both domains
    processed = processed.replace(
      /(<p[^>]*?>)?\s*(<a[^>]*?>)?\s*(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([\w]+)\/status(?:es)?\/(\d+))(?:[^\s<]*?)\s*(<\/a>)?\s*(<\/p>)?/gi,
      (_match, _openP, _openA, url, _username, tweetId) => {
        const cleanUrl = url.replace('x.com', 'twitter.com').split(/[?#]/)[0];
        return `<div data-social-embed="true" data-type="twitter" data-src="${cleanUrl}" data-id="${tweetId}"></div>`;
      }
    );

    // Instagram: Simplified pattern
    processed = processed.replace(
      /(<p[^>]*?>)?\s*(<a[^>]*?>)?\s*(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([\w-]+))(?:[^\s<]*?)\s*(<\/a>)?\s*(<\/p>)?/gi,
      (_match, _openP, _openA, url, postId) => {
        const cleanUrl = url.split(/[?#]/)[0];
        const finalUrl = cleanUrl.endsWith('/') ? cleanUrl : `${cleanUrl}/`;
        return `<div data-social-embed="true" data-type="instagram" data-src="${finalUrl}" data-id="${postId}"></div>`;
      }
    );

    // Single-pass cleanup
    processed = processed
      .replace(/\?(?:utm_[^\s<]+|igsh=[^\s<]+|fbclid=[^\s<]+|feature=[^\s<]+)/gi, '')
      .replace(/^\s*\?[^\n]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n');

    return processed;
  } catch (error) {
    console.error('Content processing error:', error);
    return content;
  }
};

// Optimized detection with early returns
export const hasSocialEmbeds = (content: string): { 
  hasYouTube: boolean; 
  hasTwitter: boolean; 
  hasInstagram: boolean; 
} => {
  if (!content) return { hasYouTube: false, hasTwitter: false, hasInstagram: false };

  try {
    // Use indexOf for faster detection before regex
    return {
      hasYouTube: content.includes('youtube.com') || content.includes('youtu.be'),
      hasTwitter: content.includes('twitter.com') || content.includes('x.com/'),
      hasInstagram: content.includes('instagram.com'),
    };
  } catch {
    return { hasYouTube: false, hasTwitter: false, hasInstagram: false };
  }
};

// Optimized URL extraction with Set for deduplication
export const extractSocialUrls = (content: string): {
  youtube: string[];
  twitter: string[];
  instagram: string[];
} => {
  if (!content) return { youtube: [], twitter: [], instagram: [] };

  try {
    const urls = {
      youtube: new Set<string>(),
      twitter: new Set<string>(),
      instagram: new Set<string>()
    };

    // Extract YouTube URLs
    for (const match of content.matchAll(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/gi)) {
      urls.youtube.add(match[0].split(/[?&]/)[0]);
    }

    // Extract Twitter URLs
    for (const match of content.matchAll(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([\w]+)\/status(?:es)?\/(\d+)/gi)) {
      urls.twitter.add(match[0].split(/[?#]/)[0].replace('x.com', 'twitter.com'));
    }

    // Extract Instagram URLs
    for (const match of content.matchAll(/https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([\w-]+)/gi)) {
      const url = match[0].split(/[?#]/)[0];
      urls.instagram.add(url.endsWith('/') ? url : `${url}/`);
    }

    return {
      youtube: Array.from(urls.youtube),
      twitter: Array.from(urls.twitter),
      instagram: Array.from(urls.instagram)
    };
  } catch (error) {
    console.error('URL extraction error:', error);
    return { youtube: [], twitter: [], instagram: [] };
  }
};

// Simplified validation
export const isValidSocialUrl = (url: string, type: 'youtube' | 'twitter' | 'instagram'): boolean => {
  if (!url) return false;

  try {
    const patterns = {
      youtube: /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/,
      twitter: /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[\w]+\/status(?:es)?\/\d+/,
      instagram: /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[\w-]+\/?$/
    };

    return patterns[type].test(url);
  } catch {
    return false;
  }
};