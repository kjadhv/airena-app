// utils/notifications/reactionNotifications.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { checkNotificationSettings, generateContentLink } from "@/app/utils/notifications/notificationHelpers";

interface LikeNotificationParams {
  recipientId: string;
  senderName: string;
  senderPhotoURL: string | null;
  commentText: string;
  contentType: "video" | "blog" | "post";
  contentId: string;
}

/**
 * Send notification when someone likes a comment
 */
export const sendCommentLikeNotification = async ({
  recipientId,
  senderName,
  senderPhotoURL,
  commentText,
  contentType,
  contentId,
}: LikeNotificationParams): Promise<void> => {
  try {
    // Check if user has enabled like notifications
    const isEnabled = await checkNotificationSettings(recipientId, "activityComments");
    if (!isEnabled) {
      console.log(`📵 Like notifications disabled for user ${recipientId}`);
      return;
    }

    const link = generateContentLink(contentType, contentId);
    const truncatedComment = commentText.substring(0, 50) + (commentText.length > 50 ? "..." : "");

    await addDoc(collection(db, `users/${recipientId}/notifications`), {
      type: "activityComments",
      title: "Someone liked your comment",
      message: `${senderName} liked: "${truncatedComment}"`,
      timestamp: serverTimestamp(),
      read: false,
      avatar: senderPhotoURL || null,
      link,
    });

    console.log(`✅ Like notification sent to user ${recipientId}`);
  } catch (error) {
    console.error("❌ Error sending like notification:", error);
  }
};