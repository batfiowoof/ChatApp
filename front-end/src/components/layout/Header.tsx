"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import useChatStore from "@/store/useChatStore";
import Cookies from "js-cookie";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { currentUsername, isConnected, disconnect } = useChatStore();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const token = Cookies.get("token") || localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, [currentUsername, isConnected]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const isActive = (path: string) => {
    return pathname === path
      ? "bg-primary-700 text-white"
      : "text-white hover:bg-primary-700";
  };

  const handleLogout = async () => {
    // Disconnect from SignalR
    await disconnect();

    // Clear authentication tokens
    Cookies.remove("token");
    localStorage.removeItem("token");

    // Redirect to home page
    router.push("/");
  };

  return (
    <header className="bg-primary-600 shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-white text-xl font-bold">PurpleChat</span>
          </Link>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-white hover:text-primary-200 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium ${isActive(
                "/"
              )}`}
            >
              Home
            </Link>
            <Link
              href="/chat"
              className={`px-3 py-2 rounded-md text-sm font-medium ${isActive(
                "/chat"
              )}`}
            >
              Chat
            </Link>
            <Link
              href="/profile"
              className={`px-3 py-2 rounded-md text-sm font-medium ${isActive(
                "/profile"
              )}`}
            >
              Profile
            </Link>
          </nav>

          {/* Auth buttons for desktop */}
          <div className="hidden md:flex items-center space-x-3">
            {isLoggedIn ? (
              <>
                <span className="text-white px-3">
                  Welcome, {currentUsername || "User"}!
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-white text-primary-600 hover:bg-primary-100 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="bg-white text-primary-600 hover:bg-primary-100 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-secondary-600 text-white hover:bg-secondary-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden mt-2">
            <div className="flex flex-col space-y-2 pt-2 pb-3">
              <Link
                href="/"
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive(
                  "/"
                )}`}
              >
                Home
              </Link>
              <Link
                href="/chat"
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive(
                  "/chat"
                )}`}
              >
                Chat
              </Link>
              <Link
                href="/profile"
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive(
                  "/profile"
                )}`}
              >
                Profile
              </Link>
            </div>
            <div className="flex flex-col space-y-2 pt-2 pb-3 border-t border-primary-700">
              {isLoggedIn ? (
                <>
                  <span className="block px-3 py-2 text-white">
                    Welcome, {currentUsername || "User"}!
                  </span>
                  <button
                    onClick={handleLogout}
                    className="block bg-white text-primary-600 hover:bg-primary-100 px-3 py-2 rounded-md text-base font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block bg-white text-primary-600 hover:bg-primary-100 px-3 py-2 rounded-md text-base font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="block bg-secondary-600 text-white hover:bg-secondary-700 px-3 py-2 rounded-md text-base font-medium"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
