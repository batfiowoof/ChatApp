"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <motion.div
      className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-4 md:mb-0">
        <h2 className="text-2xl font-bold">Ready to start chatting?</h2>
        <p className="text-sm md:text-base opacity-90">
          Join PurpleChat today and connect with people in real-time.
        </p>
      </div>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Link
          href="/register"
          className="inline-block bg-white text-primary-600 hover:bg-gray-100 px-6 py-2 rounded-md font-medium transition-colors"
        >
          Sign Up Now
        </Link>
      </motion.div>
    </motion.div>
  );
}
