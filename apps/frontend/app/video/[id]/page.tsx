"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { sendNewSubscriberNotification } from "@/app/utils/notifications/subscriptionNotificatons";
import ShareModal from "@/app/components/ShareModal";
import { Users, Bell, BellRing, BellOff, ThumbsUp, ThumbsDown, Share2, Download, MoreHorizontal } from "lucide-react";
import { doc, onSnapshot, Timestamp, getDoc, setDoc, deleteDoc, collection, query, getDocs, increment, updateDoc } from "firebase/firestore";
import { useAuth } from "@/app/context/AuthContext";
import Header from "@/app/components/Sidebar";
import Footer from "@/app/components/Footer";
import UserAvatar from "@/app/components/UserAvatar";
import { db } from "@/app/firebase/config";
import AirenaVideoPlayer from "@/app/components/CustomVideoPlayer";
import CommentSection from "@/app/components/CommentSection";

interface VideoData {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  description?: string;
  category?: string;
  createdAt?: Timestamp;
  authorId?: string;
  authorName?: string;
  authorPhotoURL?: string | null;
  views?: number;
  tags?: string[];
  isLive?: boolean;
}

type NotificationPreference = "all" | "personalized" | "none" | "unsubscribed";

const VideoPlayerPage = () => {
  const { user } = useAuth();
  const params = useParams();
const videoId =
  typeof params?.id === "string" ? params.id : null;
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // const [videoId, setVideoId] = useState<string | null>(null);
  const [notificationPreference, setNotificationPreference] = useState<NotificationPreference>("unsubscribed");
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const viewLoggedRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!videoId) {
    setIsLoading(false);
    return;
  }

  setIsLoading(true);

  const videoDocRef = doc(db, "videos", videoId);

  const unsubscribe = onSnapshot(
    videoDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        setVideoData({ id: docSnap.id, ...docSnap.data() } as VideoData);
      } else {
        setVideoData(null);
      }
      setIsLoading(false);
    },
    (error) => {
      console.error("Video fetch error:", error);
      setIsLoading(false);
    }
  );

  return () => unsubscribe();
}, [videoId]);


  // Real-time subscription status listener
  useEffect(() => {
    if (!user || !videoData?.authorId) return;

    const followingRef = doc(db, `users/${user.uid}/following`, videoData.authorId);
    
    const unsubscribe = onSnapshot(followingRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsSubscribed(true);
        const pref = docSnap.data()?.notificationPreference || "all";
        setNotificationPreference(pref);
      } else {
        setIsSubscribed(false);
        setNotificationPreference("unsubscribed");
      }
    }, (error) => {
      console.error("Error listening to subscription:", error);
    });

    return () => unsubscribe();
  }, [user, videoData?.authorId]);

  // Real-time subscriber count listener
  useEffect(() => {
    if (!videoData?.authorId) return;

    const channelRef = doc(db, "channels", videoData.authorId);
    
    const unsubscribe = onSnapshot(channelRef, (docSnap) => {
      if (docSnap.exists()) {
        const channelData = docSnap.data();
        setSubscriberCount(channelData?.subscriberCount || 0);
      } else {
        setSubscriberCount(0);
      }
    }, (error) => {
      console.error("Error listening to subscriber count:", error);
    });

    return () => unsubscribe();
  }, [videoData?.authorId]);

  // Load video reactions
  useEffect(() => {
    const loadReactions = async () => {
      if (!videoId) return;

      try {
        const reactionsRef = collection(db, `videos/${videoId}/reactions`);
        const reactionsQuery = query(reactionsRef);
        const reactionsSnapshot = await getDocs(reactionsQuery);

        let likes = 0;
        let dislikes = 0;
        let userLiked = false;
        let userDisliked = false;

        reactionsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === "like") {
            likes++;
            if (user && doc.id === user.uid) userLiked = true;
          } else if (data.type === "dislike") {
            dislikes++;
            if (user && doc.id === user.uid) userDisliked = true;
          }
        });

        setLikeCount(likes);
        setDislikeCount(dislikes);
        setHasLiked(userLiked);
        setHasDisliked(userDisliked);
      } catch (error) {
        console.error("Error loading reactions:", error);
      }
    };

    loadReactions();
  }, [videoId, user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotificationDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const logView = async () => {
      if (videoId && !viewLoggedRef.current) {
        viewLoggedRef.current = true;

        try {
          const headers = new Headers();
          if (user) {
            const token = await user.getIdToken();
            headers.append('Authorization', `Bearer ${token}`);
          }
          
          const response = await fetch(`/api/videos/${videoId}`, {
            method: 'POST',
            headers: headers,
          });

          if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
          }

          const data = await response.json();
          console.log('View logged:', data.message);

        } catch (error) {
          viewLoggedRef.current = false;
          console.error("Failed to log view:", error);
        }
      }
    };

    logView();
  }, [videoId, user]);

  const handleSubscribe = async () => {
    if (!user || !videoData?.authorId || isProcessing) return;

    setIsProcessing(true);

    try {
      const followingRef = doc(db, "users", user.uid, "following", videoData.authorId);
      const channelRef = doc(db, "channels", videoData.authorId);

      if (isSubscribed) {
        // UNSUBSCRIBE
        await deleteDoc(followingRef);

        // Update channel subscriber count
        // const channelSnap = await getDoc(channelRef);
        // if (channelSnap.exists()) {
        await updateDoc(channelRef, {
            subscriberCount: increment(-1)
           });
        console.log("Unsubscribed successfully");
      } else {
        // SUBSCRIBE
        await setDoc(followingRef, {
          followedAt: Timestamp.now(),
          notificationPreference: "all",
          creatorId: videoData.authorId,
          creatorName: videoData.authorName || "Unknown",
        });
        await updateDoc(channelRef, {
        subscriberCount: increment(1),});
      
        // Create notification for the creator
        const notificationRef = doc(collection(db, `users/${videoData.authorId}/notifications`));
        await sendNewSubscriberNotification({
  recipientId: videoData.authorId,
  subscriberUserId: user.uid,
  subscriberName: user.displayName || "Someone",
  subscriberPhotoURL: user.photoURL,
  channelName: videoData.authorName || "Unknown Channel",
});

        console.log("Subscribed successfully");
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
      alert("Failed to update subscription. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNotificationChange = async (pref: NotificationPreference) => {
    if (!user || !videoData?.authorId || isProcessing) return;

    setIsProcessing(true);

    try {
      const followingRef = doc(db, `users/${user.uid}/following`, videoData.authorId);
      const channelRef = doc(db, "channels", videoData.authorId);

      if (pref === "unsubscribed") {
        // UNSUBSCRIBE
        await deleteDoc(followingRef);
      } else {
        // UPDATE NOTIFICATION PREFERENCE
        await setDoc(followingRef, {
          followedAt: Timestamp.now(),
          notificationPreference: pref,
          creatorId: videoData.authorId,
          creatorName: videoData.authorName || "Unknown",
        }, { merge: true });
      }

      setShowNotificationDropdown(false);
    } catch (error) {
      console.error("Error updating notification preference:", error);
      alert("Failed to update notification settings. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVideoReaction = async (reactionType: "like" | "dislike") => {
    if (!user || !videoId) return;

    try {
      const reactionRef = doc(db, `videos/${videoId}/reactions`, user.uid);
      const isSameReaction = (reactionType === "like" && hasLiked) || (reactionType === "dislike" && hasDisliked);

      if (isSameReaction) {
        // Remove reaction
        await deleteDoc(reactionRef);
        if (reactionType === "like") {
          setHasLiked(false);
          setLikeCount((prev) => Math.max(0, prev - 1));
        } else {
          setHasDisliked(false);
          setDislikeCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        // Add or change reaction
        await setDoc(reactionRef, {
          userId: user.uid,
          type: reactionType,
          createdAt: Timestamp.now(),
        });

        if (reactionType === "like") {
          setHasLiked(true);
          setLikeCount((prev) => prev + 1);
          if (hasDisliked) {
            setHasDisliked(false);
            setDislikeCount((prev) => Math.max(0, prev - 1));
          }
        } else {
          setHasDisliked(true);
          setDislikeCount((prev) => prev + 1);
          if (hasLiked) {
            setHasLiked(false);
            setLikeCount((prev) => Math.max(0, prev - 1));
          }
        }
      }
    } catch (error) {
      console.error("Error toggling video reaction:", error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
    if (diffDays > 30) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? "s" : ""} ago`;
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return "Today";
  };

  const getNotificationIcon = () => {
    switch (notificationPreference) {
      case "all":
        return <BellRing className="w-5 h-5" />;
      case "personalized":
        return <Bell className="w-5 h-5" />;
      case "none":
        return <BellOff className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <Header />
        <div className="pt-28 flex-grow flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!videoData && !isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <Header />
        <div className="pt-28 container mx-auto px-4 text-center flex-grow flex flex-col items-center justify-center" style={{ marginLeft: "var(--sidebar-width, 0rem)" }}>
          <div className="text-lg text-gray-300">No video found.</div>
          <Link href="/watch" className="mt-8 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-full text-white font-semibold transition-colors">
            Go back
          </Link>
        </div>
        <Footer />
      </div>
    );
  }
  if (!videoData) return null;
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Header />
      <main className="flex-grow pt-20 flex flex-col items-center" style={{ marginLeft: "var(--sidebar-width, 0rem)" }}>
        <div className="w-full max-w-5xl mx-auto px-2">
          {/* Video Player */}
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-3">
            <AirenaVideoPlayer 
              videoUrl={videoData.videoUrl} 
              poster={videoData.thumbnailUrl}
              isLive={videoData.isLive}
              userId={user?.uid}
              contentId={videoId ?? undefined}
              contentTitle={videoData.title}
              thumbnailUrl={videoData.thumbnailUrl}
              authorName={videoData.authorName}
            />
            <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
              {videoData.isLive && (
                <div className="bg-red-500 px-3 py-1 rounded-md flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="font-bold text-white">LIVE</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Video Title */}
          {videoData.title && (
            <h1 className="text-xl font-bold text-white mb-2">{videoData.title}</h1>
          )}

          {/* Video Info Bar */}
          <div className="flex items-center justify-between gap-4 mb-3">
            {/* Left: Author Info & Subscribe */}
            <div className="flex items-center gap-3 flex-1 min-w-0">

  {/* CLICKABLE AUTHOR */}
<div className="flex items-center gap-3 min-w-0">
  <UserAvatar
    userId={videoData.authorId}
    alt={videoData.authorName}
    size={40}
  />

  <Link 
    href={`/profile/${videoData.authorId}`}
    className="flex-1 min-w-0"
  >
    <div className="font-semibold truncate hover:underline cursor-pointer">
      {videoData.authorName || "Unknown"}
    </div>
    <div className="text-xs text-gray-400">
      {subscriberCount > 0
        ? `${formatNumber(subscriberCount)} subscribers`
        : "No subscribers yet"}
    </div>
  </Link>
</div>        
              {/* Subscribe Button & Notification Bell */}
              {user && videoData.authorId && videoData.authorId !== user.uid && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSubscribe}
                    disabled={isProcessing}
                    className={`px-4 py-2 rounded-full font-semibold transition-colors text-sm ${
                      isSubscribed
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-white hover:bg-gray-200 text-black"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isProcessing ? "..." : (isSubscribed ? "Subscribed" : "Subscribe")}
                  </button>
                  
                  {isSubscribed && (
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                        disabled={isProcessing}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50"
                        title="Notification preferences"
                      >
                        {getNotificationIcon()}
                      </button>
                      
                      {showNotificationDropdown && (
                        <div className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 overflow-hidden">
                          <div className="p-3 border-b border-gray-700">
                            <h3 className="font-semibold text-white">Notifications</h3>
                          </div>
                          
                          <button
                            onClick={() => handleNotificationChange("all")}
                            disabled={isProcessing}
                            className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-start gap-3 disabled:opacity-50"
                          >
                            <BellRing className={`w-5 h-5 mt-0.5 ${notificationPreference === "all" ? "text-white" : "text-gray-400"}`} />
                            <div className="flex-1">
                              <div className={`font-medium ${notificationPreference === "all" ? "text-white" : "text-gray-300"}`}>
                                All
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                Get all notifications from this channel
                              </div>
                            </div>
                            {notificationPreference === "all" && (
                              <div className="w-2 h-2 bg-white rounded-full mt-2" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleNotificationChange("personalized")}
                            disabled={isProcessing}
                            className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-start gap-3 disabled:opacity-50"
                          >
                            <Bell className={`w-5 h-5 mt-0.5 ${notificationPreference === "personalized" ? "text-white" : "text-gray-400"}`} />
                            <div className="flex-1">
                              <div className={`font-medium ${notificationPreference === "personalized" ? "text-white" : "text-gray-300"}`}>
                                Personalised
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                Get occasional notifications
                              </div>
                            </div>
                            {notificationPreference === "personalized" && (
                              <div className="w-2 h-2 bg-white rounded-full mt-2" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleNotificationChange("none")}
                            disabled={isProcessing}
                            className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-start gap-3 disabled:opacity-50"
                          >
                            <BellOff className={`w-5 h-5 mt-0.5 ${notificationPreference === "none" ? "text-white" : "text-gray-400"}`} />
                            <div className="flex-1">
                              <div className={`font-medium ${notificationPreference === "none" ? "text-white" : "text-gray-300"}`}>
                                None
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                Turn off all notifications
                              </div>
                            </div>
                            {notificationPreference === "none" && (
                              <div className="w-2 h-2 bg-white rounded-full mt-2" />
                            )}
                          </button>
                          
                          <div className="border-t border-gray-700">
                            <button
                              onClick={() => handleNotificationChange("unsubscribed")}
                              disabled={isProcessing}
                              className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              <div className="font-medium text-gray-300">Unsubscribe</div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Like/Dislike */}
              <div className="flex items-center bg-gray-800 rounded-full overflow-hidden">
                <button
                  onClick={() => handleVideoReaction("like")}
                  disabled={!user}
                  className={`flex items-center gap-2 px-4 py-2 transition-colors border-r border-gray-700 ${
                    hasLiked ? "text-white bg-gray-700" : "text-gray-300 hover:bg-gray-700"
                  }`}
                  title={!user ? "Sign in to like" : "Like"}
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-sm font-semibold">{formatNumber(likeCount)}</span>
                </button>
                <button
                  onClick={() => handleVideoReaction("dislike")}
                  disabled={!user}
                  className={`flex items-center gap-2 px-4 py-2 transition-colors ${
                    hasDisliked ? "text-white bg-gray-700" : "text-gray-300 hover:bg-gray-700"
                  }`}
                  title={!user ? "Sign in to dislike" : "Dislike"}
                >
                  <ThumbsDown className="w-5 h-5" />
                  <span className="text-sm font-semibold">{dislikeCount > 0 ? formatNumber(dislikeCount) : ""}</span>
                </button>
              </div>

              {/* Share */}
              {/* <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
                <Share2 className="w-5 h-5" />
                <span className="text-sm font-semibold">Share</span>
              </button> */}
<button
  onClick={() => setOpenShare(true)}
  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full"
>
  <Share2 className="w-5 h-5" />
  Share
</button>

<ShareModal
  open={openShare}
  onClose={() => setOpenShare(false)}
  videoId={videoId!}
  title={videoData.title}
/>
              {/* Download */}
              {/* <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
                <Download className="w-5 h-5" />
              </button> */}

              {/* More */}
              <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Views and Date */}
          {(videoData.views !== undefined || videoData.createdAt) && (
            <div className="text-sm text-gray-400 mb-3">
              {videoData.views !== undefined && (
                <span>{formatNumber(videoData.views)} views</span>
              )}
              {videoData.views !== undefined && videoData.createdAt && <span> • </span>}
              {videoData.createdAt && <span>{formatDate(videoData.createdAt)}</span>}
            </div>
          )}
          
          {/* Description */}
          {videoData.description && (
            <div className="mb-6 bg-gray-900 rounded-xl p-4">
              <p className="text-gray-300 text-sm whitespace-pre-line leading-relaxed">
                {videoData.description}
              </p>
            </div>
          )}
          
          <CommentSection 
            contentId={videoData.id} 
            contentType="video"
            contentOwnerId={videoData.authorId}
            contentTitle={videoData.title}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VideoPlayerPage;