/**
 * useOnboarding hook
 *
 * Manages onboarding dialog state for demo mode.
 * Shows onboarding once per demo session; persisted in localStorage.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '@/store';
import { selectIsDemoMode } from '@/store/slices/demoSlice';
import { ONBOARDING_STEPS, ONBOARDING_STORAGE_KEY } from '../constants';

export function useOnboarding() {
  const isDemoMode = useAppSelector(selectIsDemoMode);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isDemoMode) return;

    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
    if (completed) return;

    // Delay to let the dashboard render first
    const timer = setTimeout(() => setShowOnboarding(true), 500);
    return () => clearTimeout(timer);
  }, [isDemoMode]);

  const nextStep = useCallback(() => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShowOnboarding(false);
    setCurrentStep(0);
  }, []);

  const skipOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShowOnboarding(false);
    setCurrentStep(0);
  }, []);

  return {
    showOnboarding,
    currentStep,
    nextStep,
    prevStep,
    completeOnboarding,
    skipOnboarding,
  };
}
