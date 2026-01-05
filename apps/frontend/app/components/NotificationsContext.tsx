// "use client";

// import React, {
//   createContext,
//   useContext,
//   useState,
//   useEffect,
// } from "react";

// /* ================= TYPES ================= */

// export type NotificationsState = {
//   subscriptions: boolean;
//   recommended: boolean;
//   activityChannel: boolean;
//   activityComments: boolean;
//   mentions: boolean;
//   othersReusing: boolean;
//   promotional: boolean;
// };

// export type Notification = {
//   id: string;
//   type: keyof NotificationsState;
//   title: string;
//   message: string;
//   timestamp: Date;
//   read: boolean;
//   avatar?: string;
//   link?: string;
// };

// type NotificationsContextType = {
//   settings: NotificationsState;
//   updateSetting: (key: keyof NotificationsState, value: boolean) => void;
//   updateAllSettings: (settings: NotificationsState) => void;

//   notifications: Notification[];
//   unreadCount: number;

//   addNotification: (
//     notification: Omit<Notification, "id" | "timestamp" | "read">
//   ) => void;
//   markAsRead: (id: string) => void;
//   markAllAsRead: () => void;
//   deleteNotification: (id: string) => void;
//   clearAll: () => void;
// };

// /* ================= DEFAULTS ================= */

// const defaultState: NotificationsState = {
//   subscriptions: true,
//   recommended: true,
//   activityChannel: true,
//   activityComments: true,
//   mentions: true,
//   othersReusing: false,
//   promotional: true,
// };

// /* ================= CONTEXT ================= */

// const NotificationsContext =
//   createContext<NotificationsContextType | null>(null);

// /* ================= PROVIDER ================= */

// export function NotificationsProvider({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const [settings, setSettings] =
//     useState<NotificationsState>(defaultState);

//   const [notifications, setNotifications] =
//     useState<Notification[]>([]);

//   /* ---------- Load from localStorage ---------- */
//   useEffect(() => {
//     const savedSettings = localStorage.getItem("notification-settings");
//     if (savedSettings) {
//       setSettings(JSON.parse(savedSettings));
//     }

//     const savedNotifications = localStorage.getItem("notifications");
//     if (savedNotifications) {
//       const parsed = JSON.parse(savedNotifications);
//       setNotifications(
//         parsed.map((n: any) => ({
//           ...n,
//           timestamp: new Date(n.timestamp),
//         }))
//       );
//     }
//   }, []);

//   /* ---------- Persist notifications ---------- */
//   useEffect(() => {
//     localStorage.setItem(
//       "notifications",
//       JSON.stringify(notifications)
//     );
//   }, [notifications]);

//   /* ================= SETTINGS ================= */

//   const updateSetting = (
//     key: keyof NotificationsState,
//     value: boolean
//   ) => {
//     setSettings((prev) => {
//       const updated = { ...prev, [key]: value };
//       localStorage.setItem(
//         "notification-settings",
//         JSON.stringify(updated)
//       );
//       return updated;
//     });
//   };

//   const updateAllSettings = (newSettings: NotificationsState) => {
//     setSettings(newSettings);
//     localStorage.setItem(
//       "notification-settings",
//       JSON.stringify(newSettings)
//     );
//   };

//   /* ================= NOTIFICATIONS ================= */

//   const addNotification = (
//     notification: Omit<Notification, "id" | "timestamp" | "read">
//   ) => {
//     const newNotification: Notification = {
//       ...notification,
//       id: crypto.randomUUID(),
//       timestamp: new Date(),
//       read: false,
//     };

//     setNotifications((prev) => [newNotification, ...prev]);
//   };

//   const markAsRead = (id: string) => {
//     setNotifications((prev) =>
//       prev.map((n) =>
//         n.id === id ? { ...n, read: true } : n
//       )
//     );
//   };

//   const markAllAsRead = () => {
//     setNotifications((prev) =>
//       prev.map((n) => ({ ...n, read: true }))
//     );
//   };

//   const deleteNotification = (id: string) => {
//     setNotifications((prev) =>
//       prev.filter((n) => n.id !== id)
//     );
//   };

//   const clearAll = () => {
//     setNotifications([]);
//     localStorage.removeItem("notifications");
//   };

//   const unreadCount = notifications.filter(
//     (n) => !n.read
//   ).length;

//   return (
//     <NotificationsContext.Provider
//       value={{
//         settings,
//         updateSetting,
//         updateAllSettings,
//         notifications,
//         unreadCount,
//         addNotification,
//         markAsRead,
//         markAllAsRead,
//         deleteNotification,
//         clearAll,
//       }}
//     >
//       {children}
//     </NotificationsContext.Provider>
//   );
// }

// /* ================= HOOK ================= */

// export function useNotifications() {
//   const context = useContext(NotificationsContext);
//   if (!context) {
//     throw new Error(
//       "useNotifications must be used within NotificationsProvider"
//     );
//   }
//   return context;
// }
