import React, { useCallback } from 'react';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import type { Engine } from 'tsparticles-engine';

const ParticlesBackground: React.FC = () => {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      id="hero-particles"
      init={particlesInit}
      className="absolute inset-0"
      options={{
        fullScreen: false,
        fpsLimit: 60,
        detectRetina: true,
        particles: {
          number: {
            value: 45,
            density: { enable: true, area: 900 },
          },
          color: {
            value: ['#7c5cfc', '#2dd4a8', '#e8548e'],
          },
          shape: { type: 'circle' },
          opacity: {
            value: { min: 0.1, max: 0.4 },
            animation: {
              enable: true,
              speed: 0.8,
              minimumValue: 0.1,
              sync: false,
            },
          },
          size: {
            value: { min: 1, max: 3 },
          },
          links: {
            enable: true,
            distance: 120,
            color: '#7c5cfc',
            opacity: 0.12,
            width: 1,
          },
          move: {
            enable: true,
            speed: 0.6,
            direction: 'none',
            random: true,
            straight: false,
            outModes: { default: 'out' },
          },
        },
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: 'repulse',
            },
          },
          modes: {
            repulse: {
              distance: 100,
              duration: 0.4,
            },
          },
        },
      }}
    />
  );
};

export default ParticlesBackground;
