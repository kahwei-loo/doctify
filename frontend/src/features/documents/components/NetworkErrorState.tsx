/**
 * NetworkErrorState Component
 *
 * Displays network/connection error when unable to reach the server.
 * Provides retry functionality for reconnection attempts.
 *
 * Week 1 Task 1.2.1: Enhanced Error States
 */

import React from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NetworkErrorStateProps {
  onRetry: () => void;
  message?: string;
}

export const NetworkErrorState: React.FC<NetworkErrorStateProps> = ({ onRetry, message }) => {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 p-6">
      {/* Icon */}
      <div className="p-4 rounded-full bg-muted">
        <WifiOff className="h-12 w-12 text-muted-foreground" />
      </div>

      {/* Message */}
      <div className="text-center max-w-md">
        <h3 className="font-semibold text-lg mb-2">Connection Lost</h3>
        <p className="text-muted-foreground text-sm">
          {message ||
            "Unable to connect to the server. Please check your internet connection and try again."}
        </p>
      </div>

      {/* Action Button */}
      <Button onClick={onRetry} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Retry Connection
      </Button>

      {/* Additional Help */}
      <div className="text-xs text-muted-foreground text-center max-w-sm mt-2">
        <p>If the problem persists, please check:</p>
        <ul className="list-disc list-inside mt-1 space-y-0.5">
          <li>Your internet connection is active</li>
          <li>The server is not under maintenance</li>
          <li>Your firewall is not blocking the connection</li>
        </ul>
      </div>
    </div>
  );
};
