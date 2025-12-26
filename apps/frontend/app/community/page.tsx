"use client";

import React from "react";
import { Megaphone, Calendar, Users, Crown, Bell } from "lucide-react";

const CommunityPage = () => {
  return (
    <div className="min-h-screen bg-black text-white px-6 lg:px-16 lg:ml-20 pt-24 pb-20 space-y-16">

      {/* ================= WELCOME & GUIDELINES ================= */}
      <section className="bg-[#181818]/40 border border-white/5 rounded-2xl p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
          <Bell className="text-emerald-500" />
          Welcome to the Airena Community
        </h1>

        <p className="text-gray-300 leading-relaxed mb-6">
          Airena is more than a streaming platform — it’s a space where gamers,
          sports enthusiasts, and creators come together to connect, compete,
          and celebrate moments that matter.
        </p>

        <p className="text-gray-400 leading-relaxed mb-8">
          Stay updated with upcoming events, live streams, new video uploads,
          and platform announcements. Whether you’re here to watch, engage,
          or explore — you’re part of the Airena experience.
        </p>

        <div className="border-t border-white/10 pt-6">
          <h2 className="text-xl font-semibold mb-4">
            Community Guidelines
          </h2>

          <ul className="space-y-2 text-gray-400">
            <li>🤝 Be respectful to all members and creators</li>
            <li>🚫 No harassment, hate speech, or abusive behavior</li>
            <li>🎮 Keep discussions relevant to gaming, sports, and streaming</li>
            <li>📢 No spam, scams, or misleading content</li>
            <li>⚖️ Follow platform rules and applicable laws</li>
          </ul>

          <p className="mt-4 text-sm text-gray-500">
            Help us keep Airena positive, inclusive, and enjoyable for everyone.
          </p>
        </div>
      </section>

      {/* ================= ANNOUNCEMENTS ================= */}
      <section>
        <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
          <Megaphone className="text-emerald-500" />
          Community Announcements
        </h2>

        <div className="space-y-4">
          <div className="bg-[#181818] border border-white/5 rounded-xl p-6">
            <p className="text-sm text-gray-400 mb-2">Airena Team</p>
            <h3 className="font-semibold text-lg">
              🎉 New Creator Applications Are Open!
            </h3>
            <p className="text-gray-400 mt-2">
              Apply now and become part of the Airena creator ecosystem.
            </p>
          </div>

          <div className="bg-[#181818] border border-white/5 rounded-xl p-6">
            <p className="text-sm text-gray-400 mb-2">System Update</p>
            <h3 className="font-semibold text-lg">
              🚀 Improved Streaming Performance
            </h3>
            <p className="text-gray-400 mt-2">
              We’ve optimized video loading and reduced buffering issues.
            </p>
          </div>
        </div>
      </section>

      {/* ================= EVENTS ================= */}
      <section>
        <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
          <Calendar className="text-emerald-500" />
          Upcoming Events
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <EventCard
            title="Valorant Weekly Cup"
            date="Friday, 8 PM IST"
            tag="Esports"
          />
          <EventCard
            title="Live Cricket Watch Party"
            date="Sunday, 7 PM IST"
            tag="Sports"
          />
          <EventCard
            title="Creator AMA Session"
            date="Wednesday, 6 PM IST"
            tag="Community"
          />
        </div>
      </section>

      {/* ================= FEATURED CREATORS ================= */}
      <section>
        <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
          <Users className="text-emerald-500" />
          Featured Creators
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <CreatorCard name="AiroPlay" category="Gaming" />
          <CreatorCard name="SportsSaga" category="Sports" />
          <CreatorCard name="GGMaster" category="Esports" />
          <CreatorCard name="KickOffLive" category="Football" />
        </div>
      </section>

    </div>
  );
};

/* ================= SMALL COMPONENTS ================= */

const EventCard = ({
  title,
  date,
  tag,
}: {
  title: string;
  date: string;
  tag: string;
}) => (
  <div className="bg-[#181818] border border-white/5 rounded-xl p-5 hover:border-emerald-500/40 transition">
    <span className="text-xs text-emerald-400 uppercase">{tag}</span>
    <h3 className="font-semibold text-lg mt-2">{title}</h3>
    <p className="text-gray-400 text-sm mt-1">{date}</p>
    <button className="mt-4 text-sm text-emerald-400 hover:underline">
      Notify Me
    </button>
  </div>
);

const CreatorCard = ({
  name,
  category,
}: {
  name: string;
  category: string;
}) => (
  <div className="bg-[#181818] border border-white/5 rounded-xl p-5 text-center hover:border-emerald-500/40 transition">
    <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
      <Crown className="text-emerald-400" />
    </div>
    <h3 className="font-semibold">{name}</h3>
    <p className="text-sm text-gray-400">{category}</p>
  </div>
);

export default CommunityPage;
