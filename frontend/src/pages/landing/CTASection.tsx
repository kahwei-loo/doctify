import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { blurFadeDown, blurFadeUp, staggerContainer } from './animations';

interface CTASectionProps {
  onTryDemo: () => void;
}

const CTASection: React.FC<CTASectionProps> = ({ onTryDemo }) => {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-[#1a1035] dark:via-[#0d1f3c] dark:to-[#0a0a1a]">
      {/* Floating gradient orbs */}
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-landing-accent/10 dark:bg-landing-accent/20 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-landing-teal/10 dark:bg-landing-teal/20 blur-[80px]" />
      <div className="absolute top-1/2 right-1/3 h-32 w-32 rounded-full bg-landing-rose/8 dark:bg-landing-rose/15 blur-[60px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="glass-card rounded-3xl p-10 sm:p-14 text-center"
        >
          <motion.h2
            variants={blurFadeDown}
            className="text-3xl sm:text-4xl font-bold text-foreground dark:text-white"
          >
            Ready to get started?
          </motion.h2>
          <motion.p
            variants={blurFadeUp}
            className="mt-4 text-lg text-muted-foreground dark:text-white/60 max-w-lg mx-auto"
          >
            Try the demo with sample data or create your free account.
          </motion.p>
          <motion.div
            variants={blurFadeUp}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              onClick={onTryDemo}
              className="w-full sm:w-auto bg-gradient-to-r from-landing-accent to-landing-teal text-white border-0 animate-pulse-glow hover:opacity-90 transition-opacity"
            >
              Try Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth/register')}
              className="w-full sm:w-auto border-border dark:border-white/30 bg-transparent dark:bg-white/5 hover:bg-accent dark:hover:bg-white/10 transition-colors"
            >
              Sign Up Free
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
