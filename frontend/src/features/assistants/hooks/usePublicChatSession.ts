/**
 * usePublicChatSession Hook
 *
 * Manages anonymous chat sessions for the public chat widget.
 * - Generates and persists session ID in localStorage
 * - Tracks message count for rate limiting
 * - Handles session lifecycle
 */

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY_PREFIX = "doctify_public_chat_";
const RATE_LIMIT_WARNING_THRESHOLD = 15; // Warn at 15 messages
const RATE_LIMIT_MAX = 20; // Block at 20 messages per minute

interface SessionData {
  session_id: string;
  assistant_id: string;
  conversation_id?: string;
  message_count: number;
  messages_this_minute: number;
  minute_start: number; // timestamp
  created_at: number;
}

interface UsePublicChatSessionOptions {
  assistantId: string;
  onRateLimitWarning?: (remaining: number) => void;
  onRateLimitExceeded?: () => void;
}

interface UsePublicChatSessionReturn {
  sessionId: string;
  conversationId: string | undefined;
  messageCount: number;
  isRateLimited: boolean;
  rateLimitRemaining: number;
  setConversationId: (id: string) => void;
  incrementMessageCount: () => boolean; // returns false if rate limited
  resetSession: () => void;
}

export const usePublicChatSession = ({
  assistantId,
  onRateLimitWarning,
  onRateLimitExceeded,
}: UsePublicChatSessionOptions): UsePublicChatSessionReturn => {
  const storageKey = `${STORAGE_KEY_PREFIX}${assistantId}`;

  // Initialize session from localStorage or create new
  const [sessionData, setSessionData] = useState<SessionData>(() => {
    if (typeof window === "undefined") {
      return createNewSession(assistantId);
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as SessionData;
        // Reset minute counter if more than a minute has passed
        const now = Date.now();
        if (now - parsed.minute_start > 60000) {
          parsed.messages_this_minute = 0;
          parsed.minute_start = now;
        }
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse session data:", e);
    }

    return createNewSession(assistantId);
  });

  // Persist session to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(sessionData));
    } catch (e) {
      console.error("Failed to persist session data:", e);
    }
  }, [sessionData, storageKey]);

  // Check rate limit status
  const isRateLimited = sessionData.messages_this_minute >= RATE_LIMIT_MAX;
  const rateLimitRemaining = Math.max(0, RATE_LIMIT_MAX - sessionData.messages_this_minute);

  // Set conversation ID
  const setConversationId = useCallback((id: string) => {
    setSessionData((prev) => ({ ...prev, conversation_id: id }));
  }, []);

  // Increment message count with rate limiting
  const incrementMessageCount = useCallback((): boolean => {
    const now = Date.now();

    setSessionData((prev) => {
      // Reset minute counter if more than a minute has passed
      let newMinuteCount = prev.messages_this_minute;
      let minuteStart = prev.minute_start;

      if (now - prev.minute_start > 60000) {
        newMinuteCount = 0;
        minuteStart = now;
      }

      // Check if rate limited
      if (newMinuteCount >= RATE_LIMIT_MAX) {
        onRateLimitExceeded?.();
        return prev;
      }

      newMinuteCount += 1;

      // Warn if approaching limit
      if (newMinuteCount === RATE_LIMIT_WARNING_THRESHOLD) {
        onRateLimitWarning?.(RATE_LIMIT_MAX - newMinuteCount);
      }

      return {
        ...prev,
        message_count: prev.message_count + 1,
        messages_this_minute: newMinuteCount,
        minute_start: minuteStart,
      };
    });

    // Check if this message would be blocked
    const wouldBlock =
      sessionData.messages_this_minute >= RATE_LIMIT_MAX ||
      (now - sessionData.minute_start <= 60000 &&
        sessionData.messages_this_minute >= RATE_LIMIT_MAX - 1);

    return !wouldBlock;
  }, [
    sessionData.messages_this_minute,
    sessionData.minute_start,
    onRateLimitWarning,
    onRateLimitExceeded,
  ]);

  // Reset session (for testing or user request)
  const resetSession = useCallback(() => {
    const newSession = createNewSession(assistantId);
    setSessionData(newSession);
    localStorage.removeItem(storageKey);
  }, [assistantId, storageKey]);

  return {
    sessionId: sessionData.session_id,
    conversationId: sessionData.conversation_id,
    messageCount: sessionData.message_count,
    isRateLimited,
    rateLimitRemaining,
    setConversationId,
    incrementMessageCount,
    resetSession,
  };
};

// Helper to create new session
function createNewSession(assistantId: string): SessionData {
  return {
    session_id: uuidv4(),
    assistant_id: assistantId,
    message_count: 0,
    messages_this_minute: 0,
    minute_start: Date.now(),
    created_at: Date.now(),
  };
}

export default usePublicChatSession;
