import React from "react";
import { motion, useMotionValue, useMotionTemplate } from "framer-motion";
import { blurFadeUp, staggerContainer } from "./animations";
import { features } from "./constants";

interface FeatureCardProps {
  feature: (typeof features)[number];
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature }) => {
  const Icon = feature.icon;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  }

  const radialGradient = useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, hsl(var(--landing-accent) / 0.1), transparent 80%)`;

  return (
    <motion.div
      key={feature.title}
      variants={blurFadeUp}
      className="group relative glass-card rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-glow-sm overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Cursor-tracking radial gradient glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: radialGradient,
        }}
      />

      {/* Hover top border gradient */}
      <div
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />

      {/* Hover shine sweep */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
      </div>

      {/* Icon with hover micro-interaction */}
      <motion.div
        className={`mb-5 inline-flex rounded-xl p-3 bg-gradient-to-br ${feature.gradient} shadow-lg`}
        whileHover={{ scale: 1.1, rotate: -5 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <Icon className="h-6 w-6 text-white" />
      </motion.div>

      <h3 className="text-lg font-semibold">{feature.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground/80 leading-relaxed">{feature.description}</p>

      <span className="mt-4 inline-block text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground/70 font-medium">
        {feature.tech}
      </span>
    </motion.div>
  );
};

const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-24 sm:py-32 relative">
      {/* Subtle gradient background for visual rhythm */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={blurFadeUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold">
            Everything you need for{" "}
            <span className="bg-gradient-to-r from-landing-accent to-landing-teal bg-clip-text text-transparent">
              document intelligence
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground/80 max-w-2xl mx-auto">
            From extraction to knowledge management, powered by multi-provider AI.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
