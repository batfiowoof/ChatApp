"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">PurpleChat</h3>
            <p className="text-primary-200 text-sm">
              A modern real-time chat application with private and public
              messaging features.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-primary-200 hover:text-white transition-colors text-sm"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/chat"
                  className="text-primary-200 hover:text-white transition-colors text-sm"
                >
                  Chat
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-primary-200 hover:text-white transition-colors text-sm"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-primary-200 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Contact Us</h3>
            <ul className="space-y-2 text-sm">
              <li className="text-primary-200">
                <span className="mr-2">Email:</span>
                <a
                  href="mailto:contact@purplechat.com"
                  className="hover:text-white transition-colors"
                >
                  contact@purplechat.com
                </a>
              </li>
              <li className="text-primary-200">
                <span className="mr-2">Support:</span>
                <a
                  href="mailto:support@purplechat.com"
                  className="hover:text-white transition-colors"
                >
                  support@purplechat.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-4 border-t border-primary-700 text-center text-primary-300 text-sm">
          <p>© {new Date().getFullYear()} PurpleChat. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
