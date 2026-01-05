// app/admin/dashboard/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Header from '@/app/components/Sidebar';
import Footer from '@/app/components/Footer';
import { ShieldCheck, Check, X } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

// Define the shape of an application object
interface CreatorApplication {
    id: string;
    userId: string;
    userName: string;
    reason: string;
    youtubeLink?: string;
    twitterLink?: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: Timestamp;
}

const AdminDashboardPage = () => {
    const { user, loading, isSuperAdmin } = useAuth();
    const router = useRouter();
    const [applications, setApplications] = useState<CreatorApplication[]>([]);
    const [isLoadingApps, setIsLoadingApps] = useState(true);
    const [error, setError] = useState('');
    const [submittingId, setSubmittingId] = useState<string | null>(null);

    // 🔍 DEBUG: Log authentication status
    useEffect(() => {
        console.log('=== ADMIN DASHBOARD DEBUG ===');
        console.log('👤 User email:', user?.email);
        console.log('👑 isSuperAdmin:', isSuperAdmin);
        console.log('⏳ loading:', loading);
        console.log('============================');
    }, [user, loading, isSuperAdmin]);

    // This function fetches the applications from our API
    const fetchApplications = useCallback(async () => {
        if (isSuperAdmin && user) {
            try {
                setIsLoadingApps(true);
                console.log('📡 Fetching applications...');
                const idToken = await user.getIdToken();
                const response = await fetch('/api/creator-applications', {
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });
                if (!response.ok) {
                    console.error('❌ Failed to fetch applications:', response.status);
                    throw new Error('Failed to fetch applications.');
                }
                const data = await response.json();
                console.log('✅ Applications loaded:', data.length);
                setApplications(data);
            } catch (error) {
                console.error('❌ Error fetching applications:', error);
                setError('Could not load applications.');
            } finally {
                setIsLoadingApps(false);
            }
        } else {
            console.log('⚠️ Not fetching applications - not SuperAdmin or no user');
        }
    }, [user, isSuperAdmin]);

    useEffect(() => {
        if (!loading && !isSuperAdmin) {
            console.log('❌ Not SuperAdmin, redirecting to home...');
            router.push('/'); // Redirect non-superAdmins
        } else if (!loading && isSuperAdmin) {
            console.log('✅ SuperAdmin verified, fetching applications...');
            fetchApplications();
        }
    }, [user, loading, isSuperAdmin, router, fetchApplications]);

    // This function handles both approving and rejecting
    const handleApplicationUpdate = async (targetUserId: string, newStatus: 'approved' | 'rejected') => {
        if (!user) return;
        setSubmittingId(targetUserId);
        setError('');
        try {
            console.log(`📤 ${newStatus === 'approved' ? 'Approving' : 'Rejecting'} application for user:`, targetUserId);
            const idToken = await user.getIdToken();
            const response = await fetch(`/api/creator-applications/${targetUserId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ status: newStatus }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Server error:', errorData);
                throw new Error(`Failed to ${newStatus} application.`);
            }
            
            console.log(`✅ Application ${newStatus} successfully`);
            
            // On success, remove the application from the list for instant UI feedback
            setApplications(prev => prev.filter(app => app.userId !== targetUserId));
        } catch (err) {
            console.error('❌ Error updating application:', err);
            setError((err as Error).message);
        } finally {
            setSubmittingId(null);
        }
    };

    if (loading || !isSuperAdmin) {
        return (
            <div className="h-screen bg-black flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-lg">Verifying SuperAdmin Access...</p>
                    {!loading && !isSuperAdmin && (
                        <p className="text-sm text-gray-400 mt-2">You will be redirected shortly...</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-transparent">
            <Header />
            <main className="pt-32 pb-16 min-h-screen">
                <div className="container mx-auto px-4">
                    {/* 🔍 DEBUG INFO - Remove this after testing */}
                    <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-6">
                        <h3 className="text-blue-400 font-bold mb-2">🔍 Debug Info (Remove after testing)</h3>
                        <div className="text-sm text-gray-300 space-y-1">
                            <p>Email: {user?.email}</p>
                            <p>SuperAdmin: {isSuperAdmin ? '✅ Yes' : '❌ No'}</p>
                            <p>User ID: {user?.uid}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                        <ShieldCheck className="w-10 h-10 text-emerald-400" />
                        <div>
                            <h1 className="text-4xl font-bold">SuperAdmin Dashboard</h1>
                            <p className="text-gray-400">Manage creator applications and user roles.</p>
                        </div>
                    </div>
                    
                    <div className="bg-[#181818]/50 border border-gray-800 rounded-2xl p-6">
                        <h2 className="text-2xl font-bold mb-4">Pending Creator Applications</h2>
                        {error && (
                            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
                                <p className="text-red-400">{error}</p>
                            </div>
                        )}
                        {isLoadingApps ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
                                <p className="text-gray-400">Loading applications...</p>
                            </div>
                        ) : applications.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-400 text-lg">No pending applications found.</p>
                                <p className="text-gray-500 text-sm mt-2">
                                    Creator applications will appear here when users apply.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {applications.map(app => (
                                    <div key={app.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                            <div>
                                                <p className="font-bold text-lg text-white">{app.userName}</p>
                                                <p className="text-sm text-gray-500">
                                                    Submitted: {new Date(app.submittedAt.seconds * 1000).toLocaleDateString()}
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1">User ID: {app.userId}</p>
                                            </div>
                                            <div className="flex gap-2 mt-4 sm:mt-0">
                                                <button 
                                                    onClick={() => handleApplicationUpdate(app.userId, 'approved')}
                                                    disabled={submittingId === app.userId}
                                                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {submittingId === app.userId ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check size={16}/> Approve
                                                        </>
                                                    )}
                                                </button>
                                                <button 
                                                    onClick={() => handleApplicationUpdate(app.userId, 'rejected')}
                                                    disabled={submittingId === app.userId}
                                                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {submittingId === app.userId ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <X size={16}/> Reject
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-gray-300 border-t border-gray-700 pt-4">
                                            <span className="text-gray-500 text-sm font-semibold">Reason:</span>
                                            <br />
                                            {app.reason}
                                        </p>
                                        {(app.youtubeLink || app.twitterLink) && (
                                            <div className="mt-4 flex flex-wrap gap-4 text-sm">
                                                {app.youtubeLink && (
                                                    <a 
                                                        href={app.youtubeLink} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-red-400 hover:text-red-300 hover:underline"
                                                    >
                                                        🎥 YouTube
                                                    </a>
                                                )}
                                                {app.twitterLink && (
                                                    <a 
                                                        href={app.twitterLink} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-sky-400 hover:text-sky-300 hover:underline"
                                                    >
                                                        🐦 Twitter/X
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default AdminDashboardPage;