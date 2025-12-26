"use client";

import React, { useState, useEffect } from "react";
import SwitchAccountModal from "@/app/components/SwitchAccountModal";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  X,
  Sun,
  Moon,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
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
      <h1 className="text-2xl font-semibold mb-8">Settings</h1>

      <SettingsItem title="General" onClick={() => setActiveModal("general")} />
      <SettingsItem
  title="Switch Account"
  onClick={() => setActiveModal("switch")}
/>
      <SettingsItem title="Languages" onClick={() => setActiveModal("languages")} />
      <SettingsItem title="Time Management" onClick={() => setActiveModal("time")} />
      <SettingsItem title="Notifications" onClick={() => setActiveModal("notifications")} />
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
          {activeModal === "purchases" && <EmptyModal title="Purchases & Membership" />}
          {activeModal === "billing" && <EmptyModal title="Billing & Payments" />}
          {activeModal === "data" && <DataModal />}
        </Modal>
      )}
    </div>
  );
}

function SettingsItem({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex justify-between items-center py-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 px-2 transition-colors"
    >
      <span className="text-sm">{title}</span>
      <ChevronRight size={18} className="text-gray-400" />
    </button>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
      <div className="bg-white text-black dark:bg-[#0f0f0f] dark:text-white w-full max-w-md rounded-xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X />
        </button>
        {children}
      </div>
    </div>
  );
}

function GeneralModal() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [restricted, setRestricted] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const html = document.documentElement;
    const current = html.classList.contains("dark") ? "dark" : "light";
    console.log("🔍 Current theme on mount:", current);
    console.log("🔍 HTML classes:", html.classList.toString());
    setTheme(current);
  }, []);

  const switchToLight = () => {
    console.log("☀️ Switching to LIGHT");
    const html = document.documentElement;
    
    // Just REMOVE dark class - don't add light
    html.classList.remove("dark");
    
    localStorage.setItem("airena-theme", "light");
    setTheme("light");
    
    // Force re-render of entire app
    forceUpdate(prev => prev + 1);
    window.dispatchEvent(new Event('storage'));
    
    console.log("✅ HTML classes after:", html.classList.toString());
    console.log("✅ LocalStorage:", localStorage.getItem("airena-theme"));
    
    // Force browser repaint
    setTimeout(() => {
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = '';
    }, 0);
  };

  const switchToDark = () => {
    console.log("🌙 Switching to DARK");
    const html = document.documentElement;
    
    // ADD dark class
    html.classList.add("dark");
    
    localStorage.setItem("airena-theme", "dark");
    setTheme("dark");
    
    // Force re-render of entire app
    forceUpdate(prev => prev + 1);
    window.dispatchEvent(new Event('storage'));
    
    console.log("✅ HTML classes after:", html.classList.toString());
    console.log("✅ LocalStorage:", localStorage.getItem("airena-theme"));
    
    // Force browser repaint
    setTimeout(() => {
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = '';
    }, 0);
  };

  return (
    <>
      <ModalTitle title="General" />
      <Row label="Appearance">
        <Pill active={theme === "light"} onClick={switchToLight}>
          <Sun size={14} /> Light
        </Pill>
        <Pill active={theme === "dark"} onClick={switchToDark}>
          <Moon size={14} /> Dark
        </Pill>
      </Row>
      <Toggle label="Restricted Mode" value={restricted} onChange={setRestricted} />
      
      {/* Debug info */}
      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs">
        <p>Current theme: <strong>{theme}</strong></p>
        <p>Check console (F12) for logs</p>
      </div>
    </>
  );
}

function LanguagesModal() {
  return (
    <>
      <ModalTitle title="Languages" />
      <Select label="App Language" options={["English", "Hindi"]} />
      <Select label="Preferred Content Language" options={["English", "Hindi", "Korean"]} />
    </>
  );
}

function TimeModal() {
  const data = [2, 1, 3, 2, 4, 1, 2];
  return (
    <>
      <ModalTitle title="Time Management" />
      <div className="flex gap-2 items-end h-32">
        {data.map((h, i) => (
          <div key={i} className="flex-1 bg-emerald-500 rounded" style={{ height: `${h * 20}px` }} />
        ))}
      </div>
      <div className="flex justify-between text-sm text-gray-400 mt-4">
        <span>Today: 1h 40m</span>
        <span>Last 7 days: 8h 20m</span>
      </div>
    </>
  );
}

function NotificationsModal() {
  const [state, setState] = useState({
    subscriptions: true,
    recommended: true,
    comments: true,
    likes: false,
    blogs: true,
    videos: true,
    mentions: true,
    productUpdates: false,
  });

  return (
    <>
      <ModalTitle title="Notifications" />
      {Object.entries(state).map(([k, v]) => (
        <Toggle key={k} label={formatLabel(k)} value={v} onChange={(val) => setState({ ...state, [k]: val })} />
      ))}
    </>
  );
}

function DataModal() {
  return (
    <>
      <ModalTitle title="Your Data in Airena" />
      <ul className="text-sm text-gray-400 space-y-2">
        <li>• Uploaded Videos</li>
        <li>• Uploaded Blogs</li>
        <li>• Watch History</li>
      </ul>
    </>
  );
}

function EmptyModal({ title }: { title: string }) {
  return (
    <>
      <ModalTitle title={title} />
      <p className="text-sm text-gray-500 dark:text-gray-400">This section will be available soon.</p>
    </>
  );
}

function ModalTitle({ title }: { title: string }) {
  return <h2 className="text-lg font-medium mb-6">{title}</h2>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <span className="text-sm">{label}</span>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <span className="text-sm">{label}</span>
      <button onClick={() => onChange(!value)} className={`relative w-14 h-7 rounded-full transition-colors ${value ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"}`}>
        <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${value ? "translate-x-7" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function Select({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="mb-4">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <select className="w-full bg-white text-black dark:bg-black dark:text-white border border-gray-300 dark:border-gray-700 rounded px-3 py-2">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-all ${active ? "bg-emerald-500 text-white shadow-lg" : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"}`}>
      {children}
    </button>
  );
}

function formatLabel(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}