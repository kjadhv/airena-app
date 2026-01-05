"use client";

import React, { useEffect, useState } from "react";
import { Save, Check } from "lucide-react";

/* ================= TYPES ================= */

type NotificationsState = {
  subscriptions: boolean;
  recommended: boolean;
  activityChannel: boolean;
  activityComments: boolean;
  mentions: boolean;
  othersReusing: boolean;
  promotional: boolean;
};

/* ================= DEFAULT SETTINGS ================= */

const DEFAULT_SETTINGS: NotificationsState = {
  subscriptions: true,
  recommended: true,
  activityChannel: true,
  activityComments: true,
  mentions: true,
  othersReusing: false,
  promotional: true,
};

/* ================= COMPONENT ================= */

export default function NotificationsModal() {
  const [settings, setSettings] =
    useState<NotificationsState>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  const [draft, setDraft] =
    useState<NotificationsState>(DEFAULT_SETTINGS);

  const [hasChanges, setHasChanges] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  /* ---------- detect changes ---------- */
  useEffect(() => {
    const changed = Object.keys(settings).some(
      (key) =>
        settings[key as keyof NotificationsState] !==
        draft[key as keyof NotificationsState]
    );
    setHasChanges(changed);
  }, [draft, settings]);

  const toggle = (
    key: keyof NotificationsState,
    value: boolean
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const save = () => {
    setSettings(draft);
    setHasChanges(false);
    setShowSaved(true);

    setTimeout(() => setShowSaved(false), 3000);
  };

  const cancel = () => {
    setDraft(settings);
    setHasChanges(false);
  };

  const items = [
    {
      key: "subscriptions",
      title: "Subscriptions",
      description:
        "Activity from channels you are subscribed to",
    },
    {
      key: "recommended",
      title: "Recommended videos",
      description:
        "Videos you might like based on your activity",
    },
    {
      key: "activityChannel",
      title: "Activity on my channel",
      description:
        "Comments and activity on your channel or videos",
    },
    {
      key: "activityComments",
      title: "Activity on my comments",
      description:
        "Replies, likes and interactions on your comments",
    },
    {
      key: "mentions",
      title: "Mentions",
      description:
        "When someone mentions your channel",
    },
    {
      key: "othersReusing",
      title: "Others reusing my content",
      description:
        "When others remix or respond to your content",
    },
    {
      key: "promotional",
      title: "Promotional content",
      description:
        "Promotions and members-only perks",
    },
  ] as const;

  return (
    <>
      {/* ================= Header ================= */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium">
          Notifications
        </h2>

        {hasChanges && (
          <div className="flex gap-2">
            <button
              onClick={cancel}
              className="px-4 py-2 text-sm text-gray-400 border border-gray-800 rounded-lg hover:text-white hover:border-gray-600 transition"
            >
              Cancel
            </button>

            <button
              onClick={save}
              className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition flex items-center gap-2"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        )}

        {showSaved && !hasChanges && (
          <div className="flex items-center gap-2 text-emerald-500 text-sm">
            <Check size={16} />
            Saved
          </div>
        )}
      </div>

      {/* ================= Description ================= */}
      <p className="text-sm text-gray-500 mb-6">
        Choose which notifications you want to receive.
      </p>

      {/* ================= Toggles ================= */}
      <div className="space-y-6">
        {items.map((item) => (
          <ToggleRow
            key={item.key}
            title={item.title}
            description={item.description}
            value={draft[item.key]}
            onChange={(v) => toggle(item.key, v)}
          />
        ))}
      </div>

      {/* ================= Bottom Actions ================= */}
      {hasChanges && (
        <div className="mt-8 pt-6 border-t border-gray-800 flex justify-end gap-2">
          <button
            onClick={cancel}
            className="px-6 py-2 text-sm text-gray-400 border border-gray-800 rounded-lg hover:text-white hover:border-gray-600 transition"
          >
            Cancel
          </button>

          <button
            onClick={save}
            className="px-6 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition flex items-center gap-2"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      )}
    </>
  );
}

/* ================= Tablet Toggle ================= */

function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-4">
      <button
        onClick={() => onChange(!value)}
        className={`relative w-14 h-7 rounded-full transition-colors mt-1 ${
          value ? "bg-emerald-500" : "bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
            value ? "translate-x-7" : "translate-x-0"
          }`}
        />
      </button>

      <div className="flex-1">
        <h3 className="text-sm font-medium">
          {title}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {description}
        </p>
      </div>
    </div>
  );
}
