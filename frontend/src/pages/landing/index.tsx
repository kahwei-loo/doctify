/**
 * LandingPage (Composition Root)
 *
 * Public landing page for unauthenticated visitors.
 * Showcases product value, features, and CTAs for demo/sign-up.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/store';
import { enterDemoMode } from '@/store/slices/demoSlice';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import HowItWorksSection from './HowItWorksSection';
import SocialProofSection from './SocialProofSection';
import CTASection from './CTASection';
import Footer from './Footer';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleTryDemo = () => {
    dispatch(enterDemoMode());
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onTryDemo={handleTryDemo} />
      <HeroSection onTryDemo={handleTryDemo} />
      <FeaturesSection />
      <HowItWorksSection />
      <SocialProofSection />
      <CTASection onTryDemo={handleTryDemo} />
      <Footer />
    </div>
  );
};

export default LandingPage;
