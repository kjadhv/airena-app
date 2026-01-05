"use client";
import React from "react";
import { useAuth } from "@/app/context/AuthContext";
import ProfileView from "./ProfileView";
const ProfileViewComponent = ProfileView as React.ComponentType<{ profileUserId: string }>;

export default function ProfilePage() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return <ProfileViewComponent profileUserId={user.uid} />;
}
