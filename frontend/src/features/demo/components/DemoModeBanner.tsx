/**
 * Demo Mode Banner Component
 * Displays at the top of the screen when demo mode is active
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DemoExitModal } from "./DemoExitModal";

export const DemoModeBanner: React.FC = () => {
  const navigate = useNavigate();
  const [showExitModal, setShowExitModal] = useState(false);

  const handleExitDemo = () => {
    setShowExitModal(true);
  };

  const handleSignUp = () => {
    navigate("/auth/register");
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 border-b border-yellow-600 shadow-md">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎭</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Demo Mode Active</p>
                <p className="text-xs text-gray-700">
                  Exploring with sample data - No data will be saved
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSignUp}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-200 shadow-sm"
              >
                Sign Up to Save Your Work
              </button>
              <button
                onClick={handleExitDemo}
                className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-md border border-gray-300 transition-colors duration-200"
              >
                Exit Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      <DemoExitModal open={showExitModal} onOpenChange={setShowExitModal} />
    </>
  );
};
