"use client";

import React from "react";
import { GlobalLoadingProvider } from "@/components/common/GlobalLoadingProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalLoadingProvider>
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>
      <Footer />
    </GlobalLoadingProvider>
  );
}