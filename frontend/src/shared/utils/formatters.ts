/**
 * Data Formatting Utilities
 *
 * Collection of pure functions for formatting various data types
 * used throughout the application.
 */

/**
 * Format confidence score as percentage
 * @example formatConfidence(0.41) => "41%"
 * @example formatConfidence(0.8765) => "88%"
 */
export const formatConfidence = (confidence: number | null | undefined): string => {
  if (confidence === null || confidence === undefined) return "N/A";
  return `${Math.round(confidence * 100)}%`;
};

/**
 * Format token count with thousands separator
 * @example formatTokens(5551) => "5,551"
 * @example formatTokens({total_tokens: 15000}) => "15,000"
 */
export const formatTokens = (
  tokens: number | { total_tokens?: number } | null | undefined
): string => {
  if (!tokens) return "N/A";
  const count = typeof tokens === "number" ? tokens : tokens?.total_tokens;
  return count?.toLocaleString() || "N/A";
};

/**
 * Estimate cost in RM based on token count
 * Uses average rate: RM0.00005 per token (gpt-4o-mini pricing)
 *
 * @example estimateCost(5551) => "~RM0.28"
 * @example estimateCost({total_tokens: 15000}) => "~RM0.75"
 */
export const estimateCost = (
  tokens: number | { total_tokens?: number } | null | undefined
): string => {
  if (!tokens) return "N/A";
  const count = typeof tokens === "number" ? tokens : tokens?.total_tokens;
  if (!count) return "N/A";

  const cost = count * 0.00005; // RM0.00005 per token

  // Format with 2 decimal places, but show 0.00 for very small amounts
  if (cost < 0.01) {
    return `~RM${cost.toFixed(4)}`;
  }
  return `~RM${cost.toFixed(2)}`;
};

/**
 * Format file size in human-readable format
 * @example formatFileSize(179400) => "179.4 KB"
 * @example formatFileSize(1500) => "1.5 KB"
 * @example formatFileSize(5000000) => "5.0 MB"
 */
export const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

/**
 * Format duration in seconds to human-readable string
 * @example formatDuration(22.38) => "22.4s"
 * @example formatDuration(125.5) => "2m 6s"
 * @example formatDuration(3665) => "1h 1m 5s"
 */
export const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds) return "N/A";

  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(" ");
};

/**
 * Format date string to localized format
 * @example formatDate("2024-11-16T21:30:13Z") => "16/11/2024 21:30"
 * @example formatDate("2024-11-16T21:30:13Z", { dateOnly: true }) => "16/11/2024"
 */
export const formatDate = (
  dateString: string | null | undefined,
  options: { dateOnly?: boolean; locale?: string } = {}
): string => {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    const locale = options.locale || "en-GB";

    if (options.dateOnly) {
      return date.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    return date.toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return "Invalid date";
  }
};

/**
 * Format currency amount with proper currency code support
 * Supports MYR (Malaysian Ringgit), USD, EUR, SGD, THB, IDR, PHP
 * @example formatCurrency(85.30) => "RM 85.30"
 * @example formatCurrency(1250.5, { currency: 'USD' }) => "$1,250.50"
 * @example formatCurrency(3310.00, { currency: 'MYR' }) => "RM 3,310.00"
 */
export const formatCurrency = (
  amount: number | null | undefined,
  options: { currency?: string; decimals?: number } = {}
): string => {
  if (amount === null || amount === undefined) return "N/A";

  const { currency = "MYR", decimals = 2 } = options;

  // Currency symbol mapping
  const currencySymbols: Record<string, string> = {
    MYR: "RM",
    USD: "$",
    EUR: "€",
    SGD: "S$",
    THB: "฿",
    IDR: "Rp",
    PHP: "₱",
    RM: "RM", // Backward compatibility
  };

  const symbol = currencySymbols[currency.toUpperCase()] || currency.toUpperCase();
  return `${symbol} ${amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

/**
 * Truncate text with ellipsis
 * @example truncateText("Long document name", 10) => "Long docum..."
 */
export const truncateText = (text: string | null | undefined, maxLength: number): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Get file extension from filename
 * @example getFileExtension("document.pdf") => "pdf"
 * @example getFileExtension("image.jpg") => "jpg"
 */
export const getFileExtension = (filename: string | null | undefined): string => {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
};
