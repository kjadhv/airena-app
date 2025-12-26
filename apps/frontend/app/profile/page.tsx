// app/profile/page.tsx
"use client";

import React, { useState, useEffect, JSX } from "react";
import Link from "next/link";
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
  Check,
  X,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { db } from "@/app/firebase/config";
import {
  doc,
  updateDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

// --- HELPER COMPONENT DEFINITIONS ---

interface StatCardProps { icon: React.ReactNode; label: string; value: string; }
function StatCard({ icon, label, value }: StatCardProps): JSX.Element {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 group">
      <div className="flex items-center gap-2 text-gray-500 mb-2 group-hover:text-emerald-400 transition-colors">
        <div className="w-4 h-4">{icon}</div>
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-medium text-white">{value}</p>
    </div>
  );
}

interface DashboardCardProps { icon: React.ReactNode; title: string; description: string; href: string; buttonText: string; color: 'emerald' | 'blue' | 'red'; }
function DashboardCard({ icon, title, description, href, buttonText, color }: DashboardCardProps): JSX.Element {
  const colors = {
    emerald: { border: "border-emerald-500/20", hoverBorder: "hover:border-emerald-500/40", shadow: "shadow-emerald-500/20", button: "bg-emerald-500 hover:bg-emerald-400" },
    blue: { border: "border-blue-500/20", hoverBorder: "hover:border-blue-500/40", shadow: "shadow-blue-500/20", button: "bg-blue-500 hover:bg-blue-400" },
    red: { border: "border-red-500/20", hoverBorder: "hover:border-red-500/40", shadow: "shadow-red-500/20", button: "bg-red-500 hover:bg-red-400" }
  };
  const c = colors[color];
  return (
    <div className={`relative bg-gradient-to-br from-gray-900/5 via-gray-900/10 to-gray-900/5 border ${c.border} rounded-lg p-8 overflow-hidden group ${c.hoverBorder} transition-all ${c.shadow} shadow-lg`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
      <div className="relative flex flex-col sm:flex-row items-start justify-between sm:items-center">
        <div>
          <div className="flex items-center gap-3 mb-3"><div className="p-2 bg-gray-800/50 rounded-lg">{icon}</div><h3 className="text-lg font-medium text-white">{title}</h3></div>
          <p className="text-sm text-gray-400 mb-6 max-w-xl">{description}</p>
        </div>
        <Link href={href} className="flex-shrink-0 mt-4 sm:mt-0"><button className={`px-5 py-2.5 ${c.button} text-black text-sm font-medium rounded-lg transition-all hover:scale-105 shadow-lg`}>{buttonText}</button></Link>
      </div>
    </div>
  );
}

interface TabContentProps { activeTab: 'overview' | 'activity' | 'following'; }
function TabContent({ activeTab }: TabContentProps): JSX.Element | null {
  const EmptyState = ({ icon, title, message }: { icon: React.ReactNode; title: string; message: string; }) => (
    <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-16 text-center">
      {icon}<h3 className="text-base font-medium mb-2 text-white">{title}</h3><p className="text-sm text-gray-500">{message}</p>
    </div>
  );
  if (activeTab === "overview") return <EmptyState icon={<Video className="w-12 h-12 text-gray-700 mx-auto mb-4" />} title="No activity yet" message="Start watching streams to see your activity here" />;
  if (activeTab === "activity") return <EmptyState icon={<Video className="w-12 h-12 text-gray-700 mx-auto mb-4" />} title="No watch history" message="Your watched streams will appear here" />;
  if (activeTab === "following") return <EmptyState icon={<User className="w-12 h-12 text-gray-700 mx-auto mb-4" />} title="Not following anyone" message="Follow creators to see them here" />;
  return null;
}

// --- MAIN PROFILE PAGE COMPONENT ---

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
  watchTime: number; // Total seconds watching videos
  videosUploaded: number; // Videos uploaded by THIS user
  followedCreators: number;
  joinDate: string;
}

export default function ProfilePage(): JSX.Element {
  const { 
    user: authUser, 
    loading: authLoading,
    isCreator,
    isBlogAdmin,
    isSuperAdmin,
  } = useAuth();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "following">("overview");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [newBio, setNewBio] = useState<string>("");

  // Fetch real stats from Firebase
  useEffect(() => {
    if (authUser) {
      const userRef = doc(db, "users", authUser.uid);
      const unsubscribe = onSnapshot(userRef, async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUser({
            uid: authUser.uid,
            displayName: authUser.displayName || "Unnamed User",
            email: authUser.email || "No email provided",
            photoURL: authUser.photoURL,
            isCreator: data.isCreator || false,
            isAdmin: data.isAdmin || false,
            bio: data.bio || "Welcome to my profile!",
          });
          setNewBio(data.bio || "");

          // Get watch time in SECONDS from Firebase
          const totalWatchTimeSeconds = data.stats?.totalWatchTimeSeconds || 0;

          // ✅ NEW: Count videos UPLOADED by this user
          const videosQuery = query(
            collection(db, "videos"),
            where("authorId", "==", authUser.uid)
          );
          const videosSnapshot = await getDocs(videosQuery);
          const videosUploaded = videosSnapshot.size;

          setStats({
            watchTime: totalWatchTimeSeconds,
            videosUploaded: videosUploaded, // Changed from streamsWatched
            followedCreators: 0, // TODO: Implement later
            joinDate: authUser.metadata.creationTime || new Date().toISOString(),
          });
        } else {
          // Create user document if doesn't exist
          await setDoc(userRef, {
            uid: authUser.uid,
            displayName: authUser.displayName || "Unnamed User",
            email: authUser.email || "No email provided",
            photoURL: authUser.photoURL || null,
            isCreator: false,
            isAdmin: false,
            bio: "Welcome to my profile!",
            createdAt: serverTimestamp(),
            stats: {
              totalWatchTimeSeconds: 0,
            }
          });
          
          setStats({
            watchTime: 0,
            videosUploaded: 0,
            followedCreators: 0,
            joinDate: authUser.metadata.creationTime || new Date().toISOString(),
          });
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authUser, authLoading]);

  const handleSaveBio = async () => {
    if (!authUser || !user) return;
    try {
      const userRef = doc(db, "users", authUser.uid);
      await updateDoc(userRef, { bio: newBio });
      setUser({ ...user, bio: newBio });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving bio:", error);
    }
  };

  // Smart format function that shows seconds when needed
  const formatWatchTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatJoinDate = (dateString: string): string => new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "long" });

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!authUser || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-lg">You must be logged in to view this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-gray-900 bg-gradient-to-r from-gray-950 via-emerald-950/10 to-gray-950">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-lg font-medium text-white tracking-tight">Profile</h1>
         <Link href="/settings">
  <button className="p-2 hover:bg-gray-900 rounded-lg transition-all">
    <Settings className="w-5 h-5 text-gray-400" />
  </button>
</Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-start gap-8 mb-12">
          <div className="relative group flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 blur-xl opacity-60 group-hover:opacity-80 transition-opacity animate-pulse"></div>
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 p-1 shadow-[0_0_30px_rgba(16,185,129,0.6)]">
              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                {user.photoURL ? ( <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" /> ) : (
                  <span className="text-3xl font-medium text-gray-400">{user.displayName?.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            <button className="absolute bottom-0 right-0 p-1.5 bg-emerald-600 rounded-full hover:bg-emerald-500 transition-all opacity-0 group-hover:opacity-100"><Camera className="w-3.5 h-3.5 text-white" /></button>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-medium bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{user.displayName}</h2>
              {isSuperAdmin && <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-md text-xs font-medium text-red-400"><Shield className="w-3.5 h-3.5" /> Super Admin</span>}
              {isCreator && <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-xs font-medium text-emerald-400"><Crown className="w-3.5 h-3.5" /> Creator</span>}
            </div>
            <p className="text-sm text-gray-500 mb-6">{user.email}</p>
            {!isEditing ? (
              <div className="group flex items-start gap-3">
                <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">{user.bio || "No bio yet."}</p>
                <button onClick={() => setIsEditing(true)} className="p-1.5 hover:bg-gray-900 rounded transition opacity-0 group-hover:opacity-100"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
              </div>
            ) : (
              <div className="max-w-2xl">
                <textarea value={newBio} onChange={(e) => setNewBio(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm" rows={3} />
                <div className="flex gap-2 mt-3">
                  <button onClick={handleSaveBio} className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-100 flex items-center gap-2"><Check className="w-4 h-4" /> Save</button>
                  <button onClick={() => { setIsEditing(false); setNewBio(user.bio); }} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {stats && <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
            <StatCard icon={<Video />} label="Watch Time" value={formatWatchTime(stats.watchTime)} />
            <StatCard icon={<Award />} label="Videos Uploaded" value={stats.videosUploaded.toString()} />
            <StatCard icon={<User />} label="Following" value={stats.followedCreators.toString()} />
            <StatCard icon={<Calendar />} label="Joined" value={formatJoinDate(stats.joinDate)} />
          </div>
        }

        {(isSuperAdmin || isBlogAdmin || isCreator) && (
          <div className="space-y-6 mb-12">
            <h3 className="text-lg font-medium text-gray-400 tracking-tight">Dashboards & Tools</h3>
            {isSuperAdmin && <DashboardCard icon={<Shield className="w-5 h-5 text-red-400" />} title="Super Admin Dashboard" description="Access all administrative tools and manage the entire platform." href="/admin/dashboard" buttonText="Go to Admin Panel" color="red" />}
            {isBlogAdmin && !isSuperAdmin && <DashboardCard icon={<LayoutDashboard className="w-5 h-5 text-blue-400" />} title="Blog Admin Dashboard" description="Manage blog posts, review submissions, and moderate content." href="/blogs" buttonText="Go to Blog Panel" color="blue" />}
            {isCreator && !isSuperAdmin && <DashboardCard icon={<Crown className="w-5 h-5 text-emerald-400" />} title="Creator Dashboard" description="Access your streaming tools, analytics, and manage your content." href="/creator/dashboard" buttonText="Go to Dashboard" color="emerald" />}
          </div>
        )}

        <div className="border-b border-gray-800 mb-8">
          <div className="flex gap-8">
            {(["overview", "activity", "following"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 text-sm font-medium capitalize transition-all relative ${activeTab === tab ? "text-white" : "text-gray-500 hover:text-gray-300"}`}>
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>}
              </button>
            ))}
          </div>
        </div>
        <TabContent activeTab={activeTab} />
      </div>
    </div>
  );
}