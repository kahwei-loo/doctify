/**
 * Unit Tests for Input Component
 *
 * Tests input types, validation, error states, and user interactions
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/shared/components/ui/Input/Input";

describe("Input Component", () => {
  describe("Rendering", () => {
    it("renders with default props", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("renders with placeholder", () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
    });

    it("renders with label", () => {
      render(<Input label="Username" />);
      expect(screen.getByLabelText("Username")).toBeInTheDocument();
    });

    it("renders with helper text", () => {
      render(<Input helperText="Enter your username" />);
      expect(screen.getByText("Enter your username")).toBeInTheDocument();
    });

    it("renders with error message", () => {
      render(<Input error="Username is required" />);
      expect(screen.getByText("Username is required")).toBeInTheDocument();
    });

    it("renders as disabled", () => {
      render(<Input disabled />);
      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });

    it("renders as readonly", () => {
      render(<Input readOnly value="Read only value" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("readonly");
    });

    it("renders with required indicator when label and required are set", () => {
      render(<Input label="Required Field" required />);
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("renders full width when fullWidth is true", () => {
      const { container } = render(<Input fullWidth />);
      const containerDiv = container.querySelector(".input-container");
      expect(containerDiv).toHaveClass("input-container--full-width");
    });
  });

  describe("Input Types", () => {
    it("renders email input", () => {
      render(<Input type="email" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "email");
    });

    it("renders password input", () => {
      render(<Input type="password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it("renders number input", () => {
      render(<Input type="number" />);
      const input = screen.getByRole("spinbutton");
      expect(input).toBeInTheDocument();
    });

    it("renders tel input", () => {
      render(<Input type="tel" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "tel");
    });

    it("renders url input", () => {
      render(<Input type="url" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "url");
    });

    it("renders search input", () => {
      render(<Input type="search" />);
      const input = screen.getByRole("searchbox");
      expect(input).toBeInTheDocument();
    });
  });

  describe("Value Management", () => {
    it("displays initial value", () => {
      render(<Input value="Initial value" onChange={() => {}} />);
      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("Initial value");
    });

    it("updates value on change", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Hello");

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe("Validation", () => {
    it("shows error state when error prop is provided", () => {
      const { container } = render(<Input error="This field is required" />);
      const wrapper = container.querySelector(".input-wrapper");
      expect(wrapper).toHaveClass("input-wrapper--error");
    });

    it("displays error message", () => {
      render(<Input error="Invalid input" />);
      expect(screen.getByText("Invalid input")).toBeInTheDocument();
    });

    it("error message replaces helper text", () => {
      render(<Input error="Error message" helperText="Helper text" />);
      expect(screen.getByText("Error message")).toBeInTheDocument();
      expect(screen.queryByText("Helper text")).not.toBeInTheDocument();
    });

    it("validates required field", () => {
      render(<Input required />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("required");
    });

    it("validates min length", () => {
      render(<Input minLength={5} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("minLength", "5");
    });

    it("validates max length", () => {
      render(<Input maxLength={10} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("maxLength", "10");
    });

    it("validates pattern", () => {
      render(<Input pattern="[A-Za-z]+" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("pattern", "[A-Za-z]+");
    });
  });

  describe("Icons", () => {
    it("renders with start icon", () => {
      const Icon = () => <span data-testid="start-icon">🔍</span>;
      render(<Input startIcon={<Icon />} />);
      expect(screen.getByTestId("start-icon")).toBeInTheDocument();
    });

    it("renders with end icon", () => {
      const Icon = () => <span data-testid="end-icon">✓</span>;
      render(<Input endIcon={<Icon />} />);
      expect(screen.getByTestId("end-icon")).toBeInTheDocument();
    });

    it("applies start icon wrapper class", () => {
      const Icon = () => <span>🔍</span>;
      const { container } = render(<Input startIcon={<Icon />} />);
      const wrapper = container.querySelector(".input-wrapper");
      expect(wrapper).toHaveClass("input-wrapper--with-start-icon");
    });

    it("applies end icon wrapper class", () => {
      const Icon = () => <span>✓</span>;
      const { container } = render(<Input endIcon={<Icon />} />);
      const wrapper = container.querySelector(".input-wrapper");
      expect(wrapper).toHaveClass("input-wrapper--with-end-icon");
    });

    it("renders with both icons", () => {
      const StartIcon = () => <span data-testid="start-icon">🔍</span>;
      const EndIcon = () => <span data-testid="end-icon">✓</span>;
      render(<Input startIcon={<StartIcon />} endIcon={<EndIcon />} />);

      expect(screen.getByTestId("start-icon")).toBeInTheDocument();
      expect(screen.getByTestId("end-icon")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls onFocus when input is focused", () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it("calls onBlur when input loses focus", () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it("calls onKeyDown when key is pressed", async () => {
      const user = userEvent.setup();
      const handleKeyDown = vi.fn();
      render(<Input onKeyDown={handleKeyDown} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "a");

      expect(handleKeyDown).toHaveBeenCalled();
    });

    it("handles Enter key submission", async () => {
      const user = userEvent.setup();
      const handleKeyDown = vi.fn();
      render(<Input onKeyDown={handleKeyDown} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "{Enter}");

      expect(handleKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: "Enter" }));
    });
  });

  describe("Accessibility", () => {
    it("has correct role", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("associates label with input", () => {
      render(<Input label="Email" />);
      const input = screen.getByLabelText("Email");
      expect(input).toBeInTheDocument();
    });

    it("provides autocomplete attribute", () => {
      render(<Input autoComplete="email" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("autocomplete", "email");
    });

    it("supports custom id", () => {
      render(<Input id="custom-input" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("id", "custom-input");
    });

    it("generates unique id when not provided", () => {
      render(<Input label="Test Label" />);
      const input = screen.getByLabelText("Test Label");
      expect(input.getAttribute("id")).toBeTruthy();
    });
  });

  describe("Custom Class Names", () => {
    it("applies custom className", () => {
      const { container } = render(<Input className="custom-class" />);
      const containerDiv = container.querySelector(".input-container");
      expect(containerDiv).toHaveClass("custom-class");
    });

    it("merges custom className with default classes", () => {
      const { container } = render(<Input className="custom-class" fullWidth />);
      const containerDiv = container.querySelector(".input-container");
      expect(containerDiv).toHaveClass("input-container");
      expect(containerDiv).toHaveClass("input-container--full-width");
      expect(containerDiv).toHaveClass("custom-class");
    });
  });
});
