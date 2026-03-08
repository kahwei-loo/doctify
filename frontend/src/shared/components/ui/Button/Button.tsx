/**
 * Button Component
 *
 * Reusable button component with multiple variants and sizes.
 */

import React from "react";
import "./Button.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "medium",
  fullWidth = false,
  loading = false,
  disabled,
  icon,
  iconPosition = "left",
  className = "",
  ...props
}) => {
  const classNames = [
    "button",
    `button--${variant}`,
    `button--${size}`,
    fullWidth && "button--full-width",
    loading && "button--loading",
    disabled && "button--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Determine if this is an icon-only button (no text children)
  const isIconOnly = !children && icon;

  return (
    <button
      className={classNames}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      {...props}
    >
      {loading && (
        <span className="button__spinner" aria-hidden="true">
          <svg className="spinner" viewBox="0 0 50 50" aria-hidden="true">
            <circle className="spinner__path" cx="25" cy="25" r="20" fill="none" strokeWidth="5" />
          </svg>
        </span>
      )}
      {loading && <span className="sr-only">Loading</span>}

      {!loading && icon && iconPosition === "left" && (
        <span
          className="button__icon button__icon--left"
          aria-hidden={!isIconOnly ? "true" : undefined}
        >
          {icon}
        </span>
      )}

      {children && <span className="button__text">{children}</span>}

      {!loading && icon && iconPosition === "right" && (
        <span className="button__icon button__icon--right" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
};
