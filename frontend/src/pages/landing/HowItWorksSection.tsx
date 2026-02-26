import React from 'react';
import { motion } from 'framer-motion';
import { blurFadeUp, staggerContainer } from './animations';
import { steps } from './constants';

const HowItWorksSection: React.FC = () => {
  return (
    <section className="py-24 sm:py-32 bg-muted/40 relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={blurFadeUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold">
            How it{' '}
            <span className="bg-gradient-to-r from-landing-teal to-landing-accent bg-clip-text text-transparent">
              works
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground/80">
            Four steps from raw document to actionable intelligence.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                variants={blurFadeUp}
                className="relative flex flex-col items-center text-center"
              >
                {/* Connecting gradient line (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+2rem)] top-6 hidden h-0.5 lg:block overflow-hidden"
                    style={{ width: 'calc(100% - 4rem)' }}
                  >
                    <div className="h-full w-full bg-gradient-to-r from-landing-accent/40 to-landing-teal/40" />
                    {/* Traveling dot */}
                    <div
                      className="absolute top-[-2px] h-[5px] w-[5px] rounded-full bg-landing-accent"
                      style={{
                        animation: `travelDot 3s ease-in-out ${index * 0.8}s infinite`,
                      }}
                    />
                  </div>
                )}

                {/* Numbered circle */}
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-landing-accent to-landing-teal text-white text-lg font-bold shadow-glow-sm">
                  {step.number}
                </div>

                {/* Card */}
                <div className="mt-4 glass-card rounded-xl p-5 w-full">
                  <Icon className="mx-auto h-8 w-8 text-muted-foreground/60 mb-3" />
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Traveling dot keyframe */}
      <style>{`
        @keyframes travelDot {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
      `}</style>
    </section>
  );
};

export default HowItWorksSection;
