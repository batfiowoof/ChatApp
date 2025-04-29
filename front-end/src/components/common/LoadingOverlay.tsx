"use client";

import { motion } from "framer-motion";
import LoadingAnimation from "./LoadingAnimation";

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingOverlay({
  isLoading,
  message = "Loading...",
  fullScreen = false,
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <motion.div
      className={`${
        fullScreen ? "fixed inset-0 z-50" : "absolute inset-0 z-10"
      } bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center">
        <LoadingAnimation text={message} />
      </div>
    </motion.div>
  );
}
