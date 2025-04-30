"use client";

import { useState } from "react";
import Image from "next/image";
import { useLoading } from "@/components/common/GlobalLoadingProvider";
import useProfileStore from "@/store/useProfileStore";

interface ProfilePictureProps {
  src: string;
  alt: string;
  size?: number;
  editable?: boolean;
  onUpdate?: (newUrl: string) => void;
}

export default function ProfilePicture({
  src,
  alt,
  size = 128,
  editable = false,
  onUpdate,
}: ProfilePictureProps) {
  const [isHovering, setIsHovering] = useState(false);
  const { showLoading, hideLoading } = useLoading();
  const fileInputRef = useState<HTMLInputElement | null>(null)[1];
  const { uploadProfilePicture } = useProfileStore();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file is an image
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPEG, PNG, etc.)");
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      alert("Image size must be less than 5MB");
      return;
    }

    try {
      showLoading("Uploading image...");

      // Upload the picture
      const success = await uploadProfilePicture(file);

      // Wait a bit before getting the updated URL to ensure state is updated
      setTimeout(() => {
        hideLoading();

        if (success && onUpdate) {
          // Get the updated profile picture URL directly from the store's state
          const profile = useProfileStore.getState().profile;

          if (profile?.profilePictureUrl) {
            // Call the onUpdate callback with the new URL
            onUpdate(profile.profilePictureUrl);
          } else {
            console.error("Profile picture URL not found in profile");
          }
        }
      }, 500); // Small delay to ensure store is updated
    } catch (err) {
      hideLoading();
      alert("Failed to upload profile picture. Please try again.");
      console.error("Error uploading profile picture:", err);
    }
  };

  const handleSelectFile = () => {
    console.log("Profile picture clicked, editable:", editable);
    if (!editable) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = handleFileSelect as any;
    fileInputRef(input);
    input.click();
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        className={`rounded-full overflow-hidden border-4 border-white dark:border-gray-800 
          ${editable ? "cursor-pointer" : ""}`}
        style={{ width: size, height: size }}
        onClick={handleSelectFile}
      >
        <Image
          src={src || "/images/default-avatar.png"}
          alt={alt}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          priority={true}
        />
      </div>

      {editable && isHovering && (
        <div
          className="absolute inset-0 bg-black/60 bg-opacity-50 rounded-full flex items-center justify-center"
          onClick={handleSelectFile}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-10 h-10 text-white"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
