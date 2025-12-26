"use client";

import { useEffect, useState } from "react";
import { Mail, Plus } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";

export default function SwitchAccountModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { logout, loginWithGoogle, setIsModalOpen } = useAuth();
  const [accounts, setAccounts] = useState<string[]>([]);

  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("airena-google-accounts") || "[]"
    );
    setAccounts(saved);
  }, []);

  const switchAccount = async () => {
    await logout();
    onClose();
    setIsModalOpen(true); // open auth modal
    await loginWithGoogle(); // Google account chooser
  };

  return (
    <>
      <h2 className="text-lg font-medium mb-4">Switch account</h2>

      <div className="space-y-2">
        {accounts.map((email) => (
          <button
            key={email}
            onClick={switchAccount}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                       bg-white text-black dark:bg-gray-800 dark:text-white
                       hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Mail size={18} />
            <span className="text-sm">{email}</span>
          </button>
        ))}

        <button
          onClick={switchAccount}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                     border border-dashed border-gray-400 text-gray-500
                     hover:border-emerald-500 hover:text-emerald-500"
        >
          <Plus size={18} />
          Add another Google account
        </button>
      </div>
    </>
  );
}
