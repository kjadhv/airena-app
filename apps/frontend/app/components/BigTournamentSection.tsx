"use client";
import React from 'react';
import { Swords, UserCircle, Trophy, Zap } from 'lucide-react';

const BigTournamentSection = () => (
    <section className="py-12">
        <div className="relative group">
            {/* Animated glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 animate-pulse"></div>
            
            {/* Main container */}
            <div className="relative bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 backdrop-blur-xl rounded-3xl overflow-hidden border border-emerald-500/20">
                {/* Glassmorphism overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5"></div>
                
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                
                {/* Content wrapper */}
                <div className="relative z-10 p-6 sm:p-8">
                    {/* Tournament badge */}
                    <div className="flex justify-center mb-5">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full backdrop-blur-sm">
                            <Trophy className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Live Tournament</span>
                            <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                        </div>
                    </div>

                    {/* Players and Center Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-6 lg:gap-8">
                        
                        {/* Player One */}
                        <div className="flex flex-col items-center justify-center space-y-2 group/player">
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                                {/* Animated ring */}
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full blur-md opacity-40 group-hover/player:opacity-70 transition-opacity duration-300"></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full animate-spin-slow"></div>
                                
                                {/* Avatar container */}
                                <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-emerald-500/40 group-hover/player:border-emerald-500/60 transition-all duration-300 shadow-2xl group-hover/player:scale-105 transform">
                                    <UserCircle size={40} className="text-emerald-400 opacity-80 group-hover/player:opacity-100 transition-opacity" />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-base font-bold text-white/90 group-hover/player:text-emerald-400 transition-colors">Player One</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wider text-center">Challenger</p>
                            </div>
                        </div>

                        {/* Center Content - Tournament Info */}
                        <div className="flex flex-col items-center space-y-4">
                            {/* VS Badge - Mobile only */}
                            <div className="lg:hidden flex items-center justify-center mb-2">
                                <div className="relative group/vs">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-lg opacity-50 group-hover/vs:opacity-75 transition-opacity animate-pulse"></div>
                                    <div className="relative w-14 h-14 bg-gradient-to-br from-gray-900 to-gray-800 rounded-full flex items-center justify-center border-2 border-emerald-500/50 group-hover/vs:border-emerald-400 transition-all duration-300 shadow-2xl">
                                        <span className="text-lg font-black bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent">VS</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tournament Title */}
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent leading-tight flex items-center justify-center gap-2 flex-wrap">
                                    <Swords className="text-emerald-400 w-5 h-5 sm:w-6 sm:h-6" /> 
                                    The Big Tournament
                                    <Swords className="text-emerald-400 w-5 h-5 sm:w-6 sm:h-6" />
                                </h2>
                                <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto rounded-full"></div>
                            </div>
                            
                            <p className="text-gray-300 text-sm leading-relaxed max-w-md text-center">
                                Step into the arena where legends are born. Compete, conquer, and claim your victory.
                            </p>
                            
                            {/* Prize pool */}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                                <span className="text-xs font-semibold text-yellow-400">Prize Pool: $10,000</span>
                            </div>

                            {/* CTA Button */}
                            <button className="group/btn relative px-7 py-2.5 font-bold text-sm overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 active:scale-95">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 transition-transform duration-300 group-hover/btn:scale-105"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                                <span className="relative flex items-center gap-2 text-black font-extrabold">
                                    <Swords className="w-4 h-4" />
                                    1 vs 1 Battle
                                    <Swords className="w-4 h-4" />
                                </span>
                            </button>

                            {/* Stats */}
                            <div className="flex items-center justify-center gap-5 pt-1">
                                <div className="text-center">
                                    <p className="text-lg font-bold text-emerald-400">1.2K+</p>
                                    <p className="text-xs text-gray-500 uppercase">Players</p>
                                </div>
                                <div className="h-7 w-px bg-white/10"></div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-emerald-400">Live</p>
                                    <p className="text-xs text-gray-500 uppercase">Status</p>
                                </div>
                                <div className="h-7 w-px bg-white/10"></div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-emerald-400">24/7</p>
                                    <p className="text-xs text-gray-500 uppercase">Active</p>
                                </div>
                            </div>
                        </div>

                        {/* VS Badge - Desktop only, between players */}
                        <div className="hidden lg:flex absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                            <div className="relative group/vs">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-lg opacity-50 group-hover/vs:opacity-75 transition-opacity animate-pulse"></div>
                                <div className="relative w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-800 rounded-full flex items-center justify-center border-2 border-emerald-500/50 group-hover/vs:border-emerald-400 transition-all duration-300 shadow-2xl">
                                    <span className="text-xl font-black bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent">VS</span>
                                </div>
                                <div className="absolute -right-10 top-1/2 -translate-y-1/2 text-teal-500/40 text-2xl">⚡</div>
                            </div>
                        </div>

                        {/* Player Two */}
                        <div className="flex flex-col items-center justify-center space-y-2 group/player">
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                                <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full blur-md opacity-40 group-hover/player:opacity-70 transition-opacity duration-300"></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-full animate-spin-slow-reverse"></div>
                                <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-teal-500/40 group-hover/player:border-teal-500/60 transition-all duration-300 shadow-2xl group-hover/player:scale-105 transform">
                                    <UserCircle size={40} className="text-teal-400 opacity-80 group-hover/player:opacity-100 transition-opacity" />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-base font-bold text-white/90 group-hover/player:text-teal-400 transition-colors">Player Two</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wider text-center">Defender</p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Bottom shine effect */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
            </div>
        </div>

        <style jsx>{`
            @keyframes spin-slow {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            @keyframes spin-slow-reverse {
                from { transform: rotate(360deg); }
                to { transform: rotate(0deg); }
            }
            .animate-spin-slow {
                animation: spin-slow 8s linear infinite;
            }
            .animate-spin-slow-reverse {
                animation: spin-slow-reverse 8s linear infinite;
            }
        `}</style>
    </section>
);

export default BigTournamentSection;