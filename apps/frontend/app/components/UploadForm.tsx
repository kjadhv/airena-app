"use client";
import React, { useState, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { UploadCloud, Film, Image as ImageIcon, Tag, Eye } from 'lucide-react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const UploadForm = () => {
    const { user } = useAuth();
    const router = useRouter();
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    type Category = 'boxing' | 'karate' | 'bgmi' | 'valorant' | 'chess' | 'ludo' | 'grand_theft' | 'call-of-duty' | 'music' | 'podcast';
    const [category, setCategory] = useState<Category | ''>('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    type TagType = 'sports' | 'games';
    const [tag, setTag] = useState<TagType | ''>('');
    const [visibility, setVisibility] = useState<'public' | 'private'>('public');
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

    // Retry helper
    const withRetry = async <T,>(fn: () => Promise<T>, maxRetries = 3, delay = 2000): Promise<T> => {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error: any) {
                if (i === maxRetries - 1) throw error;
                console.log(`Retry ${i + 1}/${maxRetries} after error:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
        throw new Error('Max retries exceeded');
    };
    
    const uploadFile = (file: File, path: string, trackProgress: boolean = false) => {
        return withRetry(() => {
            return new Promise<string>((resolve, reject) => {
                try {
                    const storage = getStorage();
                    const metadata = {
                        contentType: file.type,
                        customMetadata: { 'uploadedBy': user?.uid || 'unknown' }
                    };
                    
                    const storageRef = ref(storage, path);
                    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            if (trackProgress) setUploadProgress(progress);
                        },
                        (error) => {
                            console.error('Upload error:', error.code, error.message);
                            reject(error);
                        },
                        async () => {
                            try {
                                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                resolve(downloadURL);
                            } catch (err) {
                                reject(err);
                            }
                        }
                    );
                } catch (err) {
                    reject(err);
                }
            });
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            setError("You must be logged in to upload.");
            return;
        }

        if (!title.trim() || !description.trim() || !videoFile || !thumbnailFile || !category || !tag) {
            setError("Please fill out all fields including tag type.");
            return;
        }

        if (videoFile.size > 500 * 1024 * 1024) {
            setError("Video file is too large. Maximum size is 500MB.");
            return;
        }

        if (thumbnailFile.size > 5 * 1024 * 1024) {
            setError("Thumbnail is too large. Maximum size is 5MB.");
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // Wait for auth to be ready
            await user.reload();
            
            setUploadStatus('Uploading files... Please do not close the tab.');

            const thumbnailUploadPath = `thumbnails/${user.uid}/${Date.now()}_${thumbnailFile.name}`;
            const videoUploadPath = `videos/${user.uid}/${Date.now()}_${videoFile.name}`;

            const [thumbnailUrl, videoUrl] = await Promise.all([
                uploadFile(thumbnailFile, thumbnailUploadPath, false),
                uploadFile(videoFile, videoUploadPath, true), 
            ]);

            setUploadStatus('Saving video details...');
            const idToken = await user.getIdToken(true); // Force refresh token
            
            const response = await fetch('/api/videos', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title, 
                    description, 
                    category, 
                    videoUrl,
                    thumbnailUrl, 
                    tags: tag,
                    visibility, 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save video details.');
            }
            
            setUploadStatus('Upload complete!');
            setTimeout(() => router.push('/watch'), 1000);

        } catch (err: any) {
            console.error("Submission failed:", err);
            const errorMessage = err.message || 'Unknown error';
            
            if (errorMessage.includes('storage/unauthorized') || errorMessage.includes('auth/')) {
                setError('Authentication error. Please log out and log back in.');
            } else if (errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
                setError('Network error. Please check your internet connection and try again.');
            } else if (errorMessage.includes('storage/retry-limit-exceeded')) {
                setError('Upload timeout. Try with a smaller video file.');
            } else {
                setError(errorMessage);
            }
            
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
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="title" className="text-lg font-semibold text-gray-300">Video Title</label>
                        <input 
                            id="title" 
                            type="text" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            placeholder="e.g., Epic Gameplay Highlights" 
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none" 
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="description" className="text-lg font-semibold text-gray-300">Description</label>
                        <textarea 
                            id="description" 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            rows={4} 
                            placeholder="A short summary of the video..." 
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none" 
                            required 
                        />
                    </div>
                </div>

                <div className="border-t border-gray-700"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-2">
                        <label className="text-lg font-semibold text-gray-300 flex items-center gap-2">
                            <ImageIcon size={20}/> Thumbnail
                        </label>
                        <div 
                            className="aspect-video w-full bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors"
                            onClick={() => thumbnailInputRef.current?.click()}
                        >
                            {thumbnailPreview ? (
                                <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover rounded-md" />
                            ) : (
                                <div className="text-center text-gray-400">
                                    <ImageIcon size={40} className="mx-auto mb-2" />
                                    <p className="font-medium">Click to upload</p>
                                    <p className="text-xs mt-1">(16:9 Recommended, Max 5MB)</p>
                                </div>
                            )}
                        </div>
                        <input 
                            id="thumbnail" 
                            type="file" 
                            ref={thumbnailInputRef} 
                            accept="image/png, image/jpeg, image/jpg" 
                            onChange={handleThumbnailChange} 
                            className="hidden" 
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="video" className="text-lg font-semibold text-gray-300 flex items-center gap-2">
                            <Film size={20}/> Video File
                        </label>
                        <input 
                            id="video" 
                            type="file" 
                            accept="video/mp4,video/quicktime,video/x-matroska,video/webm" 
                            onChange={(e) => e.target.files && setVideoFile(e.target.files[0])} 
                            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30 transition-all" 
                            required 
                        />
                        {videoFile && (
                            <p className="text-xs text-gray-500 mt-1">
                                Selected: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                            </p>
                        )}
                        <p className="text-xs text-gray-500">Max size: 500MB. Supported: MP4, MOV, MKV, WebM</p>
                    </div>
                </div>

                <div className="border-t border-gray-700"></div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-lg font-semibold text-gray-300 flex items-center gap-2">
                            <Tag size={20}/> Tag Type *
                        </label>
                        <div className="flex gap-4">
                            <button 
                                type="button" 
                                onClick={() => setTag('sports')} 
                                className={`flex-1 p-4 rounded-lg border-2 transition-all ${tag === 'sports' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}
                            >
                                <div className="font-semibold">Sports</div>
                                <div className="text-xs text-gray-400 mt-1">Boxing, Karate, etc.</div>
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setTag('games')} 
                                className={`flex-1 p-4 rounded-lg border-2 transition-all ${tag === 'games' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}
                            >
                                <div className="font-semibold">Games</div>
                                <div className="text-xs text-gray-400 mt-1">BGMI, Valorant, etc.</div>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-lg font-semibold text-gray-300">Category *</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as Category)}
                            required
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        >
                            <option value="">Select a category</option>
                            <option value="boxing">Boxing</option>
                            <option value="karate">Karate</option>
                            <option value="bgmi">BGMI</option>
                            <option value="valorant">Valorant</option>
                            <option value="chess">Chess</option>
                            <option value="ludo">Ludo</option>
                            <option value="grand_theft">Grand Theft Auto</option>
                            <option value="call-of-duty">Call of Duty</option>
                            <option value="music">Music</option>
                            <option value="podcast">Podcast</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-lg font-semibold text-gray-300 flex items-center gap-2">
                            <Eye size={20}/> Visibility *
                        </label>
                        <div className="flex gap-4">
                            <button 
                                type="button" 
                                onClick={() => setVisibility('public')} 
                                className={`flex-1 p-4 rounded-lg border-2 transition-all ${visibility === 'public' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}
                            >
                                <div className="font-semibold">Public</div>
                                <div className="text-xs text-gray-400 mt-1">Visible to everyone</div>
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setVisibility('private')} 
                                className={`flex-1 p-4 rounded-lg border-2 transition-all ${visibility === 'private' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}
                            >
                                <div className="font-semibold">Private</div>
                                <div className="text-xs text-gray-400 mt-1">Only you can see</div>
                            </button>
                        </div>
                    </div>
                </div>
                
                {isSubmitting && (
                    <div className="space-y-2">
                        <p className="text-center text-emerald-300 font-medium">{uploadStatus}</p>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div 
                                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300" 
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-center text-sm text-gray-400">{uploadProgress.toFixed(0)}%</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                        <p className="text-red-400 text-center text-sm">{error}</p>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
                >
                    {isSubmitting ? 'Processing...' : 'Upload Video'}
                </button>
            </form>
        </div>
    );
};

export default UploadForm;