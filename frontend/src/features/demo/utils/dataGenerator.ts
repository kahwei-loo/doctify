/**
 * Data Generator Utilities
 * Helper functions to generate realistic mock data
 */

/**
 * Generate timestamp N days ago with random time
 */
export const generateTimestamp = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  // Add random hours (0-23) and minutes (0-59)
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date.toISOString();
};

/**
 * Generate random file size between min and max (in bytes)
 */
export const generateFileSize = (minKB: number = 100, maxKB: number = 5000): number => {
  return Math.floor((Math.random() * (maxKB - minKB) + minKB) * 1024);
};

/**
 * Generate random processing time (in milliseconds)
 */
export const generateProcessingTime = (minMs: number = 1000, maxMs: number = 5000): number => {
  return Math.floor(Math.random() * (maxMs - minMs) + minMs);
};

/**
 * Generate random confidence score
 */
export const generateConfidenceScore = (min: number = 0.85, max: number = 0.99): number => {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
};

/**
 * Generate document status based on distribution
 * 70% completed, 20% processing, 5% pending, 5% failed
 */
export const generateDocumentStatus = (): "completed" | "processing" | "pending" | "failed" => {
  const rand = Math.random();
  if (rand < 0.7) return "completed";
  if (rand < 0.9) return "processing";
  if (rand < 0.95) return "pending";
  return "failed";
};

/**
 * Generate random file type based on distribution
 * 60% PDF, 25% JPG, 15% PNG
 */
export const generateFileType = (): { extension: string; mimeType: string } => {
  const rand = Math.random();
  if (rand < 0.6) return { extension: "pdf", mimeType: "application/pdf" };
  if (rand < 0.85) return { extension: "jpg", mimeType: "image/jpeg" };
  return { extension: "png", mimeType: "image/png" };
};

/**
 * Generate random document filename
 */
export const generateDocumentFilename = (_type: string, index: number): string => {
  const categories = {
    invoice: ["Invoice", "Bill", "Receipt"],
    contract: ["Contract", "Agreement", "NDA"],
    report: ["Report", "Analysis", "Summary"],
    form: ["Form", "Application", "Submission"],
    statement: ["Statement", "Account", "Balance"],
  };

  const categoryKeys = Object.keys(categories);
  const category = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
  const prefix =
    categories[category as keyof typeof categories][
      Math.floor(Math.random() * categories[category as keyof typeof categories].length)
    ];

  const year = 2024;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;

  return `${prefix}_${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}_${String(index).padStart(3, "0")}`;
};

/**
 * Pick random item from array
 */
export const pickRandom = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Generate random integer between min and max (inclusive)
 */
export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate random boolean with custom probability
 */
export const randomBoolean = (probability: number = 0.5): boolean => {
  return Math.random() < probability;
};
