"use client";

import { motion } from "framer-motion";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  colorClass: string;
  index: number;
}

function FeatureCard({
  icon,
  title,
  description,
  colorClass,
  index,
}: FeatureCardProps) {
  return (
    <motion.div
      className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 * index, duration: 0.5 }}
      whileHover={{ scale: 1.03 }}
    >
      <div
        className={`w-12 h-12 ${colorClass} rounded-full flex items-center justify-center mb-4`}
      >
        <span className="text-xl">{icon}</span>
      </div>
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </motion.div>
  );
}

export default function Features() {
  const features = [
    {
      icon: "💬",
      title: "Public Chat",
      description:
        "Join the conversation with everyone. Share ideas, discuss topics, and connect with the community.",
      colorClass: "bg-primary-100 dark:bg-primary-900",
      iconClass: "text-primary-600 dark:text-primary-400",
    },
    {
      icon: "🔒",
      title: "Private Messaging",
      description:
        "Have private conversations with other users. Your messages are secure and only visible to you and the recipient.",
      colorClass: "bg-secondary-100 dark:bg-secondary-900",
      iconClass: "text-secondary-600 dark:text-secondary-400",
    },
    {
      icon: "⚡",
      title: "Real-time Updates",
      description:
        "Experience instant messaging with real-time updates. No need to refresh to see new messages.",
      colorClass: "bg-primary-100 dark:bg-primary-900",
      iconClass: "text-primary-600 dark:text-primary-400",
    },
  ];

  return (
    <div className="mb-16">
      <motion.h2
        className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Key Features
      </motion.h2>
      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            colorClass={feature.colorClass}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
