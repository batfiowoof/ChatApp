"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatInterface from "@/components/chat/ChatInterface";

export default function ChatPage() {
  const router = useRouter();

  // Check for authentication
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="max-w-full mx-auto py-4">
      <h1 className="text-3xl font-bold mb-6 text-primary-800 dark:text-primary-400">
        PurpleChat
      </h1>
      <ChatInterface />
    </div>
  );
}
