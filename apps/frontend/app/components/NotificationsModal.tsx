"use client";

import React, { useState } from "react";

export default function NotificationsModal() {
  const [state, setState] = useState({
    subscriptions: true,
    recommended: true,
    activityChannel: true,
    activityComments: false,
    mentions: true,
    othersReusing: false,
    promotional: true,
  });

  const notificationItems = [
    {
      key: 'subscriptions',
      title: 'Subscriptions',
      description: 'Notify me about activity from the channels that I\'m subscribed to'
    },
    {
      key: 'recommended',
      title: 'Recommended videos',
      description: 'Notify me of videos that I might like based on what I watch'
    },
    {
      key: 'activityChannel',
      title: 'Activity on my channel',
      description: 'Notify me about comments and other activity on my channel or videos'
    },
    {
      key: 'activityComments',
      title: 'Activity on my comments',
      description: 'Notify me about replies, likes and other activity on my comments, and activity on my posts on other channels'
    },
    {
      key: 'mentions',
      title: 'Mentions',
      description: 'Notify me when others mention my channel'
    },
    {
      key: 'othersReusing',
      title: 'Others reusing my content',
      description: 'Notify me when others share, remix or respond to my content on their channels'
    },
    {
      key: 'promotional',
      title: 'Promotional content and offerings',
      description: 'Notify me of promotional content and offerings, like members-only perks'
    },
  ];

  return (
    <>
      <h2 className="text-lg font-medium mb-6">Notifications</h2>
      <div className="space-y-6">
        {notificationItems.map((item) => (
          <NotificationToggle
            key={item.key}
            title={item.title}
            description={item.description}
            value={state[item.key as keyof typeof state]}
            onChange={(val) => setState({ ...state, [item.key]: val })}
          />
        ))}
      </div>
    </>
  );
}

function NotificationToggle({ 
  title, 
  description, 
  value, 
  onChange 
}: { 
  title: string; 
  description: string; 
  value: boolean; 
  onChange: (v: boolean) => void 
}) {
  return (
    <div className="flex items-start gap-4">
      <button 
        onClick={() => onChange(!value)} 
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 mt-1 ${
          value ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-700"
        }`}
      >
        <span 
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            value ? "translate-x-6" : "translate-x-0"
          }`} 
        />
      </button>
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-1">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}