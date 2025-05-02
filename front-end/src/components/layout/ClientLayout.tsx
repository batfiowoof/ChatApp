"use client";

import React, { useEffect } from "react";
import { GlobalLoadingProvider } from "@/components/common/GlobalLoadingProvider";
import ToastProvider from "@/components/common/ToastProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import useChatStore from "@/store/useChatStore";
import Cookies from "js-cookie";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { connect, isConnected } = useChatStore();

  // Attempt to establish connection at the root layout level
  useEffect(() => {
    const token = Cookies.get("token") || localStorage.getItem("token");

    // Only attempt connection if we have a token and we're not already connected
    if (token && !isConnected) {
      console.log("Establishing global SignalR connection");
      // Connect without showing loading indicators (those are handled by individual pages)
      connect(token).catch((err) => {
        console.error("Global connection error:", err);
      });
    }

    // Connection is maintained by the global state, no need to disconnect
  }, [connect, isConnected]);

  return (
    <GlobalLoadingProvider>
      <ToastProvider />
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6">{children}</main>
      <Footer />
    </GlobalLoadingProvider>
  );
}
