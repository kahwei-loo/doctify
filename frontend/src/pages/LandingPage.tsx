/**
 * LandingPage
 *
 * Public landing page for unauthenticated visitors.
 * Showcases product value, features, and CTAs for demo/sign-up.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Database,
  MessageSquare,
  Bot,
  Upload,
  Sparkles,
  Search,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/store';
import { enterDemoMode } from '@/store/slices/demoSlice';
import type { Variants } from 'framer-motion';

// Animation variants for scroll reveal
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const features = [
  {
    icon: FileText,
    title: 'AI-Powered OCR',
    description: 'Extract text from documents with multi-provider AI fallback for maximum accuracy.',
    tech: 'GPT-4V + Claude + Gemini',
    color: 'text-blue-600',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Database,
    title: 'Knowledge Base',
    description: 'Organize documents into searchable knowledge bases with vector embeddings.',
    tech: 'pgvector + Cohere reranking',
    color: 'text-green-600',
    bg: 'bg-green-500/10',
  },
  {
    icon: MessageSquare,
    title: 'RAG Q&A',
    description: 'Ask questions and get AI answers grounded in your documents with source citations.',
    tech: 'Groundedness verification',
    color: 'text-purple-600',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Bot,
    title: 'AI Assistants',
    description: 'Build custom assistants with system prompts, KB binding, and embeddable widgets.',
    tech: 'System prompts + widget embed',
    color: 'text-orange-600',
    bg: 'bg-orange-500/10',
  },
];

const steps = [
  { number: 1, icon: Upload, title: 'Upload', description: 'PDF, PNG, JPG, TIFF' },
  { number: 2, icon: Sparkles, title: 'Extract', description: 'Multi-AI OCR pipeline' },
  { number: 3, icon: Search, title: 'Organize', description: 'Knowledge bases + embeddings' },
  { number: 4, icon: MessageSquare, title: 'Ask', description: 'RAG with citations' },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleTryDemo = () => {
    dispatch(enterDemoMode());
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Doctify</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/auth/login')}>
                Sign In
              </Button>
              <Button onClick={handleTryDemo}>
                Try Demo
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
          <motion.div
            className="text-center"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                AI-Powered Document Intelligence
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              Turn Documents into
              <br />
              <span className="text-primary">Intelligence with AI</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
            >
              Upload documents, extract data with multi-provider AI, organize into knowledge bases,
              and ask questions with RAG-powered answers grounded in your sources.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button size="lg" className="w-full sm:w-auto" onClick={handleTryDemo}>
                Try Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate('/auth/register')}
              >
                Sign Up Free
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
          >
            <h2 className="text-3xl font-bold">Everything you need for document intelligence</h2>
            <p className="mt-3 text-muted-foreground">
              From extraction to knowledge management, powered by multi-provider AI.
            </p>
          </motion.div>
          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={fadeUp}
                  className="group rounded-xl border bg-card p-6 transition-colors hover:bg-muted/50"
                >
                  <div className={`mb-4 inline-flex rounded-lg p-3 ${feature.bg}`}>
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                  <p className="mt-3 text-xs font-medium text-primary">{feature.tech}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
          >
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="mt-3 text-muted-foreground">Four steps from raw document to actionable intelligence.</p>
          </motion.div>
          <motion.div
            className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  variants={fadeUp}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Connecting line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-[calc(50%+2rem)] top-6 hidden h-0.5 w-[calc(100%-4rem)] bg-border lg:block" />
                  )}
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                    {step.number}
                  </div>
                  <div className="mt-4 rounded-lg border bg-card p-4 w-full">
                    <Icon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 sm:py-24 bg-foreground text-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-bold">
              Ready to get started?
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-lg opacity-80">
              Try the demo with sample data or create your free account.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={handleTryDemo}
              >
                Try Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-background/20 text-background hover:bg-background/10"
                onClick={() => navigate('/auth/register')}
              >
                Sign Up Free
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>
              Built with FastAPI, React, PostgreSQL, and pgvector
            </p>
            <p>
              By{' '}
              <a
                href="https://github.com/kahwei-loo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline"
              >
                Kah Wei Loo
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
