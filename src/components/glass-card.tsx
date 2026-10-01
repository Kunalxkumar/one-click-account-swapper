"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/10 bg-[#11141c] p-3.5 transition-colors duration-200",
        hoverable && "hover:border-amber-500/30 hover:bg-[#151924] cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
