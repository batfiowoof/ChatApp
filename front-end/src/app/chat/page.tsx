"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatInterface from "@/components/chat/ChatInterface";
import Cookies from "js-cookie";

export default function ChatPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check for authentication
  useEffect(() => {
    // Try to get token from cookie first, then localStorage as fallback
    const token = Cookies.get("token") || localStorage.getItem("token");
    
    if (!token) {
      // If no token is found, redirect to login page
      router.push("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // Show loading state when we're checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="max-w-full mx-auto py-8 text-center">
        <div className="animate-pulse">
          <h1 className="text-3xl font-bold mb-6 text-primary-800 dark:text-primary-400">
            Loading...
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Checking your authentication status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto py-4">
      <h1 className="text-3xl font-bold mb-6 text-primary-800 dark:text-primary-400">
        PurpleChat
      </h1>
      <ChatInterface />
    </div>
  );
}
