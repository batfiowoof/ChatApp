"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import LoadingOverlay from "./LoadingOverlay";

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (isLoading: boolean) => void;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a GlobalLoadingProvider");
  }
  return context;
}

export function GlobalLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const showLoading = (message = "Loading...") => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  // Set up navigation loading state
  useEffect(() => {
    const handleRouteChangeStart = () => showLoading("Loading...");

    // For client-side navigation in Next.js
    window.addEventListener("beforeunload", handleRouteChangeStart);

    return () => {
      window.removeEventListener("beforeunload", handleRouteChangeStart);
    };
  }, []);

  // Reset loading state when route changes
  useEffect(() => {
    hideLoading();
  }, [pathname, searchParams]);

  return (
    <LoadingContext.Provider
      value={{ isLoading, setLoading, showLoading, hideLoading }}
    >
      {children}
      <LoadingOverlay
        isLoading={isLoading}
        fullScreen
        message={loadingMessage}
      />
    </LoadingContext.Provider>
  );
}
