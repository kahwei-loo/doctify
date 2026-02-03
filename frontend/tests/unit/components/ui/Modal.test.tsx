/**
 * Unit Tests for Modal Component
 *
 * Tests modal visibility, content, interactions, and accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/shared/components/ui/Modal/Modal';

describe('Modal Component', () => {
  describe('Visibility', () => {
    it('is hidden when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}}>
          <div>Modal Content</div>
        </Modal>
      );
      expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
    });

    it('is visible when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Modal Content</div>
        </Modal>
      );
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('shows title when provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Modal Title">
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText('Modal Title')).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} showCloseButton={false}>
          <div>Content</div>
        </Modal>
      );
      expect(screen.queryByRole('button', { name: /close modal/i })).not.toBeInTheDocument();
    });
  });

  describe('Closing Behavior', () => {
    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Modal>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      fireEvent.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Modal>
      );

      // Click on the backdrop (the outer div with modal-backdrop class)
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when backdrop is clicked if closeOnBackdropClick is false', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} closeOnBackdropClick={false}>
          <div>Content</div>
        </Modal>
      );

      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on Escape if closeOnEscape is false', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} closeOnEscape={false}>
          <div>Content</div>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} size="small">
          <div>Small Modal</div>
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('modal--small');
    });

    it('renders medium size by default', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Medium Modal</div>
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('modal--medium');
    });

    it('renders large size', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} size="large">
          <div>Large Modal</div>
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('modal--large');
    });

    it('renders full size', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} size="full">
          <div>Full Modal</div>
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('modal--full');
    });
  });

  describe('Footer', () => {
    it('renders footer when provided', () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => {}}
          footer={<div>Footer Content</div>}
        >
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });

    it('renders action buttons in footer', () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => {}}
          footer={
            <>
              <button>Cancel</button>
              <button>Confirm</button>
            </>
          }
        >
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });
  });

  describe('Scrolling', () => {
    it('prevents body scroll when modal is open', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when modal is closed', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );

      rerender(
        <Modal isOpen={false} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('has correct role', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('close button has aria-label', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Portal Rendering', () => {
    it('renders in document body', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Portal Content</div>
        </Modal>
      );

      // Modal uses createPortal to render to body
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });
  });
});
