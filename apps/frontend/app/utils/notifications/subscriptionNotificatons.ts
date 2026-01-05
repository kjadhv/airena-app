// app/utils/notifications/subscriptionNotifications.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { checkNotificationSettings } from "./notificationHelpers";

interface SubscriptionNotificationParams {
  recipientId: string;
  subscriberUserId: string;
  subscriberName: string;
  subscriberPhotoURL: string | null;
  channelName?: string;
}

/**
 * Send notification when someone subscribes to a channel
 */
export const sendNewSubscriberNotification = async ({
  recipientId,
  subscriberUserId,
  subscriberName,
  subscriberPhotoURL,
  channelName,
}: SubscriptionNotificationParams): Promise<void> => {
  try {
    // Check if user has enabled subscription notifications
    const isEnabled = await checkNotificationSettings(recipientId, "newSubscribers");
    if (!isEnabled) {
      console.log(`📵 Subscription notifications disabled for user ${recipientId}`);
      return;
    }

    const channelLink = `/channel/${recipientId}`;

    await addDoc(collection(db, `users/${recipientId}/notifications`), {
      type: "newSubscribers",
      title: "New subscriber!",
      message: `${subscriberName} subscribed to ${channelName || "your channel"}`,
      timestamp: serverTimestamp(),
      read: false,
      avatar: subscriberPhotoURL || null,
      link: channelLink,
      actionUserId: subscriberUserId, // Store the subscriber's ID for reference
    });

    console.log(`✅ Subscription notification sent to user ${recipientId}`);
  } catch (error) {
    console.error("❌ Error sending subscription notification:", error);
  }
};

/**
 * Send notification when someone follows a user (for non-channel following)
 */
export const sendNewFollowerNotification = async ({
  recipientId,
  subscriberUserId,
  subscriberName,
  subscriberPhotoURL,
}: Omit<SubscriptionNotificationParams, "channelName">): Promise<void> => {
  try {
    // Check if user has enabled follower notifications
    const isEnabled = await checkNotificationSettings(recipientId, "newFollowers");
    if (!isEnabled) {
      console.log(`📵 Follower notifications disabled for user ${recipientId}`);
      return;
    }

    const profileLink = `/profile/${subscriberUserId}`;

    await addDoc(collection(db, `users/${recipientId}/notifications`), {
      type: "newFollowers",
      title: "New follower!",
      message: `${subscriberName} started following you`,
      timestamp: serverTimestamp(),
      read: false,
      avatar: subscriberPhotoURL || null,
      link: profileLink,
      actionUserId: subscriberUserId,
    });

    console.log(`✅ Follower notification sent to user ${recipientId}`);
  } catch (error) {
    console.error("❌ Error sending follower notification:", error);
  }
};