import React from "react";
import { motion, useMotionValue, useMotionTemplate } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { scaleReveal, blurFadeUp, staggerFast, staggerContainer } from "./animations";

const testimonials = [
  {
    quote:
      "Doctify cut our document processing time by 70%. The multi-AI fallback means we never miss an extraction, even on difficult scans.",
    name: "Sarah Chen",
    title: "Head of Operations",
    company: "DataFlow Analytics",
    rating: 5,
  },
  {
    quote:
      "The RAG pipeline with groundedness verification is impressive. Our team can finally trust AI-generated answers with source citations.",
    name: "Marcus Webb",
    title: "CTO",
    company: "LegalTech Solutions",
    rating: 5,
  },
  {
    quote:
      "We migrated from a single-provider OCR to Doctify and saw accuracy jump from 91% to 98.5%. The knowledge base feature is a game-changer.",
    name: "Priya Sharma",
    title: "VP of Engineering",
    company: "InsureDoc AI",
    rating: 5,
  },
];

const metrics = [
  { value: "98.5%", label: "OCR Accuracy" },
  { value: "3x", label: "Faster Processing" },
  { value: "10K+", label: "Documents Processed" },
  { value: "<200ms", label: "API Response" },
];

function TestimonialCard({ t }: { t: (typeof testimonials)[number] }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  }

  return (
    <motion.div
      variants={blurFadeUp}
      onMouseMove={handleMouseMove}
      className="group glass-card rounded-2xl p-7 transition-all duration-300 hover:shadow-glow-sm relative overflow-hidden"
    >
      {/* Cursor-tracking glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: useMotionTemplate`radial-gradient(250px circle at ${mouseX}px ${mouseY}px, hsl(var(--landing-accent) / 0.06), transparent 80%)`,
        }}
      />

      {/* Quote icon */}
      <Quote className="h-8 w-8 text-landing-accent/20 mb-4" />

      {/* Stars */}
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: t.rating }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>

      {/* Quote text */}
      <p className="text-sm leading-relaxed text-foreground/80">&ldquo;{t.quote}&rdquo;</p>

      {/* Author */}
      <div className="mt-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-landing-accent to-landing-teal flex items-center justify-center text-white font-semibold text-sm">
          {t.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <div className="text-sm font-medium">{t.name}</div>
          <div className="text-xs text-muted-foreground/60">
            {t.title}, {t.company}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const SocialProofSection: React.FC = () => {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      {/* Subtle accent background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-landing-accent/[0.03] to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Metrics bar */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
        >
          {metrics.map((metric) => (
            <motion.div key={metric.label} variants={scaleReveal} className="text-center">
              <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-landing-accent to-landing-teal bg-clip-text text-transparent">
                {metric.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground/70">{metric.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Section header */}
        <motion.div
          className="text-center mb-14"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={blurFadeUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-landing-accent to-landing-rose bg-clip-text text-transparent">
              teams that ship
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground/80 max-w-xl mx-auto">
            See why engineering teams choose Doctify for document intelligence.
          </p>
        </motion.div>

        {/* Testimonial cards */}
        <motion.div
          className="grid gap-6 md:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerFast}
        >
          {testimonials.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SocialProofSection;
