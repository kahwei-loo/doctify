/**
 * FadeTransition Component
 *
 * Provides smooth fade transitions for content changes.
 * Used for loading -> content and empty -> content transitions.
 *
 * Week 7 Task 3.2: UI/UX Polish - Animations and Transitions
 */

import React from "react";
import { cn } from "@/lib/utils";

interface FadeTransitionProps {
  /** Whether the content should be visible */
  show: boolean;
  /** Content to render */
  children: React.ReactNode;
  /** Duration of the transition in milliseconds */
  duration?: number;
  /** Custom class name */
  className?: string;
  /** Whether to unmount when hidden */
  unmountOnHide?: boolean;
  /** Delay before starting the transition */
  delay?: number;
}

/**
 * FadeTransition - Smooth fade in/out transitions
 *
 * @example
 * <FadeTransition show={!isLoading}>
 *   <Content />
 * </FadeTransition>
 */
export const FadeTransition: React.FC<FadeTransitionProps> = ({
  show,
  children,
  duration = 200,
  className,
  unmountOnHide = false,
  delay = 0,
}) => {
  const [shouldRender, setShouldRender] = React.useState(show);
  const [isVisible, setIsVisible] = React.useState(show);

  React.useEffect(() => {
    if (show) {
      setShouldRender(true);
      // Small delay to ensure the element is in the DOM before animating
      const showTimer = setTimeout(() => setIsVisible(true), delay + 10);
      return () => clearTimeout(showTimer);
    } else {
      setIsVisible(false);
      if (unmountOnHide) {
        const hideTimer = setTimeout(() => setShouldRender(false), duration);
        return () => clearTimeout(hideTimer);
      }
    }
  }, [show, duration, unmountOnHide, delay]);

  if (unmountOnHide && !shouldRender) {
    return null;
  }

  return (
    <div
      className={cn("transition-opacity", isVisible ? "opacity-100" : "opacity-0", className)}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: delay > 0 ? `${delay}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
};

/**
 * SlideTransition - Slide and fade transition
 */
interface SlideTransitionProps extends FadeTransitionProps {
  /** Direction of the slide */
  direction?: "up" | "down" | "left" | "right";
  /** Distance to slide in pixels */
  distance?: number;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  show,
  children,
  duration = 200,
  className,
  unmountOnHide = false,
  delay = 0,
  direction = "up",
  distance = 10,
}) => {
  const [shouldRender, setShouldRender] = React.useState(show);
  const [isVisible, setIsVisible] = React.useState(show);

  React.useEffect(() => {
    if (show) {
      setShouldRender(true);
      const showTimer = setTimeout(() => setIsVisible(true), delay + 10);
      return () => clearTimeout(showTimer);
    } else {
      setIsVisible(false);
      if (unmountOnHide) {
        const hideTimer = setTimeout(() => setShouldRender(false), duration);
        return () => clearTimeout(hideTimer);
      }
    }
  }, [show, duration, unmountOnHide, delay]);

  if (unmountOnHide && !shouldRender) {
    return null;
  }

  const getTransform = () => {
    if (isVisible) return "translate(0, 0)";
    switch (direction) {
      case "up":
        return `translateY(${distance}px)`;
      case "down":
        return `translateY(-${distance}px)`;
      case "left":
        return `translateX(${distance}px)`;
      case "right":
        return `translateX(-${distance}px)`;
      default:
        return "translate(0, 0)";
    }
  };

  return (
    <div
      className={cn("transition-all", className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transitionDuration: `${duration}ms`,
        transitionDelay: delay > 0 ? `${delay}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
};

/**
 * ScaleTransition - Scale and fade transition
 */
interface ScaleTransitionProps extends FadeTransitionProps {
  /** Initial scale when hidden (0 to 1) */
  initialScale?: number;
}

export const ScaleTransition: React.FC<ScaleTransitionProps> = ({
  show,
  children,
  duration = 200,
  className,
  unmountOnHide = false,
  delay = 0,
  initialScale = 0.95,
}) => {
  const [shouldRender, setShouldRender] = React.useState(show);
  const [isVisible, setIsVisible] = React.useState(show);

  React.useEffect(() => {
    if (show) {
      setShouldRender(true);
      const showTimer = setTimeout(() => setIsVisible(true), delay + 10);
      return () => clearTimeout(showTimer);
    } else {
      setIsVisible(false);
      if (unmountOnHide) {
        const hideTimer = setTimeout(() => setShouldRender(false), duration);
        return () => clearTimeout(hideTimer);
      }
    }
  }, [show, duration, unmountOnHide, delay]);

  if (unmountOnHide && !shouldRender) {
    return null;
  }

  return (
    <div
      className={cn("transition-all", className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "scale(1)" : `scale(${initialScale})`,
        transitionDuration: `${duration}ms`,
        transitionDelay: delay > 0 ? `${delay}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
};

export default FadeTransition;
