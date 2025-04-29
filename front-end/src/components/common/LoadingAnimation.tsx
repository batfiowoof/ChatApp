"use client";

import { motion } from "framer-motion";

interface LoadingAnimationProps {
  size?: "small" | "medium" | "large";
  color?: string;
  text?: string;
}

export default function LoadingAnimation({
  size = "medium",
  color = "primary",
  text = "Loading...",
}: LoadingAnimationProps) {
  // Define sizes for different options
  const sizes = {
    small: {
      container: "w-16 h-16",
      dot: "w-2 h-2",
      gap: "gap-1",
      text: "text-sm",
    },
    medium: {
      container: "w-24 h-24",
      dot: "w-3 h-3",
      gap: "gap-2",
      text: "text-base",
    },
    large: {
      container: "w-32 h-32",
      dot: "w-4 h-4",
      gap: "gap-3",
      text: "text-lg",
    },
  };

  // Define colors
  const colors = {
    primary: "bg-primary-500",
    secondary: "bg-secondary-500",
    white: "bg-white",
    gray: "bg-gray-500",
  };

  // Animation variants for dots
  const dotVariants = {
    initial: {
      y: 0,
      opacity: 0.5,
      scale: 0.8,
    },
    animate: (i: number) => ({
      y: [0, -12, 0],
      opacity: [0.5, 1, 0.5],
      scale: [0.8, 1, 0.8],
      transition: {
        repeat: Infinity,
        duration: 1.2,
        delay: i * 0.15,
        ease: "easeInOut",
      },
    }),
  };

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const textVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: [0.5, 1, 0.5],
      transition: {
        repeat: Infinity,
        duration: 2,
        ease: "easeInOut",
      },
    },
  };

  const selectedSize = sizes[size];
  const selectedColor = colors[color as keyof typeof colors] || colors.primary;

  return (
    <div className="flex flex-col items-center justify-center">
      <motion.div
        className={`flex items-center justify-center ${selectedSize.gap} ${selectedSize.container}`}
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`${selectedSize.dot} rounded-full ${selectedColor}`}
            custom={i}
            variants={dotVariants}
            initial="initial"
            animate="animate"
          />
        ))}
      </motion.div>
      {text && (
        <motion.p
          className={`mt-4 text-gray-600 dark:text-gray-300 ${selectedSize.text}`}
          variants={textVariants}
          initial="initial"
          animate="animate"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
