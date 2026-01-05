"use client";

import { useParams } from "next/navigation";
import ProfilePage from "@/app/profile/page";

export default function ProfileByIdPage() {
  const params = useParams();
  const userId = params.userId as string;

  // reuse your existing profile page
  return <ProfilePage profileUserId={userId} />;
}
