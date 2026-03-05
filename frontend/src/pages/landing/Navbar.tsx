import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useTheme } from "@/shared/providers/ThemeProvider";

interface NavbarProps {
  onTryDemo: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onTryDemo }) => {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);

  const { scrollY, scrollYProgress } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  // scrollYProgress is already 0-1, matching scaleX range directly
  const progressScaleX = scrollYProgress;

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const isDark = resolvedTheme === "dark";

  return (
    <motion.nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/80 backdrop-blur-2xl shadow-sm border-b border-transparent"
          : "bg-background/60 backdrop-blur-xl border-b border-white/10"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between transition-all duration-300 ${
            isScrolled ? "h-14" : "h-16"
          }`}
        >
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-landing-accent to-landing-teal">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Doctify</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isDark ? "moon" : "sun"}
                  initial={{ rotate: -90, scale: 0, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  {isDark ? (
                    <Moon className="h-[1.125rem] w-[1.125rem]" />
                  ) : (
                    <Sun className="h-[1.125rem] w-[1.125rem]" />
                  )}
                </motion.div>
              </AnimatePresence>
            </button>

            <Button variant="ghost" onClick={() => navigate("/auth/login")}>
              Sign In
            </Button>
            <Button
              onClick={onTryDemo}
              className="bg-gradient-to-r from-landing-accent to-landing-teal text-white border-0 hover:opacity-90 transition-opacity"
            >
              Try Demo
            </Button>
          </div>
        </div>
      </div>

      {/* Scrolled state: gradient bottom border */}
      {isScrolled && (
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-landing-accent/40 to-transparent" />
      )}

      {/* Scroll progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-landing-accent via-landing-teal to-landing-rose"
        style={{ scaleX: progressScaleX }}
      />
    </motion.nav>
  );
};

export default Navbar;
