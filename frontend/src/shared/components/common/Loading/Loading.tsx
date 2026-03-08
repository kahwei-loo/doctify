/**
 * Loading Component
 *
 * Reusable loading spinner component with customizable size and message.
 */

import React from "react";
import "./Loading.css";

export interface LoadingProps {
  size?: "small" | "medium" | "large";
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  size = "medium",
  message,
  fullScreen = false,
  overlay = false,
}) => {
  const containerClassNames = [
    "loading",
    fullScreen && "loading--fullscreen",
    overlay && "loading--overlay",
  ]
    .filter(Boolean)
    .join(" ");

  const spinnerClassNames = ["loading__spinner", `loading__spinner--${size}`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassNames}>
      <div className="loading__content">
        <svg className={spinnerClassNames} viewBox="0 0 50 50">
          <circle
            className="loading__spinner-path"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="5"
          />
        </svg>

        {message && <p className="loading__message">{message}</p>}
      </div>
    </div>
  );
};
