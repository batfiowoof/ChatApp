"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import ChatIllustration from "@/components/home/ChatIllustration";
import Features from "@/components/home/Features";
import Footer from "@/components/home/Footer";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto py-12">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
        <motion.div
          className="md:w-1/2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-primary-800 dark:text-primary-400 mb-6">
            Welcome to PurpleChat
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            A modern real-time chat application with public and private
            messaging features. Connect with friends, colleagues, and new people
            in a secure environment.
          </p>
          <div className="flex flex-wrap gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/register"
                className="btn-primary text-center px-6 py-3 text-lg"
              >
                Get Started
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/login"
                className="bg-white text-primary-600 border border-primary-600 hover:bg-primary-50 px-6 py-3 rounded-md text-lg font-medium transition-colors text-center"
              >
                Login
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Chat Illustration Component */}
        <ChatIllustration />
      </div>

      {/* Features Component */}
      <Features />

      {/* Footer Component (Replaced CTA) */}
      <Footer />
    </div>
  );
}
