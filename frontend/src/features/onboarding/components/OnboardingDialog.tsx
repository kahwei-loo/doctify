/**
 * OnboardingDialog
 *
 * 4-step guided tour dialog shown when entering demo mode.
 * Uses framer-motion for step transitions.
 */

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ONBOARDING_STEPS } from "../constants";

interface OnboardingDialogProps {
  open: boolean;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingDialog: React.FC<OnboardingDialogProps> = ({
  open,
  currentStep,
  onNext,
  onPrev,
  onComplete,
  onSkip,
}) => {
  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const Icon = step.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onSkip();
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Welcome to Doctify</DialogTitle>
            <span className="text-xs font-medium text-muted-foreground rounded-full border px-2.5 py-0.5">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </span>
          </div>
        </DialogHeader>

        <div className="py-4 min-h-[220px] flex flex-col items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center w-full"
            >
              <div className={`rounded-full p-4 ${step.bgColor} mb-4`}>
                <Icon className={`h-8 w-8 ${step.color}`} />
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-muted-foreground">{step.description}</p>
              <p className="mt-3 text-sm text-muted-foreground/80 max-w-sm">{step.detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip Tour
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={onPrev}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={isLastStep ? onComplete : onNext}>
              {isLastStep ? "Get Started" : "Next"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
