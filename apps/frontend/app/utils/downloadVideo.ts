// app/utils/downloadVideo.ts

/**
 * Downloads a video file from a URL to the user's device
 * @param videoUrl - The URL of the video to download
 * @param fileName - Optional custom filename (defaults to generated name)
 * @returns Promise that resolves when download starts
 */
export const downloadVideo = async (
  videoUrl: string,
  fileName?: string
): Promise<void> => {
  try {
    // Show loading state (optional - you can handle this in the component)
    console.log('Starting download...');

    // Fetch the video as a blob
    const response = await fetch(videoUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Generate filename if not provided
    const finalFileName = fileName || `video_${Date.now()}.mp4`;

    // Create a temporary URL for the blob
    const blobUrl = window.URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    console.log('Download started successfully');
  } catch (error) {
    console.error('Error downloading video:', error);
    throw error;
  }
};

/**
 * Alternative method using direct link (faster but may not work with all URLs)
 * Use this if the video URL supports direct downloads
 */
export const downloadVideoDirect = (
  videoUrl: string,
  fileName?: string
): void => {
  const link = document.createElement('a');
  link.href = videoUrl;
  link.download = fileName || `video_${Date.now()}.mp4`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Gets appropriate file extension from video URL or mime type
 */
export const getVideoExtension = (url: string, mimeType?: string): string => {
  if (mimeType) {
    const extensionMap: { [key: string]: string } = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/ogg': 'ogg',
      'video/quicktime': 'mov',
    };
    return extensionMap[mimeType] || 'mp4';
  }

  // Try to get extension from URL
  const urlExtension = url.split('.').pop()?.split('?')[0];
  return urlExtension || 'mp4';
};

/**
 * Generates a sanitized filename from video title
 */
export const generateFileName = (title: string, extension: string = 'mp4'): string => {
  const sanitized = title
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 100); // Limit length
  
  return `${sanitized}.${extension}`;
};