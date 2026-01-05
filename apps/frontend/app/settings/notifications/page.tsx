"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { db } from "@/app/firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Bell, Check } from "lucide-react";

type NotificationSettings = {
  subscriptions: boolean;
  recommended: boolean;
  activityChannel: boolean;
  activityComments: boolean;
  mentions: boolean;
  othersReusing: boolean;
  promotional: boolean;
};

const defaultSettings: NotificationSettings = {
  subscriptions: true,
  recommended: true,
  activityChannel: true,
  activityComments: true,
  mentions: true,
  othersReusing: false,
  promotional: true,
};

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Load settings from Firestore
  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data()?.notificationSettings) {
          setSettings(userDoc.data().notificationSettings);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  // Save settings to Firestore
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { notificationSettings: settings },
        { merge: true }
      );
      setSaveMessage("Settings saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveMessage("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Please sign in to manage notification settings</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Loading settings...</p>
      </div>
    );
  }

  const settingsConfig = [
    {
      key: "subscriptions" as keyof NotificationSettings,
      title: "Subscriptions",
      description: "Notify me when channels I subscribe to upload new content",
    },
    {
      key: "recommended" as keyof NotificationSettings,
      title: "Recommended videos",
      description: "Notify me of videos I might like based on what I watch",
    },
    {
      key: "activityChannel" as keyof NotificationSettings,
      title: "Activity on my channel",
      description: "Notify me about comments and other activity on my channel",
    },
    {
      key: "activityComments" as keyof NotificationSettings,
      title: "Activity on my comments",
      description: "Notify me about replies and likes on my comments",
    },
    {
      key: "mentions" as keyof NotificationSettings,
      title: "Mentions",
      description: "Notify me when someone mentions me",
    },
    {
      key: "othersReusing" as keyof NotificationSettings,
      title: "Shared content",
      description: "Notify me when others share my content",
    },
    {
      key: "promotional" as keyof NotificationSettings,
      title: "Promotional content and offerings",
      description: "Notify me of new features, offers, and updates",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Bell size={32} className="text-emerald-500" />
          <h1 className="text-3xl font-bold">Notification Settings</h1>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <p className="text-gray-400 mb-6">
            Choose what notifications you want to receive
          </p>

          <div className="space-y-4">
            {settingsConfig.map((setting) => (
              <div
                key={setting.key}
                className="flex items-start justify-between p-4 bg-black rounded-lg border border-gray-800 hover:border-gray-700 transition"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">
                    {setting.title}
                  </h3>
                  <p className="text-sm text-gray-400">{setting.description}</p>
                </div>

                <button
                  onClick={() => updateSetting(setting.key, !settings[setting.key])}
                  className={`ml-4 w-12 h-6 rounded-full transition-colors relative ${
                    settings[setting.key]
                      ? "bg-emerald-500"
                      : "bg-gray-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings[setting.key]
                        ? "translate-x-7"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition"
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Check size={18} />
                  Save Settings
                </>
              )}
            </button>

            {saveMessage && (
              <p
                className={`text-sm ${
                  saveMessage.includes("success")
                    ? "text-emerald-500"
                    : "text-red-500"
                }`}
              >
                {saveMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}