"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, Trash2, X, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import NotificationsModal from "@/app/components/NotificationsModal";
import { useAuth } from "@/app/context/AuthContext";
import { db } from "@/app/firebase/config";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
  avatar?: string | null;
  link?: string;
}

const NotificationsDropdown = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  /* ---------- Listen to Firestore notifications ---------- */
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, `users/${user.uid}/notifications`),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];

        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  /* ---------- Close on outside click ---------- */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  /* ---------- Mark as read ---------- */
  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      const notifRef = doc(db, `users/${user.uid}/notifications`, notificationId);
      await updateDoc(notifRef, { read: true });
      console.log(`Marked notification ${notificationId} as read`);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  /* ---------- Mark all as read ---------- */
  const markAllAsRead = async () => {
    if (!user) return;
    
    const unreadNotifs = notifications.filter((n) => !n.read);
    if (unreadNotifs.length === 0) {
      console.log("No unread notifications to mark");
      return;
    }

    try {
      const batch = writeBatch(db);
      unreadNotifs.forEach((n) => {
        const notifRef = doc(db, `users/${user.uid}/notifications`, n.id);
        batch.update(notifRef, { read: true });
      });
      await batch.commit();
      console.log(`Marked ${unreadNotifs.length} notifications as read`);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  /* ---------- Delete notification ---------- */
  const deleteNotification = async (notificationId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (!user) return;
    
    try {
      const notifRef = doc(db, `users/${user.uid}/notifications`, notificationId);
      await deleteDoc(notifRef);
      console.log(`Deleted notification ${notificationId}`);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  /* ---------- Clear all ---------- */
  const clearAll = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!user || notifications.length === 0) {
      console.log("No notifications to clear");
      return;
    }

    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        const notifRef = doc(db, `users/${user.uid}/notifications`, n.id);
        batch.delete(notifRef);
      });
      await batch.commit();
      console.log(`Cleared ${notifications.length} notifications`);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  /* ---------- Time formatter ---------- */
  const formatTimestamp = (timestamp: Timestamp) => {
    try {
      const date = timestamp.toDate();
      const now = new Date();
      const diff = now.getTime() - date.getTime();

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;

      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Unknown time";
    }
  };

  /* ---------- Click notification ---------- */
  const handleNotificationClick = (notification: Notification) => {
    console.log("=== NOTIFICATION CLICKED ===");
    console.log("Full notification:", JSON.stringify(notification, null, 2));
    console.log("Link value:", notification.link);
    console.log("Link exists:", !!notification.link);
    console.log("Notification type:", notification.type);

    // Mark as read (don't await to make navigation faster)
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate if link exists
    if (notification.link && notification.link.trim() !== "") {
      console.log("✅ Attempting navigation to:", notification.link);
      
      try {
        router.push(notification.link);
        
        // Close dropdown after navigation starts
        setTimeout(() => {
          setIsOpen(false);
        }, 100);
      } catch (error) {
        console.error("❌ Navigation error:", error);
        setIsOpen(false);
      }
    } else {
      console.warn("⚠️ No valid link provided for this notification");
      // Still close dropdown even if no link
      setIsOpen(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* ================= Bell Button ================= */}
       <button
  onClick={() => setIsOpen((prev) => !prev)}
  title="Notifications"
  className="relative p-2 rounded-xl bg-black
             border border-emerald-500/40
             text-emerald-400
             shadow-[0_0_12px_rgba(16,185,129,0.6)]
             ring-1 ring-emerald-400/30
             transition-all duration-300
             hover:shadow-[0_0_22px_rgba(16,185,129,0.9)]
             hover:ring-emerald-400/60
             hover:text-emerald-300"
>
          <Bell size={20} className="text-current" />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-semibold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* ================= Dropdown ================= */}
        {isOpen && (
          <div className="absolute right-0 top-12 w-96 bg-black border border-gray-800 rounded-xl shadow-2xl z-50 max-h-[600px] flex flex-col">
            {/* ---------- Header ---------- */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-white font-semibold text-lg">Notifications</h3>

              {notifications.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAllAsRead();
                    }}
                    className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <Check size={14} />
                    Mark all
                  </button>

                  <button
                    onClick={(e) => clearAll(e)}
                    className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
                    title="Clear all notifications"
                  >
                    <Trash2 size={14} />
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* ---------- Notification List ---------- */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Bell size={48} className="mb-3 opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 cursor-pointer transition hover:bg-gray-900 ${
                        !notification.read ? "bg-gray-900/50" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {!notification.read && (
                              <span className="h-2 w-2 bg-emerald-500 rounded-full" />
                            )}
                            <h4 className="text-white font-medium text-sm truncate">
                              {notification.title}
                            </h4>
                          </div>

                          <p className="text-gray-400 text-xs line-clamp-2 mb-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center gap-1 text-gray-600 text-xs">
                            <Clock size={12} />
                            <span>{formatTimestamp(notification.timestamp)}</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => deleteNotification(notification.id, e)}
                          className="text-gray-600 hover:text-red-500 transition flex-shrink-0"
                          title="Delete notification"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ---------- Footer ---------- */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-800 text-center">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowSettings(true);
                  }}
                  className="text-xs text-emerald-500 hover:text-emerald-400"
                >
                  Notification Settings
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= Settings Modal ================= */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center"
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="bg-black border border-gray-800 rounded-xl w-full max-w-xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <NotificationsModal />
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationsDropdown;