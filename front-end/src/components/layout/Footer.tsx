"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary-800 text-white mt-auto py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm">
          {/* Company info */}
          <div className="mb-4 md:mb-0">
            <span className="font-semibold">PurpleChat</span>
            <span className="mx-2 text-primary-300">|</span>
            <span className="text-primary-200">Real-time messaging app</span>
          </div>

          {/* Quick Links */}
          <div className="flex space-x-4 mb-4 md:mb-0">
            <Link
              href="/"
              className="text-primary-200 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              href="/chat"
              className="text-primary-200 hover:text-white transition-colors"
            >
              Chat
            </Link>
            <Link
              href="/terms"
              className="text-primary-200 hover:text-white transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-primary-200 hover:text-white transition-colors"
            >
              Privacy
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-primary-300">
            © {new Date().getFullYear()} PurpleChat
          </div>
        </div>
      </div>
    </footer>
  );
}
