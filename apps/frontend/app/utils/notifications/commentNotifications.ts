// utils/notifications/commentNotifications.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { checkNotificationSettings, generateContentLink } from "./notificationHelpers";

interface CommentNotificationParams {
  recipientId: string;
  senderName: string;
  senderPhotoURL: string | null;
  commentText: string;
  contentType: "video" | "blog" | "post";
  contentId: string;
}

/**
 * Send notification when someone comments on content
 */
export const sendNewCommentNotification = async ({
  recipientId,
  senderName,
  senderPhotoURL,
  commentText,
  contentType,
  contentId,
}: CommentNotificationParams): Promise<void> => {
  try {
    // Check if user has enabled comment notifications
    const isEnabled = await checkNotificationSettings(recipientId, "activityComments");
    if (!isEnabled) {
      console.log(`📵 Comment notifications disabled for user ${recipientId}`);
      return;
    }

    const link = generateContentLink(contentType, contentId);
    const truncatedComment = commentText.substring(0, 50) + (commentText.length > 50 ? "..." : "");

    await addDoc(collection(db, `users/${recipientId}/notifications`), {
      type: "activityComments",
      title: `New comment on your ${contentType}`,
      message: `${senderName} commented: "${truncatedComment}"`,
      timestamp: serverTimestamp(),
      read: false,
      avatar: senderPhotoURL || null,
      link,
    });

    console.log(`✅ Comment notification sent to user ${recipientId}`);
  } catch (error) {
    console.error("❌ Error sending comment notification:", error);
  }
};

/**
 * Send notification when someone replies to a comment
 */
export const sendReplyNotification = async ({
  recipientId,
  senderName,
  senderPhotoURL,
  commentText,
  contentType,
  contentId,
}: CommentNotificationParams): Promise<void> => {
  try {
    // Check if user has enabled comment notifications
    const isEnabled = await checkNotificationSettings(recipientId, "activityComments");
    if (!isEnabled) {
      console.log(`📵 Reply notifications disabled for user ${recipientId}`);
      return;
    }

    const link = generateContentLink(contentType, contentId);
    const truncatedReply = commentText.substring(0, 50) + (commentText.length > 50 ? "..." : "");

    await addDoc(collection(db, `users/${recipientId}/notifications`), {
      type: "activityComments",
      title: "Someone replied to your comment",
      message: `${senderName} replied: "${truncatedReply}"`,
      timestamp: serverTimestamp(),
      read: false,
      avatar: senderPhotoURL || null,
      link,
    });

    console.log(`✅ Reply notification sent to user ${recipientId}`);
  } catch (error) {
    console.error("❌ Error sending reply notification:", error);
  }
};