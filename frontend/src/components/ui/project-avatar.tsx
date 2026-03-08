import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Generate a consistent color based on project name
 * Uses HSL for better color distribution
 */
const generateAvatarColor = (name: string): string => {
  const hash = name.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 45%)`;
};

/**
 * Get initials from project name (up to 2 characters)
 */
const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const projectAvatarVariants = cva(
  "inline-flex items-center justify-center rounded-full font-semibold text-white select-none",
  {
    variants: {
      size: {
        sm: "h-6 w-6 text-[10px]",
        md: "h-8 w-8 text-xs",
        lg: "h-10 w-10 text-sm",
        xl: "h-12 w-12 text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface ProjectAvatarProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof projectAvatarVariants> {
  /** Project name - used for initials and color generation */
  name: string;
  /** Optional custom background color (overrides auto-generated) */
  color?: string;
  /** Whether the avatar is in selected state */
  selected?: boolean;
}

const ProjectAvatar = React.forwardRef<HTMLDivElement, ProjectAvatarProps>(
  ({ className, name, size, color, selected, style, ...props }, ref) => {
    const backgroundColor = color || generateAvatarColor(name);
    const initials = getInitials(name);

    return (
      <div
        ref={ref}
        className={cn(
          projectAvatarVariants({ size, className }),
          selected && "ring-2 ring-white ring-offset-2 ring-offset-primary"
        )}
        style={{
          backgroundColor,
          ...style,
        }}
        title={name}
        {...props}
      >
        {initials}
      </div>
    );
  }
);
ProjectAvatar.displayName = "ProjectAvatar";

// Export getProjectColor as an alias for generateAvatarColor for backwards compatibility
const getProjectColor = generateAvatarColor;

export { ProjectAvatar, projectAvatarVariants, generateAvatarColor, getInitials, getProjectColor };
