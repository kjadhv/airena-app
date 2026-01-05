import React from "react";
import ProfileView from "@/app/profile/ProfileView";

interface PageProps {
  params: Promise<{
    userId: string;
  }>;
}

// Cast imported component to a component type that accepts the expected prop
const ProfileViewComponent = ProfileView as React.ComponentType<{ profileUserId: string }>;

export default async function ProfileByIdPage({ params }: PageProps) {
  const { userId } = await params;
  return <ProfileViewComponent profileUserId={userId} />;
}

// "use client";

// import { useParams } from "next/navigation";

// export default function ProfileByIdPage() {
//   const params = useParams();
//   const userId = params.userId as string;

//   // reuse your existing profile page

// }
