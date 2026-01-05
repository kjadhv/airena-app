"use client";

import { MessageCircle, Facebook, Twitter } from "lucide-react";
import { Mail, Link as LinkIcon, Code } from "lucide-react";

interface ShareButtonsProps {
  url: string;
  title?: string;
  onCopy?: () => void;
  onEmbed?: () => void;
}

export default function ShareButtons({
  url,
  title = "",
  onCopy,
  onEmbed,
}: ShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const buttons = [
    {
      label: "WhatsApp",
      icon: <MessageCircle size={20} />,
      onClick: () =>
        window.open(
          `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
          "_blank"
        ),
      className: "bg-green-600",
    },
    {
      label: "Facebook",
      icon: <Facebook size={18} />,
      onClick: () =>
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          "_blank"
        ),
      className: "bg-blue-600",
    },
    {
      label: "X",
      icon: <Twitter size={18} />,
      onClick: () =>
        window.open(
          `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
          "_blank"
        ),
      className: "bg-black",
    },
    {
      label: "Email",
      icon: <Mail size={18} />,
      onClick: () =>
        window.open(
          `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
          "_blank"
        ),
      className: "bg-gray-700",
    },
  ];

  return (
    <>
      {/* SOCIAL BUTTONS */}
      <div className="flex gap-4 justify-center mb-5">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className={`${btn.className} w-12 h-12 rounded-full flex items-center justify-center hover:opacity-90`}
            title={btn.label}
          >
            {btn.icon}
          </button>
        ))}
      </div>

      {/* ACTIONS */}
      <div className="space-y-2">
        <button
          onClick={onCopy}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg"
        >
          <LinkIcon size={18} />
          Copy link
        </button>

        <button
          onClick={onEmbed}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg"
        >
          <Code size={18} />
          Embed
        </button>
      </div>
    </>
  );
}
