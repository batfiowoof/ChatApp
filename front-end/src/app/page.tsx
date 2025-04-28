import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto py-12">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
        <div className="md:w-1/2">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-800 dark:text-primary-400 mb-6">
            Welcome to PurpleChat
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            A modern real-time chat application with public and private
            messaging features. Connect with friends, colleagues, and new people
            in a secure environment.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/register"
              className="btn-primary text-center px-6 py-3 text-lg"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-white text-primary-600 border border-primary-600 hover:bg-primary-50 px-6 py-3 rounded-md text-lg font-medium transition-colors text-center"
            >
              Login
            </Link>
          </div>
        </div>
        <div className="md:w-1/2 flex justify-center">
          {/* Placeholder for a chat illustration */}
          <div className="relative w-full max-w-md aspect-square bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900 rounded-xl flex items-center justify-center">
            <div className="absolute w-3/4 h-3/4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <div className="h-1/4 flex gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-500"></div>
                <div className="flex-1">
                  <div className="h-2 w-1/4 bg-primary-200 dark:bg-primary-700 rounded"></div>
                  <div className="h-6 w-3/4 bg-primary-100 dark:bg-primary-800 rounded mt-1"></div>
                </div>
              </div>
              <div className="h-1/4 flex justify-end gap-2 mt-2">
                <div className="flex-1 text-right">
                  <div className="h-2 w-1/4 ml-auto bg-secondary-200 dark:bg-secondary-700 rounded"></div>
                  <div className="h-6 w-3/4 ml-auto bg-secondary-100 dark:bg-secondary-800 rounded mt-1"></div>
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary-500"></div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 h-8 bg-gray-100 dark:bg-gray-700 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-12">
          Key Features
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-4">
              <span className="text-primary-600 dark:text-primary-400 text-xl">
                💬
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Public Chat
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Join the conversation with everyone. Share ideas, discuss topics,
              and connect with the community.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-900 rounded-full flex items-center justify-center mb-4">
              <span className="text-secondary-600 dark:text-secondary-400 text-xl">
                🔒
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Private Messaging
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Have private conversations with other users. Your messages are
              secure and only visible to you and the recipient.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-4">
              <span className="text-primary-600 dark:text-primary-400 text-xl">
                ⚡
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Real-time Updates
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Experience instant messaging with real-time updates. No need to
              refresh to see new messages.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl p-8 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to start chatting?</h2>
        <p className="text-lg mb-6 max-w-xl mx-auto">
          Join PurpleChat today and connect with people from around the world in
          real-time.
        </p>
        <Link
          href="/register"
          className="inline-block bg-white text-primary-600 hover:bg-gray-100 px-6 py-3 rounded-md text-lg font-medium transition-colors"
        >
          Sign Up Now
        </Link>
      </div>
    </div>
  );
}
