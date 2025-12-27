"use client";

import React, { useState, useEffect } from "react";
import SwitchAccountModal from "@/app/components/SwitchAccountModal";
import NotificationsModal from "@/app/components/NotificationsModal";
// import { useRouter } from "next/navigation";
import { useT } from "@/app/hooks/useT";
import DataModal from "@/app/components/settings/DataModel";

import { ChevronRight, X, Sun, Moon } from "lucide-react";

/* ================= SETTINGS PAGE ================= */

export default function SettingsPage() {
  // const router = useRouter();
  const t = useT();

  const [activeModal, setActiveModal] = useState<
    | null
    | "general"
    | "switch"
    | "languages"
    | "time"
    | "notifications"
    | "purchases"
    | "billing"
    | "data"
  >(null);

  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white px-6 py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-8">{t.settings}</h1>

      <SettingsItem title={t.account} onClick={() => setActiveModal("general")} />
      <SettingsItem title="Switch Account" onClick={() => setActiveModal("switch")} />
      <SettingsItem title={t.languageRegion} onClick={() => setActiveModal("languages")} />
      <SettingsItem title="Time Management" onClick={() => setActiveModal("time")} />
      <SettingsItem title={t.notifications} onClick={() => setActiveModal("notifications")} />
      <SettingsItem title="Purchases & Membership" onClick={() => setActiveModal("purchases")} />
      <SettingsItem title="Billing & Payments" onClick={() => setActiveModal("billing")} />
      <SettingsItem title="Your Data in Airena" onClick={() => setActiveModal("data")} />

      {activeModal && (
        <Modal onClose={() => setActiveModal(null)}>
          {activeModal === "general" && <GeneralModal />}
          {activeModal === "switch" && (
            <SwitchAccountModal onClose={() => setActiveModal(null)} />
          )}
          {activeModal === "languages" && <LanguagesModal />}
          {activeModal === "time" && <TimeModal />}
          {activeModal === "notifications" && <NotificationsModal />}
          {activeModal === "purchases" && (
            <EmptyModal title="Purchases & Membership" />
          )}
          {activeModal === "billing" && (
            <EmptyModal title="Billing & Payments" />
          )}
          {activeModal === "data" && <DataModal />}
        </Modal>
      )}
    </div>
  );
}

/* ================= COMMON UI ================= */

function SettingsItem({
  title,
  onClick,
}: {
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex justify-between items-center py-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 px-2"
    >
      <span className="text-sm">{title}</span>
      <ChevronRight size={18} className="text-gray-400" />
    </button>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-[#0f0f0f] w-full max-w-md rounded-xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4">
          <X />
        </button>
        {children}
      </div>
    </div>
  );
}

function ModalTitle({ title }: { title: string }) {
  return <h2 className="text-lg font-medium mb-6">{title}</h2>;
}

/* ================= GENERAL ================= */

function GeneralModal() {
  const t = useT();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const setLight = () => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("airena-theme", "light");
    setTheme("light");
  };

  const setDark = () => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("airena-theme", "dark");
    setTheme("dark");
  };

  return (
    <>
      <ModalTitle title={t.account} />

      <Row label="Appearance">
        <Pill active={theme === "light"} onClick={setLight}>
          <Sun size={14} /> Light
        </Pill>
        <Pill active={theme === "dark"} onClick={setDark}>
          <Moon size={14} /> Dark
        </Pill>
      </Row>

      <Toggle
        label="Restricted Mode"
        value={restricted}
        onChange={setRestricted}
      />
    </>
  );
}

/* ================= LANGUAGES ================= */

function LanguagesModal() {
  const t = useT();
  const [preferredLang, setPreferredLang] = useState<"en" | "hi">("en");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("airena-preferred-language");
    if (stored === "en" || stored === "hi") setPreferredLang(stored);
  }, []);

  const handleSave = () => {
    localStorage.setItem("airena-preferred-language", preferredLang);
    window.dispatchEvent(new Event("lang-change")); // 🔥 THIS MAKES UI CHANGE
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <ModalTitle title={t.languageRegion} />

      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-1">App Language</p>
        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded">
          English (Default)
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-3">{t.language}</p>
        <div className="flex gap-3">
          <Pill active={preferredLang === "en"} onClick={() => setPreferredLang("en")}>
            English
          </Pill>
          <Pill active={preferredLang === "hi"} onClick={() => setPreferredLang("hi")}>
            हिंदी
          </Pill>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg"
      >
        {t.save}
      </button>

      {saved && (
        <p className="text-xs text-emerald-500 mt-2 text-center">
          Saved
        </p>
      )}
    </>
  );
}

/* ================= TIME ================= */

function TimeModal() {
  const [timeData, setTimeData] = useState<{
    today: number;
    last7Days: number;
    dailyData: number[];
  }>({ today: 0, last7Days: 0, dailyData: [0, 0, 0, 0, 0, 0, 0] });
const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];



  useEffect(() => {
    // Load time data from localStorage
    const loadTimeData = () => {
      const today = new Date().toDateString();
      const storedData = localStorage.getItem('airena-time-tracking');
      
      if (storedData) {
        const parsed = JSON.parse(storedData);
        
        // Calculate today's time
        const todayMinutes = parsed[today] || 0;
        
        // Calculate last 7 days
        const last7Days = Object.keys(parsed)
          .filter(date => {
            const dateObj = new Date(date);
            const daysDiff = (new Date().getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff < 7;
          })
          .reduce((sum, date) => sum + (parsed[date] || 0), 0);
        
        // Get daily data for chart (last 7 days)
        const dailyData = [0, 0, 0, 0, 0, 0, 0]; // Mon → Sun

Object.keys(parsed).forEach(dateStr => {
  const date = new Date(dateStr);

  // JS: 0=Sun, 1=Mon, ... 6=Sat
  const jsDay = date.getDay();

  // Convert to Mon=0 ... Sun=6
  const index = jsDay === 0 ? 6 : jsDay - 1;

  // Only count current week
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);

  if (date >= startOfWeek) {
    dailyData[index] += parsed[dateStr];
  }
});       
        setTimeData({
          today: todayMinutes,
          last7Days,
          dailyData
        });
      }
    };

    loadTimeData();
    // Refresh every minute
    const interval = setInterval(loadTimeData, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const maxValue = Math.max(...timeData.dailyData, 1);

  return (
    <>
      <ModalTitle title="Time Management" />
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-2">Last 7 days activity</p>
        <div className="flex gap-3 items-end h-40">
  {timeData.dailyData.map((minutes, i) => {
    const heightPercent = (minutes / maxValue) * 100;

    return (
      <div key={i} className="flex-1 flex flex-col justify-end">
        <div
          className="bg-emerald-500 rounded-md transition-all duration-500"
          style={{
            height: `${heightPercent}%`,
            minHeight: minutes > 0 ? "18px" : "4px",
          }}
        />
        <span className="text-[10px] text-gray-400 text-center mt-1">
          {minutes > 0 ? `${minutes}m` : ""}
        </span>
      </div>
    );
  })}
</div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          {dayLabels.map((day, i) => (
  <span key={i} className="flex-1 text-center">{day}</span>
))}
        </div>
      </div>
      <div className="flex justify-between text-sm text-gray-400 mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
        <span>Today: <strong className="text-gray-900 dark:text-white">{formatTime(timeData.today)}</strong></span>
        <span>Last 7 days: <strong className="text-gray-900 dark:text-white">{formatTime(timeData.last7Days)}</strong></span>
      </div>
    </>
  );
}
/* ================= DATA ================= */

// function DataModal() {
//   return (
//     <>
//       <ModalTitle title="Your Data in Airena" />
//       <ul className="text-sm text-gray-400 space-y-2">
//         <li>• Uploaded Videos</li>
//         <li>• Uploaded Blogs</li>
//         <li>• Watch History</li>
//       </ul>
//     </>
//   );
// }

/* ================= HELPERS ================= */

function EmptyModal({ title }: { title: string }) {
  return (
    <>
      <ModalTitle title={title} />
      <p className="text-sm text-gray-400">This section will be available soon.</p>
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center mb-4">
      <span className="text-sm">{label}</span>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex justify-between items-center mb-4">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-14 h-7 rounded-full ${
          value ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
            value ? "translate-x-7" : ""
          }`}
        />
      </button>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm ${
        active
          ? "bg-emerald-500 text-white"
          : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
      }`}
    >
      {children}
    </button>
  );
}
