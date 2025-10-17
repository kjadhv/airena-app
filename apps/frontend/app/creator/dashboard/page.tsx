"use client";

import React, { useState, useEffect, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Header from "@/app/components/Sidebar"; // keep as original project import
import Footer from "@/app/components/Footer";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/app/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  doc,
  getDoc,
  DocumentData,
} from "firebase/firestore";
import {
  Upload,
  Eye,
  Users,
  Video as VideoIcon,
  Edit2,
  Trash2,
  MoreVertical,
  Crown,
  Settings,
} from "lucide-react";
import AppImage from "@/app/components/AppImage";
import { Dialog, Transition } from "@headlessui/react";
import {
  getStorage,
  ref as storageRef,
  deleteObject,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import GoLiveButton from "@/app/components/GoLiveButton";

// --- Interfaces ---
interface Video {
  id: string;
  title: string;
  description: string;
  category?: "games" | "sports" | string;
  tags?: string[];
  visibility?: "public" | "private";
  createdAt: string; // ISO string in state
  views: number;
  videoUrl?: string;
  thumbnailUrl?: string;
}
interface Channel {
  channelName: string;
  photoURL: string | null;
  youtubeLink?: string;
  twitterLink?: string;
  subscribers?: number;
}

const CreatorDashboardPage: React.FC = () => {
  const { user, loading, isCreator } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  useEffect(() => {
    if (!loading && !isCreator) {
      router.replace("/");
      return;
    }

    if (user && isCreator) {
      (async () => {
        setIsLoadingContent(true);
        setFetchError(null);
        try {
          // fetch channel
          const channelRef = doc(db, "channels", user.uid);
          const channelSnap = await getDoc(channelRef);
          if (channelSnap.exists()) setChannel(channelSnap.data() as Channel);

          // fetch videos authored by user
          const videosRef = collection(db, "videos");
          const q = query(
            videosRef,
            where("authorId", "==", user.uid),
            orderBy("createdAt", "desc")
          );
          const querySnapshot = await getDocs(q);
          const videosData: Video[] = querySnapshot.docs.map((d) => {
            const data = d.data() as DocumentData;
            // createdAt may be a Firestore Timestamp or number/string
            let createdAtISO = new Date().toISOString();
            if (data.createdAt instanceof Timestamp) createdAtISO = data.createdAt.toDate().toISOString();
            else if (typeof data.createdAt === "number") createdAtISO = new Date(data.createdAt).toISOString();
            else if (typeof data.createdAt === "string") createdAtISO = data.createdAt;

            return {
              id: d.id,
              title: data.title || "Untitled",
              description: data.description || "",
              category: data.category,
              tags: data.tags || [],
              visibility: data.visibility || "private",
              createdAt: createdAtISO,
              views: data.views || 0,
              videoUrl: data.videoUrl,
              thumbnailUrl: data.thumbnailUrl,
            } as Video;
          });

          setVideos(videosData);
        } catch (err) {
          console.error("Failed to fetch creator data:", err);
          setFetchError("Failed to load your content. Please try again later.");
        } finally {
          setIsLoadingContent(false);
        }
      })();
    }
  }, [user, loading, isCreator, router]);

  if (loading || isLoadingContent || !isCreator) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white">
        Verifying Creator Access...
      </div>
    );
  }

  const totalViews = videos.reduce((acc, video) => acc + (video.views || 0), 0);

  const openEditModal = (video: Video) => {
    setSelectedVideo(video);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (video: Video) => {
    setSelectedVideo(video);
    setIsDeleteModalOpen(true);
  };

  const handleVideoUpdated = (updatedVideo: Video) => {
    setVideos((prev) => prev.map((v) => (v.id === updatedVideo.id ? updatedVideo : v)));
  };

  const handleVideoDeleted = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  };

  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      <Header />

      {/* Enhanced Header */}
      <div className="border-b border-gray-900 bg-gradient-to-r from-gray-950 via-emerald-950/10 to-gray-950 pt-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-medium text-white tracking-tight">Creator Dashboard</h1>
          <button className="p-2 hover:bg-gray-900 rounded-lg transition-all hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/20 cursor-pointer">
            <Settings className="w-5 h-5 text-gray-400 hover:text-emerald-400 transition-colors" />
          </button>
        </div>
      </div>

      <main className="flex-grow pb-16">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Profile Section */}
          <div className="flex items-start gap-8 mb-12">
            {/* Avatar with Neon Glow */}
            <div className="relative group flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300 animate-pulse"></div>
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 p-1 shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:shadow-[0_0_50px_rgba(16,185,129,0.9)] transition-all duration-300 group-hover:scale-105">
                <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden ring-2 ring-emerald-400/20">
                  {channel?.photoURL || user?.photoURL ? (
                    <Image 
                      src={channel?.photoURL || user?.photoURL || ""} 
                      alt={channel?.channelName || user?.displayName || "User"} 
                      width={112}
                      height={112}
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-3xl font-medium text-gray-400 group-hover:text-emerald-400 transition-colors">
                      {(channel?.channelName || user?.displayName || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-medium text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {channel?.channelName || user?.displayName}
                </h2>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-xs font-medium text-emerald-400 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:scale-105 animate-pulse">
                  <Crown className="w-3.5 h-3.5" /> Creator
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-6">Manage your content and analytics</p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <GoLiveButton />
                <Link href="/creator/dashboard/upload">
                  <button className="px-5 py-2.5 bg-emerald-500 text-black text-sm font-medium rounded-lg hover:bg-emerald-400 transition-all hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/50 cursor-pointer flex items-center gap-2">
                    <Upload size={16} /> Upload Video
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:border-emerald-500/50 transition-all hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/10 group">
              <div className="flex items-center gap-2 text-gray-500 mb-2 group-hover:text-emerald-400 transition-colors">
                <Eye className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Total Views</span>
              </div>
              <p className="text-2xl font-medium text-white">{totalViews.toLocaleString()}</p>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:border-emerald-500/50 transition-all hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/10 group">
              <div className="flex items-center gap-2 text-gray-500 mb-2 group-hover:text-emerald-400 transition-colors">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Subscribers</span>
              </div>
              <p className="text-2xl font-medium text-white">{(channel?.subscribers || 0).toLocaleString()}</p>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:border-emerald-500/50 transition-all hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/10 group">
              <div className="flex items-center gap-2 text-gray-500 mb-2 group-hover:text-emerald-400 transition-colors">
                <VideoIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Videos</span>
              </div>
              <p className="text-2xl font-medium text-white">{videos.length.toLocaleString()}</p>
            </div>
          </div>

          {/* Content Table */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-lg font-medium text-white">Your Content</h2>
            </div>
            <div className="overflow-x-auto">
              {fetchError ? (
                <div className="p-16 text-center">
                  <p className="text-red-400 text-sm">{fetchError}</p>
                </div>
              ) : videos.length === 0 ? (
                <div className="p-16 text-center">
                  <VideoIcon className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-base font-medium mb-2 text-white">No videos yet</h3>
                  <p className="text-sm text-gray-500">Upload your first video to get started</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800">
                    <tr>
                      <th className="p-4 font-medium text-left">Video</th>
                      <th className="p-4 font-medium text-left">Status</th>
                      <th className="p-4 font-medium text-left hidden lg:table-cell">Date</th>
                      <th className="p-4 font-medium text-left hidden sm:table-cell">Views</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((video) => (
                      <VideoRow key={video.id} video={video} onEdit={() => openEditModal(video)} onDelete={() => openDeleteModal(video)} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {selectedVideo && (
        <>
          <EditVideoModal isOpen={isEditModalOpen} setIsOpen={setIsEditModalOpen} video={selectedVideo} onVideoUpdated={handleVideoUpdated} />
          <DeleteConfirmationModal isOpen={isDeleteModalOpen} setIsOpen={setIsDeleteModalOpen} video={selectedVideo} onVideoDeleted={handleVideoDeleted} />
        </>
      )}
    </div>
  );
};

const VideoRow: React.FC<{ video: Video; onEdit: () => void; onDelete: () => void }> = ({ video, onEdit, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const createdAtDate = new Date(video.createdAt);
  const visibility = video.visibility || "private";
  const btnRef = useRef<HTMLButtonElement | null>(null);

  return (
    <tr className="border-b border-gray-800 last:border-b-0 hover:bg-gray-900/50 transition-colors">
      <td className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-24 h-14 bg-gray-800 rounded-md shrink-0 relative overflow-hidden border border-gray-700">
            <AppImage src={video.thumbnailUrl || ""} alt={video.title} fallbackText="Thumb" />
          </div>
          <span className="font-medium text-white line-clamp-2 text-sm">{video.title}</span>
        </div>
      </td>
      <td className="p-4">
        <span
          className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
            visibility === "public" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"
          }`}
        >
          {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
        </span>
      </td>
      <td className="p-4 text-gray-400 text-sm hidden lg:table-cell">{createdAtDate.toLocaleDateString()}</td>
      <td className="p-4 text-gray-400 text-sm hidden sm:table-cell">{(video.views || 0).toLocaleString()}</td>
      <td className="p-4 text-right relative">
        <button
          ref={btnRef}
          onClick={() => setIsMenuOpen((s) => !s)}
          onBlur={() => setTimeout(() => setIsMenuOpen(false), 120)}
          className="p-2 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
        >
          <MoreVertical size={18} className="text-gray-400" />
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden">
            <button onClick={() => { onEdit(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-white hover:bg-gray-700 transition-colors text-sm cursor-pointer">
              <Edit2 size={16} /> Edit
            </button>
            <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-400 hover:bg-gray-700 transition-colors text-sm cursor-pointer">
              <Trash2 size={16} /> Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

const EditVideoModal: React.FC<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  video: Video;
  onVideoUpdated: (video: Video) => void;
}> = ({ isOpen, setIsOpen, video, onVideoUpdated }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Video>(video);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const [newThumbnailFile, setNewThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(video.thumbnailUrl || null);

  useEffect(() => {
    setFormData({ ...video });
    setThumbnailPreview(video.thumbnailUrl || null);
    setNewThumbnailFile(null);
  }, [video]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setNewThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "," || e.key === "Enter") && tagInputRef.current?.value.trim()) {
      e.preventDefault();
      const newTag = tagInputRef.current.value.trim();
      if (newTag && !(formData.tags ?? []).includes(newTag)) {
        setFormData((prev) => ({ ...prev, tags: [...(prev.tags ?? []), newTag] }));
      }
      if (tagInputRef.current) tagInputRef.current.value = "";
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({ ...prev, tags: (prev.tags ?? []).filter((t) => t !== tagToRemove) }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setError("");
    try {
      const updatedData: Partial<Video> & Record<string, unknown> = { ...formData };

      if (newThumbnailFile) {
        const storage = getStorage();
        // upload to a sensible path; use user.uid and timestamp to avoid collisions
        const path = `thumbnails/${user.uid}/${Date.now()}_${newThumbnailFile.name}`;
        const ref = storageRef(storage, path);
        const uploadResult = await uploadBytes(ref, newThumbnailFile);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        updatedData.thumbnailUrl = downloadURL;

        // try deleting old thumb if it exists. deleteObject works with refs created from the download URL too.
        if (video.thumbnailUrl) {
          try {
            const oldRef = storageRef(storage, video.thumbnailUrl);
            await deleteObject(oldRef).catch(() => {});
          } catch (e) {
            // ignore - deleting by URL may fail depending on how thumbnailUrl was stored
            console.warn("Could not delete old thumbnail (ignored)", e);
          }
        }
      }

      const idToken = await user.getIdToken();
      const response = await fetch(`/api/videos/${video.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to update video.");
      }

      onVideoUpdated(updatedData as Video);
      setIsOpen(false);
    } catch (err) {
      setError((err as Error).message || "Failed to save changes.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-gray-900 border border-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-xl font-medium leading-6 text-white mb-6">
                  Edit Video Details
                </Dialog.Title>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">Thumbnail</label>
                    <div className="aspect-video w-1/2 bg-gray-800 rounded-lg relative group border border-gray-700 overflow-hidden">
                      <AppImage src={thumbnailPreview || ""} alt="Thumbnail preview" fallbackText="Thumb" />
                      <button
                        type="button"
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer"
                      >
                        <Edit2 size={20} />
                        <span className="ml-2 font-medium text-sm">Change</span>
                      </button>
                    </div>
                    <input id="thumbnail" type="file" ref={thumbnailInputRef} accept="image/png, image/jpeg" onChange={handleThumbnailChange} className="hidden" />
                  </div>

                  <div>
                    <label htmlFor="edit-title" className="text-sm font-medium text-gray-400 block mb-2">
                      Title
                    </label>
                    <input id="edit-title" name="title" value={formData.title} onChange={handleChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                  </div>

                  <div>
                    <label htmlFor="edit-description" className="text-sm font-medium text-gray-400 block mb-2">
                      Description
                    </label>
                    <textarea id="edit-description" name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none" />
                  </div>

                  <div>
                    <label htmlFor="edit-tags" className="text-sm font-medium text-gray-400 block mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-800 border border-gray-700 rounded-lg min-h-[44px]">
                      {(formData.tags ?? []).map((tag) => (
                        <span key={tag} className="flex items-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md text-xs font-medium">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 text-emerald-400 hover:text-white transition-colors cursor-pointer">
                            ×
                          </button>
                        </span>
                      ))}
                      <input ref={tagInputRef} type="text" placeholder="Add tag & press Enter" onKeyDown={handleTagInputKeyDown} className="flex-1 bg-transparent outline-none px-2 py-1 text-sm text-white placeholder-gray-500 min-w-[150px]" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="edit-visibility" className="text-sm font-medium text-gray-400 block mb-2">
                      Visibility
                    </label>
                    <select id="edit-visibility" name="visibility" value={formData.visibility} onChange={handleChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all cursor-pointer">
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-black bg-emerald-500 rounded-lg hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

const DeleteConfirmationModal: React.FC<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  video: Video;
  onVideoDeleted: (videoId: string) => void;
}> = ({ isOpen, setIsOpen, video, onVideoDeleted }) => {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    setError("");
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/videos/${video.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to delete video from database.");
      }

      const storage = getStorage();
      if (video.videoUrl) {
        try {
          const vRef = storageRef(storage, video.videoUrl);
          await deleteObject(vRef).catch((e) => console.warn("Could not delete video file:", e));
        } catch (e) {
          console.warn("delete video failed (ignored)", e);
        }
      }
      if (video.thumbnailUrl) {
        try {
          const tRef = storageRef(storage, video.thumbnailUrl);
          await deleteObject(tRef).catch((e) => console.warn("Could not delete thumbnail file:", e));
        } catch (e) {
          console.warn("delete thumb failed (ignored)", e);
        }
      }

      onVideoDeleted(video.id);
      setIsOpen(false);
    } catch (err) {
      setError((err as Error).message || "Failed to delete video and associated files.");
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gray-900 border border-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-xl font-medium leading-6 text-white flex items-center gap-2 mb-4">
                  Confirm Deletion
                </Dialog.Title>

                <div className="mt-4">
                  <p className="text-sm text-gray-300">
                    Are you sure you want to delete <span className="font-semibold text-white">&ldquo;{video.title}&rdquo;</span>? This action is permanent and cannot be undone.
                  </p>
                  {error && <p className="text-red-400 text-sm mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {isDeleting ? "Deleting..." : "Delete Video"}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CreatorDashboardPage;