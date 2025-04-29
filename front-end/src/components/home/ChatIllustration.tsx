"use client";

import { motion } from "framer-motion";

export default function ChatIllustration() {
  return (
    <div className="md:w-1/2 flex justify-center">
      <motion.div
        className="relative w-full max-w-md aspect-square bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900 rounded-xl flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="absolute w-3/4 h-3/4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.div
            className="h-1/4 flex gap-2"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="w-8 h-8 rounded-full bg-primary-500"></div>
            <div className="flex-1">
              <div className="h-2 w-1/4 bg-primary-200 dark:bg-primary-700 rounded"></div>
              <div className="h-6 w-3/4 bg-primary-100 dark:bg-primary-800 rounded mt-1"></div>
            </div>
          </motion.div>

          <motion.div
            className="h-1/4 flex justify-end gap-2 mt-2"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="flex-1 text-right">
              <div className="h-2 w-1/4 ml-auto bg-secondary-200 dark:bg-secondary-700 rounded"></div>
              <div className="h-6 w-3/4 ml-auto bg-secondary-100 dark:bg-secondary-800 rounded mt-1"></div>
            </div>
            <div className="w-8 h-8 rounded-full bg-secondary-500"></div>
          </motion.div>

          <motion.div
            className="absolute bottom-4 left-4 right-4 h-8 bg-gray-100 dark:bg-gray-700 rounded-full"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          ></motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
