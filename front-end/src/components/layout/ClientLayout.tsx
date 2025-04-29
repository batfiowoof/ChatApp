"use client";

import React from "react";
import { GlobalLoadingProvider } from "@/components/common/GlobalLoadingProvider";
import ToastProvider from "@/components/common/ToastProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GlobalLoadingProvider>
      <ToastProvider />
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6">{children}</main>
      <Footer />
    </GlobalLoadingProvider>
  );
}
