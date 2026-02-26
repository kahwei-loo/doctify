import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Shield, Brain, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { blurFadeUp, staggerContainer } from './animations';

const ParticlesBackground = lazy(() => import('./ParticlesBackground'));

interface HeroSectionProps {
  onTryDemo: () => void;
}

const trustIndicators = [
  { icon: Brain, label: 'Multi-AI Fallback' },
  { icon: Layers, label: 'pgvector RAG' },
  { icon: Shield, label: 'Enterprise Security' },
];

const HeroSection: React.FC<HeroSectionProps> = ({ onTryDemo }) => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden min-h-[80vh] flex items-center">
      {/* Layer 1: Mesh gradient background */}
      <div className="absolute inset-0 bg-mesh-gradient opacity-[0.15]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background" />

      {/* Layer 1b: Particles */}
      <Suspense fallback={null}>
        <ParticlesBackground />
      </Suspense>

      {/* Layer 2: Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={blurFadeUp} className="mb-6">
              <span className="glass-card inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-landing-accent" />
                AI-Powered Document Intelligence
              </span>
            </motion.div>

            <motion.h1
              variants={blurFadeUp}
              className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]"
            >
              Turn Documents into{' '}
              <span className="bg-gradient-to-r from-landing-accent via-landing-teal to-landing-rose bg-clip-text text-transparent">
                Intelligence
              </span>
            </motion.h1>

            <motion.p
              variants={blurFadeUp}
              className="mt-6 max-w-lg text-lg text-muted-foreground/80 leading-relaxed"
            >
              Upload documents, extract data with multi-provider AI, organize
              into knowledge bases, and ask questions with RAG-powered answers
              grounded in your sources.
            </motion.p>

            <motion.div
              variants={blurFadeUp}
              className="mt-8 flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                onClick={onTryDemo}
                className="bg-gradient-to-r from-landing-accent to-landing-teal text-white border-0 shadow-glow-md hover:shadow-glow-lg transition-all duration-300"
              >
                Try Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/auth/register')}
                className="border border-border hover:bg-accent transition-all duration-300"
              >
                Sign Up Free
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              variants={blurFadeUp}
              className="mt-10 flex flex-wrap gap-6"
            >
              {trustIndicators.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-sm text-muted-foreground/70"
                  >
                    <Icon className="h-4 w-4 text-landing-accent/70" />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>

          {/* Right: Product mockup */}
          <motion.div
            initial={{ opacity: 0, x: 60, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Browser frame */}
              <div className="rounded-2xl border border-border bg-card/80 p-1 shadow-2xl">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
                    <div className="h-3 w-3 rounded-full bg-green-400/80" />
                  </div>
                  <div className="ml-4 flex-1 rounded-md bg-muted/50 px-3 py-1 text-xs text-muted-foreground/50">
                    doctify.app/dashboard
                  </div>
                </div>
                {/* Dashboard mockup content */}
                <div className="p-6 space-y-4 min-h-[320px]">
                  {/* Stat row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="glass-card rounded-xl p-4">
                      <div className="text-xs text-muted-foreground/60">Documents</div>
                      <div className="text-2xl font-bold mt-1">1,247</div>
                      <div className="text-xs text-landing-teal mt-1">+12% this week</div>
                    </div>
                    <div className="glass-card rounded-xl p-4">
                      <div className="text-xs text-muted-foreground/60">OCR Accuracy</div>
                      <div className="text-2xl font-bold mt-1">98.5%</div>
                      <div className="text-xs text-landing-accent mt-1">Multi-AI verified</div>
                    </div>
                    <div className="glass-card rounded-xl p-4">
                      <div className="text-xs text-muted-foreground/60">RAG Queries</div>
                      <div className="text-2xl font-bold mt-1">3,891</div>
                      <div className="text-xs text-landing-rose mt-1">Grounded answers</div>
                    </div>
                  </div>
                  {/* Simulated chart area */}
                  <div className="glass-card rounded-xl p-4 h-[140px] flex items-end gap-1.5">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map(
                      (h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-landing-accent/40 to-landing-teal/40"
                          style={{ height: `${h}%` }}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Floating glass cards */}
              <div className="absolute -top-4 -right-4 glass-card rounded-xl p-3 animate-float shadow-glow-sm">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-landing-teal to-emerald-400 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-medium">AI Verified</div>
                    <div className="text-[10px] text-muted-foreground">3 providers</div>
                  </div>
                </div>
              </div>
              <div
                className="absolute -bottom-3 -left-4 glass-card rounded-xl p-3 shadow-glow-sm"
                style={{ animation: 'float 6s ease-in-out 2s infinite' }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-landing-accent to-purple-400 flex items-center justify-center">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-medium">RAG Pipeline</div>
                    <div className="text-[10px] text-muted-foreground">4-layer verification</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
