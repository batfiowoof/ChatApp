// File: front-end/src/store/useProfileStore.ts
import { create } from "zustand";
import axios from "axios";
import Cookies from "js-cookie";

// Define the API base URL from environment or use default
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5225/api";

interface UserProfile {
  id: string;
  username: string;
  profilePictureUrl: string;
  bio: string;
}

interface ProfileState {
  // State
  currentProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  getUserById: (userId: string) => Promise<UserProfile | null>;
  getCurrentUserProfile: () => Promise<UserProfile | null>;
  updateProfile: (bio: string, profilePicture?: File) => Promise<boolean>;
  clearError: () => void;
}

const useProfileStore = create<ProfileState>((set, get) => ({
  // Initial state
  currentProfile: null,
  isLoading: false,
  error: null,

  // Get user profile by ID
  getUserById: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        set({ isLoading: false, error: "No authentication token available" });
        return null;
      }

      console.log(`Fetching user profile for ID: ${userId}`);

      const response = await axios.get(`${API_BASE_URL}/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Profile API response:", response.data);

      if (!response.data) {
        throw new Error("No data returned from API");
      }

      // Map the response to our UserProfile type
      const profileData: UserProfile = {
        id: response.data.id || userId, // Use userId as fallback
        username: response.data.username || "Unknown",
        profilePictureUrl:
          response.data.profilePictureUrl || "/images/default-avatar.png",
        bio: response.data.bio || "",
      };

      set({ currentProfile: profileData, isLoading: false });
      return profileData;
    } catch (err) {
      console.error("Error fetching user profile:", err);
      // Always make sure to set loading to false even on error
      set({
        error: err instanceof Error ? err.message : "An unknown error occurred",
        isLoading: false,
      });
      return null;
    }
  },

  // Get current user profile
  getCurrentUserProfile: async () => {
    set({ isLoading: true, error: null });

    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        set({ isLoading: false, error: "No authentication token available" });
        return null;
      }

      console.log("Fetching current user profile");

      // Get the user ID from the token first
      const payload = token.split(".")[1];
      let userId = "";

      try {
        const decodedPayload = JSON.parse(atob(payload));
        userId =
          decodedPayload[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
          ] || "";
        console.log("Extracted user ID from token:", userId);
      } catch (e) {
        console.error("Error parsing token:", e);
      }

      const response = await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Current profile API response:", response.data);

      if (!response.data) {
        throw new Error("No data returned from API");
      }

      // Map the response to our UserProfile type, and include the ID from the token
      const profileData: UserProfile = {
        id: userId, // Add the ID from the JWT token
        username: response.data.username || "Unknown",
        profilePictureUrl:
          response.data.profilePictureUrl || "/images/default-avatar.png",
        bio: response.data.bio || "",
      };

      set({ currentProfile: profileData, isLoading: false });
      return profileData;
    } catch (err) {
      console.error("Error fetching current user profile:", err);
      // Always make sure to set loading to false even on error
      set({
        error: err instanceof Error ? err.message : "An unknown error occurred",
        isLoading: false,
      });
      return null;
    }
  },

  // Update user profile
  updateProfile: async (bio: string, profilePicture?: File) => {
    set({ isLoading: true, error: null });

    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        set({ isLoading: false, error: "No authentication token available" });
        return false;
      }

      // For this version, just update the bio using JSON
      const response = await axios.put(
        `${API_BASE_URL}/user/profile`,
        { bio },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // If there's a profile picture, update it separately
      if (profilePicture) {
        const formData = new FormData();
        formData.append("file", profilePicture);

        await axios.post(`${API_BASE_URL}/user/profile-picture`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }

      // Update the profile in state
      const currentProfile = get().currentProfile;
      if (currentProfile) {
        set({
          currentProfile: {
            ...currentProfile,
            bio,
          },
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }

      return true;
    } catch (err) {
      console.error("Error updating profile:", err);
      set({
        error: err instanceof Error ? err.message : "An unknown error occurred",
        isLoading: false,
      });
      return false;
    }
  },

  // Clear any error messages
  clearError: () => {
    set({ error: null });
  },
}));

export default useProfileStore;
