// utils/notifications/notificationHelpers.ts
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase/config";

/**
 * Check if a specific notification type is enabled for a user
 * @param userId - The ID of the user to check
 * @param notificationType - The type of notification (e.g., 'activityComments', 'activityLikes')
 * @returns Promise<boolean> - true if enabled, false if disabled
 */
export const checkNotificationSettings = async (
  userId: string,
  notificationType: string
): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const notificationSettings = userDoc.data()?.notificationSettings;
      if (notificationSettings && notificationSettings[notificationType] === false) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("Error checking notification settings:", error);
    // Default to sending notifications on error
    return true;
  }
};

/**
 * Generate the correct link based on content type and ID
 * @param contentType - Type of content ('video', 'blog', 'post')
 * @param contentId - ID of the content
 * @returns string - The formatted link
 */
export const generateContentLink = (
  contentType: "video" | "blog" | "post",
  contentId: string
): string => {
  switch (contentType) {
    case "video":
      return `/watch/player?v=${contentId}`;
    case "blog":
      return `/blog/${contentId}`;
    case "post":
      return `/post/${contentId}`;
    default:
      return "";
  }
};