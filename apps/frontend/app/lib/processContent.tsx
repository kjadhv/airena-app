export const processContentForEmbeds = (content: string): string => {
  if (!content) return '';

  let processedContent = content;

  const youtubeRegex = /(?:<p[^>]*>)?(?:<a[^>]*>)?\s*(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:[^\s<]*)?)\s*(?:<\/a>)?(?:<\/p>)?/gi;
  const twitterRegex = /(?:<p[^>]*>)?(?:<a[^>]*>)?\s*(https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/(?:#!\/)?(?:[\w]+)\/status(?:es)?\/(?:\d+)(?:[^\s<]*)?)\s*(?:<\/a>)?(?:<\/p>)?/gi;
  const instagramRegex = /(?:<p[^>]*>)?(?:<a[^>]*>)?\s*(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([\w-]+)\/?(?:[^\s<]*)?)\s*(?:<\/a>)?(?:<\/p>)?/gi;

  processedContent = processedContent
    .replace(youtubeRegex, (match, url) => {
      const cleanUrl = url.trim().replace(/<\/?[^>]+(>|$)/g, '').split('&')[0];
      return `<div data-social-embed data-type="youtube" data-src="${cleanUrl}"></div>`;
    })
    .replace(twitterRegex, (match, url) => {
      const cleanUrl = url.trim().replace(/<\/?[^>]+(>|$)/g, '').split('?')[0];
      return `<div data-social-embed data-type="twitter" data-src="${cleanUrl}"></div>`;
    })
    .replace(instagramRegex, (match, url) => {
      const cleanUrl = url.trim().replace(/<\/?[^>]+(>|$)/g, '').split('?')[0];
      const finalUrl = cleanUrl.endsWith('/') ? cleanUrl : cleanUrl + '/';
      return `<div data-social-embed data-type="instagram" data-src="${finalUrl}"></div>`;
    });

  return processedContent;
};

export const hasSocialEmbeds = (content: string): { 
  hasYouTube: boolean; 
  hasTwitter: boolean; 
  hasInstagram: boolean; 
} => {
  return {
    hasYouTube: /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)/i.test(content),
    hasTwitter: /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/(?:\w+)\/status/i.test(content),
    hasInstagram: /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\//i.test(content),
  };
};