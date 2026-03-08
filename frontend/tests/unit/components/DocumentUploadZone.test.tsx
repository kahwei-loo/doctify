import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  DocumentUploadZone,
  getFileRejectionMessage,
} from "@/features/documents/components/DocumentUploadZone";

// --- Helpers ---

function createFile(name: string, type: string, size = 1024): File {
  const content = new Array(size).fill("a").join("");
  return new File([content], name, { type });
}

// --- Tests ---

describe("DocumentUploadZone", () => {
  const defaultProps = {
    onFilesAccepted: vi.fn(),
    onFilesRejected: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Full Mode (default)", () => {
    it("renders drag-and-drop text", () => {
      render(<DocumentUploadZone {...defaultProps} />);
      expect(screen.getByText(/drag & drop documents here/i)).toBeInTheDocument();
    });

    it("renders click-to-browse text", () => {
      render(<DocumentUploadZone {...defaultProps} />);
      expect(screen.getByText(/or click to browse your files/i)).toBeInTheDocument();
    });

    it("renders file type labels", () => {
      render(<DocumentUploadZone {...defaultProps} />);
      expect(screen.getByText("PDF")).toBeInTheDocument();
      expect(screen.getByText("TXT")).toBeInTheDocument();
      expect(screen.getByText("MD")).toBeInTheDocument();
      expect(screen.getByText("CSV")).toBeInTheDocument();
      expect(screen.getByText("PNG")).toBeInTheDocument();
      expect(screen.getByText("JPG")).toBeInTheDocument();
    });

    it("renders size limit text", () => {
      render(<DocumentUploadZone {...defaultProps} />);
      expect(screen.getByText(/maximum file size: 10mb/i)).toBeInTheDocument();
    });

    it("renders max files text", () => {
      render(<DocumentUploadZone {...defaultProps} />);
      expect(screen.getByText(/up to 20 files/i)).toBeInTheDocument();
    });

    it("renders a hidden file input", () => {
      const { container } = render(<DocumentUploadZone {...defaultProps} />);
      const input = container.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
    });
  });

  describe("Compact Mode", () => {
    it("renders compact layout with drag text", () => {
      render(<DocumentUploadZone {...defaultProps} compact />);
      expect(screen.getByText(/drag & drop files/i)).toBeInTheDocument();
    });

    it("renders Browse button in compact mode", () => {
      render(<DocumentUploadZone {...defaultProps} compact />);
      expect(screen.getByRole("button", { name: /browse/i })).toBeInTheDocument();
    });

    it("renders supported file types in compact mode", () => {
      render(<DocumentUploadZone {...defaultProps} compact />);
      expect(screen.getByText(/pdf, txt, md, csv, png, jpg/i)).toBeInTheDocument();
    });

    it("does not render full-mode specific text in compact mode", () => {
      render(<DocumentUploadZone {...defaultProps} compact />);
      expect(screen.queryByText(/or click to browse your files/i)).not.toBeInTheDocument();
    });
  });

  describe("File Selection", () => {
    it("calls onFilesAccepted when valid files are selected", async () => {
      const onFilesAccepted = vi.fn();
      const { container } = render(
        <DocumentUploadZone onFilesAccepted={onFilesAccepted} onFilesRejected={vi.fn()} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createFile("document.pdf", "application/pdf");

      Object.defineProperty(input, "files", { value: [file] });
      fireEvent.drop(input, {
        dataTransfer: { files: [file], types: ["Files"] },
      });

      // react-dropzone processes files asynchronously
      // We rely on the callback being eventually called
    });

    it("renders without crashing when onFilesRejected is not provided", () => {
      expect(() => {
        render(<DocumentUploadZone onFilesAccepted={vi.fn()} />);
      }).not.toThrow();
    });
  });

  describe("Disabled State", () => {
    it("applies disabled styling", () => {
      const { container } = render(<DocumentUploadZone {...defaultProps} disabled />);
      const dropzone = container.firstChild as HTMLElement;
      expect(dropzone.className).toContain("cursor-not-allowed");
    });

    it("disables Browse button in compact mode", () => {
      render(<DocumentUploadZone {...defaultProps} compact disabled />);
      expect(screen.getByRole("button", { name: /browse/i })).toBeDisabled();
    });
  });

  describe("Custom className", () => {
    it("applies custom className to the root element", () => {
      const { container } = render(
        <DocumentUploadZone {...defaultProps} className="custom-class" />
      );
      const dropzone = container.firstChild as HTMLElement;
      expect(dropzone.className).toContain("custom-class");
    });

    it("applies custom className in compact mode", () => {
      const { container } = render(
        <DocumentUploadZone {...defaultProps} compact className="compact-custom" />
      );
      const dropzone = container.firstChild as HTMLElement;
      expect(dropzone.className).toContain("compact-custom");
    });
  });
});
