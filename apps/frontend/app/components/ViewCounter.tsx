"use client";

import { useEffect } from 'react';

interface ViewCounterProps {
  postId: string;
}

const ViewCounter = ({ postId }: ViewCounterProps) => {
  useEffect(() => {
    // This function will run once when the component mounts on the client
    const incrementView = () => {
      // We don't need to await the result.
      // navigator.sendBeacon is a modern, reliable way to send a request
      // without blocking the page or waiting for a response.
      // Perfect for analytics like view counting.
      navigator.sendBeacon(`/api/posts/${postId}/view`);
    };

    incrementView();
  }, [postId]); // Dependency array ensures this runs only once per post ID

  // This component doesn't render any UI
  return null; 
};

export default ViewCounter;
