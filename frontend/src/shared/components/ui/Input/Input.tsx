/**
 * Input Component
 *
 * Reusable input component with label, error, and helper text support.
 */

import React, { forwardRef } from "react";
import "./Input.css";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      startIcon,
      endIcon,
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = Boolean(error);
    const messageId = `${inputId}-message`;

    const containerClassNames = [
      "input-container",
      fullWidth && "input-container--full-width",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const wrapperClassNames = [
      "input-wrapper",
      hasError && "input-wrapper--error",
      startIcon && "input-wrapper--with-start-icon",
      endIcon && "input-wrapper--with-end-icon",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={containerClassNames}>
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
            {props.required && (
              <span className="input-label__required" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className={wrapperClassNames}>
          {startIcon && (
            <span className="input-icon input-icon--start" aria-hidden="true">
              {startIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className="input"
            aria-invalid={hasError ? "true" : undefined}
            aria-describedby={error || helperText ? messageId : undefined}
            {...props}
          />

          {endIcon && (
            <span className="input-icon input-icon--end" aria-hidden="true">
              {endIcon}
            </span>
          )}
        </div>

        {(error || helperText) && (
          <p
            id={messageId}
            className={`input-message ${hasError ? "input-message--error" : ""}`}
            role={hasError ? "alert" : undefined}
            aria-live={hasError ? "polite" : undefined}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
