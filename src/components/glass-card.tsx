"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
  animate?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hoverable = true,
  animate = true,
  ...props
}) => {
  if (animate) {
    return (
      <motion.div
        className={cn(
          "glass rounded-xl p-4 transition-all duration-300",
          hoverable && "glass-hover cursor-pointer shadow-lg shadow-black/10 hover:shadow-black/25",
          className
        )}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        whileHover={hoverable ? { scale: 1.015, translateY: -2 } : undefined}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        "glass rounded-xl p-4 transition-all duration-300",
        hoverable && "glass-hover cursor-pointer shadow-lg shadow-black/10 hover:shadow-black/25",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
