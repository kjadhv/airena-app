"use client";
import React, { useState, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { UploadCloud, Film, Gamepad2, Image as ImageIcon, Tag, Eye, Shield, X as XIcon } from 'lucide-react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const UploadForm = () => {
    const { user } = useAuth();
    const router = useRouter();
    
    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<'games' | 'sports'>('games');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [visibility, setVisibility] = useState<'public' | 'private'>('public');
    const [audience, setAudience] = useState<'all' | 'kids'>('all');

    // Submission & Error State
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');

    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setThumbnailFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setThumbnailPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === ',' || e.key === 'Enter') && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };
    
    // Generic file uploader function
    const uploadFile = (file: File, path: string) => {
        return new Promise<string>((resolve, reject) => {
            const storage = getStorage();
            const storageRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    if (file.type.startsWith('video/')) {
                         const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                    }
                },
                (error) => reject(error),
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                }
            );
        });
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return setError("You must be logged in to upload.");
        if (!title.trim() || !description.trim() || !videoFile || !thumbnailFile) {
            return setError("Please fill out all fields and select both a video and a thumbnail.");
        }

        setIsSubmitting(true);
        setError('');

        try {
            // 1. Upload video and thumbnail in parallel
            setUploadStatus('Uploading video...');
            const videoUploadPath = `videos/${user.uid}/${Date.now()}_${videoFile.name}`;
            const videoUrl = await uploadFile(videoFile, videoUploadPath);

            setUploadStatus('Uploading thumbnail...');
            const thumbnailUploadPath = `thumbnails/${user.uid}/${Date.now()}_${thumbnailFile.name}`;
            const thumbnailUrl = await uploadFile(thumbnailFile, thumbnailUploadPath);
            
            // 2. Send all metadata to our API route
            setUploadStatus('Saving video details...');
            const idToken = await user.getIdToken();
            const response = await fetch('/api/videos', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title, description, category, videoUrl,
                    thumbnailUrl, tags, visibility, audience
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save video details.');
            }
            
            // 3. On success, redirect
            setUploadStatus('Upload complete!');
            router.push('/watch');

        } catch (err) {
            console.error("Submission failed:", err);
            setError((err as Error).message);
            setIsSubmitting(false);
            setUploadProgress(0);
            setUploadStatus('');
        }
    };

    return (
        <div className="bg-[#181818]/50 border border-gray-800 p-8 rounded-2xl max-w-3xl mx-auto">
            <div className="text-center mb-8">
                <UploadCloud className="mx-auto text-emerald-400 mb-4" size={40} />
                <h2 className="text-2xl font-bold">Upload New Video</h2>
                <p className="text-gray-400 mt-2">Share your latest content with the Airena community.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* --- Core Details --- */}
                <div className="space-y-6">
                     <div className="space-y-2">
                        <label htmlFor="title" className="text-lg font-semibold text-gray-300">Video Title</label>
                        <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Epic Gameplay Highlights" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none" required />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="description" className="text-lg font-semibold text-gray-300">Description</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="A short summary of the video..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none" required />
                    </div>
                </div>

                <div className="border-t border-gray-700"></div>

                {/* --- Files --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                     <div className="space-y-2">
                        <label className="text-lg font-semibold text-gray-300 flex items-center gap-2"><ImageIcon size={20}/> Thumbnail</label>
                         <div 
                            className="aspect-video w-full bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500"
                            onClick={() => thumbnailInputRef.current?.click()}
                        >
                            {thumbnailPreview ? (
                                <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover rounded-md" />
                            ) : (
                                <div className="text-center text-gray-400">
                                    <ImageIcon size={40} className="mx-auto" />
                                    <p>Click to upload</p>
                                    <p className="text-xs">(16:9 Recommended)</p>
                                </div>
                            )}
                        </div>
                        <input id="thumbnail" type="file" ref={thumbnailInputRef} accept="image/png, image/jpeg" onChange={handleThumbnailChange} className="hidden" required />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="video" className="text-lg font-semibold text-gray-300 flex items-center gap-2"><Film size={20}/> Video File</label>
                        <input id="video" type="file" accept="video/mp4,video/quicktime,video/x-matroska" onChange={(e) => e.target.files && setVideoFile(e.target.files[0])} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30" required />
                    </div>
                </div>

                <div className="border-t border-gray-700"></div>

                {/* --- Metadata --- */}
                <div className="space-y-6">
                     <div className="space-y-2">
                        <label htmlFor="tags" className="text-lg font-semibold text-gray-300 flex items-center gap-2"><Tag size={20}/> Tags</label>
                        <div className="flex flex-wrap gap-2 p-2 bg-gray-800 border border-gray-700 rounded-lg">
                            {tags.map(tag => (
                                <div key={tag} className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm">
                                    {tag}
                                    <button type="button" onClick={() => removeTag(tag)}><XIcon size={14}/></button>
                                </div>
                            ))}
                            <input 
                                id="tags" type="text" value={tagInput} 
                                onChange={(e) => setTagInput(e.target.value)} 
                                onKeyDown={handleTagKeyDown}
                                placeholder="Add a tag..." 
                                className="flex-1 bg-transparent outline-none px-2 py-1" />
                        </div>
                         <p className="text-xs text-gray-500">Separate tags with a comma (,) or press Enter.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-lg font-semibold text-gray-300">Category</label>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => setCategory('games')} className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${category === 'games' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}><Gamepad2 size={20} /> Games</button>
                            <button type="button" onClick={() => setCategory('sports')} className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${category === 'sports' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}><Film size={20} /> Sports</button>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <label className="text-lg font-semibold text-gray-300 flex items-center gap-2"><Eye size={20}/> Visibility</label>
                        <div className="flex gap-4">
                             <button type="button" onClick={() => setVisibility('public')} className={`flex-1 p-4 rounded-lg border-2 transition-all ${visibility === 'public' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}>Public</button>
                             <button type="button" onClick={() => setVisibility('private')} className={`flex-1 p-4 rounded-lg border-2 transition-all ${visibility === 'private' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}>Private</button>
                        </div>
                    </div>
                     {/* <div className="space-y-2">
                        <label className="text-lg font-semibold text-gray-300 flex items-center gap-2"><Shield size={20}/> Audience</label>
                        <div className="flex gap-4">
                              <button type="button" onClick={() => setAudience('all')} className={`flex-1 p-4 rounded-lg border-2 transition-all ${audience === 'all' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}>Not made for kids</button>
                             <button type="button" onClick={() => setAudience('kids')} className={`flex-1 p-4 rounded-lg border-2 transition-all ${audience === 'kids' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}>Made for kids</button>
                        </div>
                    </div> */}
                </div>
                
                {isSubmitting && (
                    <div className="space-y-2">
                        <p className="text-center text-emerald-300">{uploadStatus}</p>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                    </div>
                )}

                {error && <p className="text-red-500 text-center text-sm">{error}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-all text-lg">
                    {isSubmitting ? 'Processing...' : 'Upload Video'}
                </button>
            </form>
        </div>
    );
};

export default UploadForm;

