"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { useLoading } from "@/components/common/GlobalLoadingProvider";
import Link from "next/link";
import useChatStore from "@/store/useChatStore";
import useProfileStore from "@/store/useProfileStore";
import ProfilePicture from "@/components/profile/ProfilePicture";

interface UserProfile {
  id: string;
  username: string;
  profilePictureUrl: string;
  bio: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [bio, setBio] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const {
    getCurrentUserProfile,
    updateProfile,
    error: profileError,
    isLoading: storeLoading,
  } = useProfileStore();
  const isLoadingRef = useRef(false);

  // Use local loading state instead of global loading provider
  const [isLoading, setIsLoading] = useState(false);

  // Add a force update key that changes on pathname change
  const [forceUpdateKey, setForceUpdateKey] = useState(Date.now());

  // Update the force key when path changes, ensuring we refetch when navigating
  useEffect(() => {
    setForceUpdateKey(Date.now());
    // Reset state on route change
    setProfile(null);
    setError(null);
  }, [pathname]);

  // Check if user is authenticated and fetch profile data
  useEffect(() => {
    const token = Cookies.get("token") || localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    // Reset the loading refs on each effect run
    isLoadingRef.current = false;
    setIsLoading(true);

    const controller = new AbortController();

    const fetchProfile = async () => {
      try {
        console.log("Fetching current user profile");

        const profileData = await getCurrentUserProfile();
        console.log("Profile data received:", profileData);

        // Check if component is still mounted
        if (controller.signal.aborted) return;

        if (profileData && profileData.username) {
          setProfile(profileData);
          setBio(profileData.bio || "");
        } else {
          throw new Error(profileError || "Could not load your profile");
        }
      } catch (err) {
        // Check if component is still mounted
        if (controller.signal.aborted) return;

        setError("Failed to load your profile. Please try again later.");
        console.error("Error loading profile:", err);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    };

    fetchProfile();

    // Cleanup function to cancel pending requests
    return () => {
      controller.abort();
    };
  }, [router, getCurrentUserProfile, profileError, forceUpdateKey]); // Include forceUpdateKey in dependencies

  const handleUpdateProfile = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      const success = await updateProfile(bio);
      if (success) {
        setEditMode(false);
      } else {
        setError("Failed to update profile. Please try again.");
      }
    } catch (err) {
      setError("An error occurred while updating your profile.");
      console.error("Error updating profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
        <div className="text-center">
          <Link href="/chat" className="text-primary-600 hover:underline">
            Return to Chat
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || storeLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center py-12">
          <div className="animate-pulse">
            <div className="w-32 h-32 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto mb-4"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 w-64 mx-auto rounded mb-4"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 w-1/2 mx-auto rounded mb-2"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 w-1/3 mx-auto rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Only show the no profile UI if we've finished loading and don't have a profile
  if (!profile && !isLoading && !storeLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          Could not load profile
        </div>
        <div className="text-center">
          <Link href="/chat" className="text-primary-600 hover:underline">
            Return to Chat
          </Link>
        </div>
      </div>
    );
  }

  // Only render the profile UI if we actually have a profile to show
  if (!profile) {
    return null; // Extra safety check
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center text-primary-800 dark:text-primary-400">
        Your Profile
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6 text-center">
          <div className="inline-block">
            <ProfilePicture
              src={profile.profilePictureUrl || "/images/default-avatar.png"}
              alt={profile.username}
              size={128}
              editable={true}
            />
          </div>

          <h2 className="text-2xl font-bold mt-4">{profile.username}</h2>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                About
              </h3>
              <button
                className="text-sm text-primary-600 hover:text-primary-700"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? "Cancel" : "Edit"}
              </button>
            </div>

            {editMode ? (
              <div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={4}
                  placeholder="Write something about yourself..."
                />
                <div className="mt-2 flex justify-end">
                  <button
                    className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    onClick={handleUpdateProfile}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {profile.bio ||
                  "You haven't written a bio yet. Click 'Edit' to add one!"}
              </p>
            )}
          </div>

          <div className="mt-8">
            <Link href="/chat" className="text-primary-600 hover:underline">
              Back to Chat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
