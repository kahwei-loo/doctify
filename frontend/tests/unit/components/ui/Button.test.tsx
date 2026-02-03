/**
 * Unit Tests for Button Component
 *
 * Tests button variants, sizes, states, and interaction handling
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/shared/components/ui/Button/Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click Me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it('renders with custom text', () => {
      render(<Button>Custom Text</Button>);
      expect(screen.getByText('Custom Text')).toBeInTheDocument();
    });

    it('renders as disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('renders with loading state', () => {
      render(<Button loading>Loading Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('button--loading');
    });
  });

  describe('Variants', () => {
    it('renders primary variant correctly', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--primary');
    });

    it('renders secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--secondary');
    });

    it('renders danger variant correctly', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--danger');
    });

    it('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--ghost');
    });
  });

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      render(<Button size="small">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--small');
    });

    it('renders medium size correctly', () => {
      render(<Button size="medium">Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--medium');
    });

    it('renders large size correctly', () => {
      render(<Button size="large">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--large');
    });
  });

  describe('Interaction', () => {
    it('calls onClick handler when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} loading>
          Loading
        </Button>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Icons', () => {
    it('renders with left icon', () => {
      const Icon = () => <span data-testid="icon">←</span>;
      render(
        <Button icon={<Icon />} iconPosition="left">
          With Left Icon
        </Button>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      const Icon = () => <span data-testid="icon">→</span>;
      render(
        <Button icon={<Icon />} iconPosition="right">
          With Right Icon
        </Button>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('hides icon when loading', () => {
      const Icon = () => <span data-testid="icon">*</span>;
      render(
        <Button icon={<Icon />} loading>
          Loading
        </Button>
      );

      expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
    });
  });

  describe('Full Width', () => {
    it('renders as full width when fullWidth prop is true', () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--full-width');
    });

    it('does not render as full width by default', () => {
      render(<Button>Normal Width</Button>);
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('button--full-width');
    });
  });

  describe('Custom Class Names', () => {
    it('applies custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('merges custom className with default classes', () => {
      render(
        <Button variant="primary" className="custom-class">
          Custom
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--primary');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('has correct role', () => {
      render(<Button>Accessible Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('supports aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>);
      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
    });

    it('supports aria-describedby', () => {
      render(
        <>
          <Button aria-describedby="description">Button</Button>
          <div id="description">Button description</div>
        </>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'description');
    });
  });
});
