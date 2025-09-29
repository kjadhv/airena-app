"use client";
import React, { useState, useEffect, useMemo, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import { db } from '@/app/firebase/config';
import { collection, query, where, getDocs, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Upload, Eye, Users, Video as VideoIcon, Youtube, Twitter, Edit2, Trash2, X, AlertTriangle, Image as ImageIcon, Tag, Film, Gamepad2, CheckCircle, MoreVertical } from 'lucide-react';
import UserAvatar from '@/app/components/UserAvatar';
import AppImage from '@/app/components/AppImage';
import { Dialog, Transition } from '@headlessui/react';
import { getStorage, ref, deleteObject, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// --- Interfaces ---
interface Video {
    id: string;
    title: string;
    description: string;
    category: 'games' | 'sports';
    tags?: string[]; // Made optional for older data
    visibility?: 'public' | 'private'; // Made optional for older data
    createdAt: string; 
    views: number;
    videoUrl: string;
    thumbnailUrl?: string; // Made optional for older data
}
interface Channel {
    channelName: string;
    photoURL: string | null;
    youtubeLink?: string;
    twitterLink?: string;
    subscribers: number;
}

const CreatorDashboardPage = () => {
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
            router.push('/');
        }
        if (user && isCreator) {
            const fetchCreatorData = async () => {
                setIsLoadingContent(true);
                setFetchError(null);
                try {
                    const channelRef = doc(db, 'channels', user.uid);
                    const channelSnap = await getDoc(channelRef);
                    if (channelSnap.exists()) {
                        setChannel(channelSnap.data() as Channel);
                    }

                    const videosRef = collection(db, 'videos');
                    const q = query(videosRef, where('authorId', '==', user.uid), orderBy('createdAt', 'desc'));
                    const querySnapshot = await getDocs(q);
                    
                    const videosData = querySnapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                        } as Video;
                    });
                    setVideos(videosData);

                } catch (error) {
                    console.error("Failed to fetch creator data:", error);
                    setFetchError("Failed to load your content. Please try again.");
                } finally {
                    setIsLoadingContent(false);
                }
            };
            fetchCreatorData();
        }
    }, [user, loading, isCreator, router]);

    if (loading || isLoadingContent || !isCreator) {
        return <div className="h-screen bg-black flex items-center justify-center text-white">Verifying Creator Access...</div>;
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
        setVideos(videos.map(v => v.id === updatedVideo.id ? updatedVideo : v));
    };

    const handleVideoDeleted = (videoId: string) => {
        setVideos(videos.filter(v => v.id !== videoId));
    };

    return (
        <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow pt-28 pb-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
                        <div className="flex items-center gap-6">
                            <UserAvatar src={channel?.photoURL || user?.photoURL} alt={channel?.channelName || user?.displayName || 'User'} size={80} />
                            <div>
                                <h1 className="text-4xl font-bold">{channel?.channelName || user?.displayName}</h1>
                                <p className="text-gray-400 text-lg">Creator Dashboard</p>
                            </div>
                        </div>
                        <Link href="/creator/dashboard/upload" className="mt-6 sm:mt-0 w-full sm:w-auto bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2 transform hover:scale-105 transition-transform shadow-lg">
                            <Upload size={18} /> Upload Video
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <StatCard icon={Eye} label="Total Views" value={totalViews.toLocaleString()} />
                        <StatCard icon={Users} label="Subscribers" value={channel?.subscribers.toLocaleString() || '0'} />
                        <StatCard icon={VideoIcon} label="Videos Uploaded" value={videos.length.toLocaleString()} />
                    </div>

                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-2xl font-bold mb-6 text-white">Your Content</h2>
                        <div className="overflow-x-auto">
                            {fetchError ? (
                                <p className="text-center py-8 text-red-500">{fetchError}</p>
                            ) : videos.length === 0 ? (
                                <p className="text-center py-12 text-gray-400">You haven&apos;t uploaded any videos yet.</p>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="text-sm text-gray-400 uppercase bg-white/5">
                                        <tr>
                                            <th className="p-4 font-medium">Video</th>
                                            <th className="p-4 font-medium">Status</th>
                                            <th className="p-4 font-medium hidden lg:table-cell">Date Uploaded</th>
                                            <th className="p-4 font-medium hidden sm:table-cell">Views</th>
                                            <th className="p-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {videos.map(video => (
                                            <VideoRow 
                                                key={video.id} 
                                                video={video} 
                                                onEdit={() => openEditModal(video)}
                                                onDelete={() => openDeleteModal(video)}
                                            />
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
                    <EditVideoModal 
                        isOpen={isEditModalOpen} 
                        setIsOpen={setIsEditModalOpen}
                        video={selectedVideo}
                        onVideoUpdated={handleVideoUpdated}
                    />
                    <DeleteConfirmationModal
                        isOpen={isDeleteModalOpen}
                        setIsOpen={setIsDeleteModalOpen}
                        video={selectedVideo}
                        onVideoDeleted={handleVideoDeleted}
                    />
                </>
            )}
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-6 shadow-md">
        <div className="bg-emerald-500/20 p-4 rounded-xl">
            <Icon className="text-emerald-400" size={28} />
        </div>
        <div>
            <p className="text-gray-400 text-sm">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
        </div>
    </div>
);

const VideoRow = ({ video, onEdit, onDelete }: { video: Video, onEdit: () => void, onDelete: () => void }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const createdAtDate = new Date(video.createdAt);
    const visibility = video.visibility || 'private';

    return (
        <tr className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors">
            <td className="p-4">
                <div className="flex items-center gap-4">
                     <div className="w-24 h-14 bg-black rounded-md shrink-0 relative overflow-hidden">
                        <AppImage src={video.thumbnailUrl || ''} alt={video.title} fallbackText="Thumb" />
                    </div>
                    <span className="font-semibold text-white line-clamp-2">{video.title}</span>
                </div>
            </td>
            <td className="p-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    visibility === 'public' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                    {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
                </span>
            </td>
            <td className="p-4 text-gray-400 hidden lg:table-cell">{createdAtDate.toLocaleDateString()}</td>
            <td className="p-4 text-gray-400 hidden sm:table-cell">{video.views?.toLocaleString() || 0}</td>
            <td className="p-4 text-right relative">
                <button onBlur={() => setTimeout(() => setIsMenuOpen(false), 100)} onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <MoreVertical size={20} />
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                        <button onClick={() => { onEdit(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors">
                            <Edit2 size={16} /> Edit
                        </button>
                        <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-left text-red-400 hover:bg-gray-700 transition-colors">
                            <Trash2 size={16} /> Delete
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
};

const EditVideoModal = ({ isOpen, setIsOpen, video, onVideoUpdated }: { isOpen: boolean, setIsOpen: (open: boolean) => void, video: Video, onVideoUpdated: (video: Video) => void }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState(video);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const tagInputRef = useRef<HTMLInputElement>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    const [newThumbnailFile, setNewThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

    useEffect(() => {
        setFormData({ 
            ...video, 
            visibility: video.visibility || 'private',
            tags: video.tags || [] 
        });
        setThumbnailPreview(video.thumbnailUrl || null);
        setNewThumbnailFile(null);
    }, [video]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

     const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNewThumbnailFile(file);
            setThumbnailPreview(URL.createObjectURL(file));
        }
    };
    
    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === ',' || e.key === 'Enter') && tagInputRef.current?.value.trim()) {
            e.preventDefault();
            const newTag = tagInputRef.current.value.trim();
            if (newTag && !(formData.tags ?? []).includes(newTag)) {
                setFormData(prev => ({ ...prev, tags: [...(prev.tags ?? []), newTag] }));
            }
            if(tagInputRef.current) tagInputRef.current.value = '';
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({ ...prev, tags: (prev.tags ?? []).filter(tag => tag !== tagToRemove) }));
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        setError('');
        try {
            const updatedData = { ...formData };
            if (newThumbnailFile) {
                const storage = getStorage();
                const newThumbnailPath = `thumbnails/${user.uid}/${Date.now()}_${newThumbnailFile.name}`;
                const storageRef = ref(storage, newThumbnailPath);
                const uploadTask = uploadBytesResumable(storageRef, newThumbnailFile);
                const snapshot = await uploadTask;
                const downloadURL = await getDownloadURL(snapshot.ref);
                updatedData.thumbnailUrl = downloadURL;

                if (video.thumbnailUrl) {
                    const oldThumbRef = ref(storage, video.thumbnailUrl);
                    await deleteObject(oldThumbRef).catch(e => console.error("Could not delete old thumbnail:", e));
                }
            }

            const idToken = await user.getIdToken();
            const response = await fetch(`/api/videos/${video.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(updatedData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update video.');
            }
            onVideoUpdated(updatedData);
            setIsOpen(false);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                         <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-white mb-6">Edit Video Details</Dialog.Title>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-sm font-medium text-gray-400 mb-2 block">Thumbnail</label>
                                        <div className="aspect-video w-1/2 bg-gray-800 rounded-lg relative group">
                                            <AppImage src={thumbnailPreview || ''} alt="Thumbnail preview" fallbackText="Thumb" />
                                            <button 
                                                onClick={() => thumbnailInputRef.current?.click()}
                                                className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                                <Edit2 size={24} />
                                                <span className="ml-2 font-semibold">Change</span>
                                            </button>
                                        </div>
                                         <input id="thumbnail" type="file" ref={thumbnailInputRef} accept="image/png, image/jpeg" onChange={handleThumbnailChange} className="hidden" />
                                    </div>
                                    <div>
                                        <label htmlFor="edit-title" className="text-sm font-medium text-gray-400">Title</label>
                                        <input id="edit-title" type="text" name="title" value={formData.title} onChange={handleChange} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-emerald-500 focus:border-emerald-500" />
                                    </div>
                                    <div>
                                        <label htmlFor="edit-description" className="text-sm font-medium text-gray-400">Description</label>
                                        <textarea id="edit-description" name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-emerald-500 focus:border-emerald-500" />
                                    </div>
                                    <div>
                                        <label htmlFor="edit-tags" className="text-sm font-medium text-gray-400">Tags</label>
                                        <div className="flex flex-wrap gap-2 p-2 mt-1 bg-gray-800 border border-gray-700 rounded-lg">
                                            {(formData.tags ?? []).map(tag => (
                                                <span key={tag} className="flex items-center bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full text-xs font-medium">
                                                    {tag}
                                                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-emerald-300 hover:text-white"><X size={12} /></button>
                                                </span>
                                            ))}
                                            <input 
                                                ref={tagInputRef}
                                                type="text" 
                                                placeholder="Add tag & press Enter" 
                                                onKeyDown={handleTagInputKeyDown} 
                                                className="flex-1 bg-transparent outline-none px-2 py-1 text-sm" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="edit-visibility" className="text-sm font-medium text-gray-400">Visibility</label>
                                        <select id="edit-visibility" name="visibility" value={formData.visibility} onChange={handleChange} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-emerald-500 focus:border-emerald-500">
                                            <option value="public">Public</option>
                                            <option value="private">Private</option>
                                        </select>
                                    </div>

                                     {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                                </div>
                                <div className="mt-8 flex justify-end gap-4">
                                    <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/10 rounded-lg hover:bg-white/20">Cancel</button>
                                    <button type="button" onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Changes'}</button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

const DeleteConfirmationModal = ({ isOpen, setIsOpen, video, onVideoDeleted }: { isOpen: boolean, setIsOpen: (open: boolean) => void, video: Video, onVideoDeleted: (videoId: string) => void }) => {
    const { user } = useAuth();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        if (!user) return;
        setIsDeleting(true);
        setError('');
        try {
            const idToken = await user.getIdToken();
            const response = await fetch(`/api/videos/${video.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete video from database.');
            }
            
            const storage = getStorage();
            if (video.videoUrl) {
                const videoRef = ref(storage, video.videoUrl);
                await deleteObject(videoRef).catch(e => console.warn("Could not delete video file:", e));
            }
            if (video.thumbnailUrl) {
                const thumbRef = ref(storage, video.thumbnailUrl);
                await deleteObject(thumbRef).catch(e => console.warn("Could not delete thumbnail file:", e));
            }

            onVideoDeleted(video.id);
            setIsOpen(false);
        } catch (err) {
             setError((err as Error).message || 'Failed to delete video and associated files.');
            console.error(err);
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                 <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-white flex items-center gap-2">
                                    <AlertTriangle className="text-red-500" />
                                    Confirm Deletion
                                </Dialog.Title>
                                <div className="mt-4">
                                    <p className="text-sm text-gray-300">
                                        Are you sure you want to delete &quot<span className="font-semibold text-white">{video.title}</span>&quot? This action is permanent and cannot be undone.
                                    </p>
                                    {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                                </div>
                                <div className="mt-8 flex justify-end gap-4">
                                    <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/10 rounded-lg hover:bg-white/20">Cancel</button>
                                    <button type="button" onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">{isDeleting ? 'Deleting...' : 'Delete Video'}</button>
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

