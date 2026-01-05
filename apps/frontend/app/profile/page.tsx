"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  Settings,
  Shield,
  Crown,
  Video,
  Calendar,
  Award,
  Edit2,
  Camera,
  Loader2,
  LayoutDashboard,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  Clock,
  X,
} from "lucide-react";

import { useAuth } from "@/app/context/AuthContext";
import { db } from "@/app/firebase/config";
import {
  doc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  setDoc,
  deleteDoc,
  increment,
  getDoc,
  serverTimestamp,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { sendNewSubscriberNotification } from "@/app/utils/notifications/subscriptionNotificatons";

/* ================= TYPES ================= */

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  isCreator: boolean;
  isAdmin: boolean;
  bio: string;
}

interface UserStats {
  watchTime: number;
  videosUploaded: number;
  followers: number;
  joinDate: string;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
}

interface ActivityVideo {
  id: string;
  title: string;
  watchedAt: string;
  authorName?: string;
}
interface FollowingUser {
  uid: string;
  displayName: string;
  photoURL: string | null;
}
interface TopVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  views: number;
}
interface WatchLaterVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  authorName: string;
  addedAt: string;
}
/* ================= MAIN PAGE ================= */

export default function ProfilePage({
  profileUserId,
}: {
  profileUserId?: string;
}) {

  const {
    user: authUser,
    loading: authLoading,
    isCreator,
    isBlogAdmin,
    isSuperAdmin,
  } = useAuth();
  const userId = profileUserId || authUser?.uid;
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    watchTime: 0,
    videosUploaded: 0,
    followers: 0,
    joinDate: "",
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
  });
  const [topVideos, setTopVideos] = useState<TopVideo[]>([]);
  const [watchLaterVideos, setWatchLaterVideos] = useState<WatchLaterVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [watchLaterLoading, setWatchLaterLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newBio, setNewBio] = useState("");
  const [activeTab, setActiveTab] =
    useState<"overview" | "activity" | "following">("overview");

  /* ===== ACTIVITY ===== */
  const [activityHistory, setActivityHistory] = useState<ActivityVideo[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  
  /* ================= USER + CHANNEL ================= */

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubUser = onSnapshot(doc(db, "users", userId), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();

      setUser({
        uid: userId,
        displayName: d.displayName || "User",
        email: d.email || "",
        photoURL: d.photoURL || null,
        isCreator: d.isCreator || false,
        isAdmin: d.isAdmin || false,
        bio: d.bio || "",
      });

      setStats((p) => ({
        ...p,
        watchTime: d.watchTime || 0,
        joinDate:
          d.createdAt?.toDate().toISOString() ??
          new Date().toISOString(),
      }));

      setLoading(false);
    });

    const unsubChannel = onSnapshot(
      doc(db, "channels", userId),
      (snap) => {
        setStats((p) => ({
          ...p,
          followers: snap.exists()
            ? snap.data()?.subscriberCount || 0
            : 0,
        }));
      }
    );

    return () => {
      unsubUser();
      unsubChannel();
    };
  }, [userId, authLoading]);

  /* ================= VIDEO STATS & COUNT ================= */

  useEffect(() => {
    if (!authUser) {
      setStatsLoading(false);
      return;
    }

    // Simple query without orderBy to avoid index requirement
    const q = query(
      collection(db, "videos"),
      where("authorId", "==", userId)
    );

    const unsub = onSnapshot(q, async (snap) => {
      try {
        // If no videos, set to 0
        if (snap.empty) {
          setStats((p) => ({
            ...p,
            videosUploaded: 0,
            totalViews: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
          }));
          setTopVideos([]);
          setStatsLoading(false);
          return;
        }

        let views = 0;
        let likes = 0;
        let comments = 0;
        let shares = 0;

        // Sort videos by views in memory
        const sortedDocs = snap.docs.sort((a, b) => {
          const aViews = a.data().views || 0;
          const bViews = b.data().views || 0;
          return bViews - aViews;
        });

        const top: TopVideo[] = [];

        // Process all videos
        const commentPromises = sortedDocs.map(async (docSnap) => {
          const d = docSnap.data();

          views += d.views || 0;
          likes += d.reactions?.likes || 0;
          shares += d.shares || 0;

          if (top.length < 2) {
            top.push({
              id: docSnap.id,
              title: d.title,
              thumbnailUrl: d.thumbnailUrl,
              views: d.views || 0,
            });
          }

          // Get comment count
          const commentsSnap = await getDocs(
            collection(db, "videos", docSnap.id, "comments")
          );
          return commentsSnap.size;
        });

        // Wait for all comment counts
        const commentCounts = await Promise.all(commentPromises);
        comments = commentCounts.reduce((sum, count) => sum + count, 0);

        // Update all stats at once
        setStats((p) => ({
          ...p,
          videosUploaded: snap.size,
          totalViews: views,
          totalLikes: likes,
          totalComments: comments,
          totalShares: shares,
        }));

        setTopVideos(top);
        setStatsLoading(false);
      } catch (error) {
        console.error("Error loading video stats:", error);
        setStatsLoading(false);
      }
    });

    return () => unsub();
  }, [userId]);

  
  /* ================= WATCH LATER ================= */

  useEffect(() => {
    if (!authUser) {
      setWatchLaterLoading(false);
      return;
    }

    const fetchWatchLater = async () => {
      try {
        setWatchLaterLoading(true);

        const q = query(
          collection(db, "users", authUser.uid, "watchLater"),
          orderBy("addedAt", "desc"),
          limit(10)
        );

        const snap = await getDocs(q);

        const videos = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            title: d.title || "Unknown video",
            thumbnailUrl: d.thumbnailUrl || "",
            authorName: d.authorName || "Unknown",
            addedAt:
              d.addedAt instanceof Timestamp
                ? d.addedAt.toDate().toLocaleString()
                : "",
          };
        });

        setWatchLaterVideos(videos);
      } catch (e) {
        console.error("Failed to load watch later", e);
      } finally {
        setWatchLaterLoading(false);
      }
    };

    fetchWatchLater();
  }, [authUser]);

  const handleRemoveFromWatchLater = async (videoId: string) => {
    if (!authUser) return;

    try {
      await deleteDoc(doc(db, "users", authUser.uid, "watchLater", videoId));
      setWatchLaterVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch (error) {
      console.error("Error removing from watch later:", error);
      alert("Failed to remove video. Please try again.");
    }
  };
  /* ================= ACTIVITY HISTORY ================= */

  useEffect(() => {
    if (!authUser || activeTab !== "activity") {
      setActivityLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setActivityLoading(true);

        const q = query(
          collection(db, "users", authUser.uid, "watchHistory"),
          orderBy("lastWatched", "desc"),
          limit(20)
        );

        const snap = await getDocs(q);

        const history = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            title: d.title || "Unknown video",
            watchedAt:
              d.lastWatched instanceof Timestamp
                ? d.lastWatched.toDate().toLocaleString()
                : "",
            authorName: d.authorName || "Unknown",
          };
        });

        setActivityHistory(history);
      } catch (e) {
        console.error("Failed to load activity history", e);
      } finally {
        setActivityLoading(false);
      }
    };

    fetchHistory();
  }, [authUser, activeTab]);

  /* ================= FOLLOWING ================= */

  useEffect(() => {
    if (!authUser || activeTab !== "following") return;

    const fetchFollowing = async () => {
      setFollowingLoading(true);

      const snap = await getDocs(
        collection(db, "users", authUser.uid, "following")
      );

      const users = await Promise.all(
        snap.docs.map(async (d) => {
          const u = await getDoc(doc(db, "users", d.id));
          if (!u.exists()) return null;
          return {
            uid: d.id,
            displayName: u.data().displayName || "User",
            photoURL: u.data().photoURL || null,
          };
        })
      );

      setFollowing(users.filter(Boolean) as FollowingUser[]);
      setFollowingLoading(false);
    };

    fetchFollowing();
  }, [authUser, activeTab]);
  
  /* ================= PROFILE PHOTO UPLOAD ================= */

  const handleProfilePhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!authUser || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    setUploadingPhoto(true);

    try {
      const storage = getStorage();
      const ext = file.name.split(".").pop() || "jpg";
      const timestamp = Date.now();
      const refPath = ref(storage, `profile-photos/${authUser.uid}.${timestamp}.${ext}`);

      await uploadBytes(refPath, file);
      const url = await getDownloadURL(refPath);

      await updateDoc(doc(db, "users", authUser.uid), { photoURL: url });
      await updateDoc(doc(db, "channels", authUser.uid), { photoURL: url });
    
       // IMPORTANT: Also update all existing videos by this author
    const videosQuery = query(
      collection(db, "videos"),
      where("authorId", "==", authUser.uid)
    );
    
    const videosSnapshot = await getDocs(videosQuery);
    const updatePromises = videosSnapshot.docs.map((videoDoc) =>
      updateDoc(doc(db, "videos", videoDoc.id), { authorPhotoURL: url })
    );
    
    await Promise.all(updatePromises);

  } catch (error) {
    console.error("Error uploading photo:", error);
    alert("Failed to upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  /* ================= BIO ================= */

  const saveBio = async () => {
    if (!authUser) return;
    await updateDoc(doc(db, "users", authUser.uid), { bio: newBio });
    setIsEditing(false);
  };

  /* ================= LOAD STATES ================= */

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!authUser || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Login required
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HEADER */}
      <div className="border-b border-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-6 flex justify-between">
          <h1 className="text-lg font-medium">Profile</h1>
          <Link href="/settings">
            <Settings className="w-5 h-5 text-gray-400 hover:text-white" />
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* PROFILE */}
        <div className="flex gap-8 mb-10">
          {/* Profile Picture with Neon Glow */}
          <div className="relative group flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300 animate-pulse"></div>
            
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 p-1 shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:shadow-[0_0_50px_rgba(16,185,129,0.9)] transition-all duration-300 group-hover:scale-105">
              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden ring-2 ring-emerald-400/20">
                {user.photoURL ? (
                  <Image 
                    src={user.photoURL} 
                    alt={user.displayName} 
                    fill 
                    className="object-cover" 
                    key={user.photoURL} // Add this key prop to force re-render
          unoptimized // Add this to bypass Next.js caching
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400 group-hover:text-emerald-400 transition-colors">
                    {user.displayName[0]}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => document.getElementById('profile-photo-input')?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-gray-900 hover:bg-emerald-400 transition-all hover:scale-110 shadow-lg hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Upload profile photo"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-4 h-4 text-black animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-black" />
              )}
            </button>

            <input
              id="profile-photo-input"
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleProfilePhotoChange}
              className="hidden"
            />
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-medium">{user.displayName}</h2>
            <p className="text-gray-400 text-sm">{user.email}</p>

            {!isEditing ? (
              <p className="mt-3 text-gray-300">{user.bio || "No bio yet."}</p>
            ) : (
              <textarea
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="w-full bg-gray-900 border border-gray-800 p-3 rounded-lg mt-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
                rows={3}
              />
            )}

            <div className="mt-3">
              {!isEditing ? (
                <button 
                  onClick={() => {
                    setIsEditing(true);
                    setNewBio(user.bio || "");
                  }}
                  className="flex items-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="text-sm">Edit bio</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={saveBio}
                    className="px-4 py-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-all text-sm font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
 
        {/* SUBSCRIBE */}
        <SubscribeButton
          channelOwnerId={user.uid}
          channelName={user.displayName}
          currentUserId={authUser.uid}
          currentUserName={authUser.displayName || ""}
          currentUserPhoto={authUser.photoURL}
        />

        {/* STATS */}
        <div className="grid grid-cols-4 gap-4 my-10">
          <StatCard icon={<Video />} label="Watch Time" value="—" />
          <StatCard
            icon={<Award />}
            label="Videos"
            value={stats.videosUploaded.toString()}
          />
          <StatCard icon={<User />} label="Followers" value={stats.followers.toString()} />
          <StatCard
            icon={<Calendar />}
            label="Joined"
            value={new Date(stats.joinDate).toLocaleDateString()}
          />
        </div>

        {/* DASHBOARDS */}
        {(isSuperAdmin || isBlogAdmin || isCreator) && (
          <div className="space-y-4 mb-12">
            {isSuperAdmin && (
              <DashboardCard
                icon={<Shield />}
                title="Super Admin Dashboard"
                href="/admin/dashboard"
              />
            )}
            {isBlogAdmin && (
              <DashboardCard
                icon={<LayoutDashboard />}
                title="Blog Admin Dashboard"
                href="/blogs"
              />
            )}
            {isCreator && (
              <DashboardCard
                icon={<Crown />}
                title="Creator Dashboard"
                href="/creator/dashboard"
              />
            )}
          </div>
        )}

        {/* TABS */}
        <div className="border-b border-gray-800 mb-6 flex gap-6">
          {(["overview", "activity", "following"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`pb-3 capitalize ${
                activeTab === t
                  ? "text-white border-b-2 border-emerald-500"
                  : "text-gray-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        {activeTab === "overview" && (
          <div className="space-y-10">
            {/* ANALYTICS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                icon={<Eye />} 
                label="Views" 
                value={statsLoading ? "—" : stats.totalViews.toString()} 
              />
              <StatCard 
                icon={<ThumbsUp />} 
                label="Likes" 
                value={statsLoading ? "—" : stats.totalLikes.toString()} 
              />
              <StatCard 
                icon={<MessageCircle />} 
                label="Comments" 
                value={statsLoading ? "—" : stats.totalComments.toString()} 
              />
              <StatCard 
                icon={<Share2 />} 
                label="Shares" 
                value={statsLoading ? "—" : stats.totalShares.toString()} 
              />
            </div>

            {/* DERIVED METRICS */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard
                icon={<Video />}
                label="Avg Views / Video"
                value={
                  statsLoading 
                    ? "—"
                    : stats.videosUploaded > 0
                    ? Math.round(stats.totalViews / stats.videosUploaded).toString()
                    : "0"
                }
              />
              <StatCard
                icon={<Award />}
                label="Engagement Rate"
                value={
                  statsLoading 
                    ? "—"
                    : stats.totalViews > 0
                    ? (
                        ((stats.totalLikes + stats.totalComments) /
                          stats.totalViews) *
                        100
                      ).toFixed(1) + "%"
                    : "0%"
                }
              />
              <StatCard
                icon={<User />}
                label="Subscribers"
                value={stats.followers.toString()}
              />
            </div>

            {/* TOP VIDEOS */}
            <div>
              <h3 className="text-lg font-medium mb-4">Top Videos</h3>

              {statsLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Loading videos...</span>
                </div>
              ) : topVideos.length === 0 ? (
                <p className="text-gray-500">No videos uploaded yet</p>
              ) : (
                <div className="grid md:grid-cols-5 gap-4">
                  {topVideos.map((v) => (
                    <Link
                      key={v.id}
                      href={`/watch/${v.id}`}
                      className="bg-gray-900 rounded overflow-hidden hover:bg-gray-800 transition"
                    >
                      <Image
                        src={v.thumbnailUrl}
                        alt={v.title}
                        width={600}
                        height={340}
                        className="w-full h-40 object-cover"
                      />
                      <div className="p-4">
                        <p className="font-medium">{v.title}</p>
                        <p className="text-sm text-gray-400">
                          {v.views.toLocaleString()} views
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
        </div>

            {/* WATCH LATER */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-medium">Watch Later</h3>
              </div>

              {watchLaterLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Loading videos...</span>
                </div>
              ) : watchLaterVideos.length === 0 ? (
                <p className="text-gray-500">No videos saved to watch later</p>
              ) : (
                <div className="grid md:grid-cols-5 gap-4">
                  {watchLaterVideos.map((v) => (
                    <div
                      key={v.id}
                      className="bg-gray-900 rounded overflow-hidden hover:bg-gray-800 transition relative group"
                    >
                      <Link href={`/watch/player?v=${v.id}`}>
                        <Image
                          src={v.thumbnailUrl || "/placeholder.jpg"}
                          alt={v.title}
                          width={600}
                          height={340}
                          className="w-full h-40 object-cover"
                        />
                        <div className="p-4">
                          <p className="font-medium">{v.title}</p>
                          <p className="text-sm text-gray-400">{v.authorName}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Added {v.addedAt}
                          </p>
                        </div>
                      </Link>
                      <button
                        onClick={() => handleRemoveFromWatchLater(v.id)}
                        className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-red-600 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from Watch Later"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
         {activeTab === "activity" && (
           <>
             {activityLoading && (
               <p className="text-sm text-gray-400">Loading activity…</p>
             )}

             {!activityLoading && activityHistory.length === 0 && (
               <p className="text-sm text-gray-500">No watch history yet.</p>
             )}

             <ul className="space-y-2 max-h-80 overflow-y-auto">
               {activityHistory.map((v) => (
                 <li key={v.id} className="bg-gray-900/50 px-3 py-2 rounded-md">
                   <div className="text-sm text-gray-200">{v.title}</div>
                   <div className="text-xs text-gray-500">
                     Watched on {v.watchedAt}
                     {v.authorName && ` • ${v.authorName}`}
                   </div>
                 </li>
               ))}
             </ul>
           </>
         )}

         {activeTab === "following" && (
           <>
             {followingLoading && (
               <p className="text-sm text-gray-400">Loading…</p>
             )}

             {!followingLoading && following.length === 0 && (
               <p className="text-gray-500">Not following anyone</p>
             )}

             <div className="grid sm:grid-cols-2 gap-4">
               {following.map((u) => (
                <Link
                   key={u.uid}
                   href={`/profile/${u.uid}`}
                   className="flex items-center gap-4 bg-gray-900 p-4 rounded hover:bg-gray-800 transition"
                 >
                   <Image
                     src={u.photoURL || "/avatar.png"}
                     alt={u.displayName}
                     width={40}
                     height={40}
                     className="rounded-full"
                  />
                   <span>{u.displayName}</span>
                 </Link>
               ))}
             </div>
           </>
         )}
</div></div>);}
/* ================= STAT CARD components ================= */
function DashboardCard({
  icon,
  title,
  href,
}: {
    icon: React.ReactNode;
  title: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="bg-gray-900 p-6 rounded flex gap-4 hover:bg-gray-800 transition-colors">
        {icon}
        <span>{title}</span>
      </div>
    </Link>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-900 p-4 rounded">
      <div className="text-gray-400 text-sm flex gap-2 items-center">
        {icon}
        {label}
      </div>
      <div className="text-2xl mt-1">{value}</div>
    </div>
  );
}

/* ================= SUBSCRIBE BUTTON ================= */

function SubscribeButton({
  channelOwnerId,
  channelName,
  currentUserId,
  currentUserName,
  currentUserPhoto,
}: any) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (currentUserId === channelOwnerId) return null;

  useEffect(() => {
    const ref = doc(db, `users/${currentUserId}/following`, channelOwnerId);
    getDoc(ref).then((d) => setIsSubscribed(d.exists()));
  }, [currentUserId, channelOwnerId]);

  const toggle = async () => {
    setLoading(true);
    const followRef = doc(db, `users/${currentUserId}/following`, channelOwnerId);
    const channelRef = doc(db, "channels", channelOwnerId);

    if (isSubscribed) {
      await deleteDoc(followRef);
      await updateDoc(channelRef, { subscriberCount: increment(-1) });
    } else {
      await setDoc(followRef, {
        followedAt: serverTimestamp(),
        notificationPreference: "all",
      });
      await updateDoc(channelRef, { subscriberCount: increment(1) });

      await sendNewSubscriberNotification({
        recipientId: channelOwnerId,
        subscriberUserId: currentUserId,
        subscriberName: currentUserName,
        subscriberPhotoURL: currentUserPhoto,
        channelName,
      });
    }

    setIsSubscribed(!isSubscribed);
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="px-6 py-2 bg-emerald-600 rounded mb-8 hover:bg-emerald-500 transition-colors disabled:opacity-50"
    >
      {loading ? "Loading..." : isSubscribed ? "Subscribed" : "Subscribe"}
    </button>
  );
}