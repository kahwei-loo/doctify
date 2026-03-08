/**
 * Demo Exit Modal Component
 * Confirmation modal when exiting demo mode
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDemoMode } from "../hooks/useDemoMode";

interface DemoExitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DemoExitModal: React.FC<DemoExitModalProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { exitDemo } = useDemoMode();

  const handleStayInDemo = () => {
    onOpenChange(false);
  };

  const handleExitToHome = () => {
    exitDemo();
    onOpenChange(false);
    navigate("/");
  };

  const handleExitAndSignUp = () => {
    exitDemo();
    onOpenChange(false);
    navigate("/auth/register");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-yellow-100">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <DialogTitle className="text-xl">Exit Demo Mode?</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Your demo progress will be lost. All sample data will be cleared.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Demo mode includes:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li className="list-disc">47 sample documents</li>
              <li className="list-disc">8 sample projects</li>
              <li className="list-disc">Full application features (view-only)</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleStayInDemo} className="w-full sm:w-auto">
            Stay in Demo
          </Button>
          <Button variant="secondary" onClick={handleExitToHome} className="w-full sm:w-auto">
            Exit to Login
          </Button>
          <Button onClick={handleExitAndSignUp} className="w-full sm:w-auto">
            Exit & Sign Up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
