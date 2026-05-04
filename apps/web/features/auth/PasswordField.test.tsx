import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PasswordField } from "./PasswordField";

describe("PasswordField", () => {
  it("renders a password input by default", () => {
    render(
      <PasswordField
        label="Password"
        value=""
        onChange={() => {}}
        autoComplete="current-password"
        showPassword={false}
        onTogglePassword={() => {}}
      />,
    );
    const input = screen.getByLabelText(/^Password$/i, {
      selector: "input",
    }) as HTMLInputElement;
    expect(input.type).toBe("password");
    const toggle = screen.getByRole("button", { name: /Show password/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("flips to text input when showPassword is true", () => {
    render(
      <PasswordField
        label="Password"
        value="hello"
        onChange={() => {}}
        autoComplete="current-password"
        showPassword
        onTogglePassword={() => {}}
      />,
    );
    const input = screen.getByLabelText(/^Password$/i, {
      selector: "input",
    }) as HTMLInputElement;
    expect(input.type).toBe("text");
    expect(input.value).toBe("hello");
    expect(
      screen.getByRole("button", { name: /Hide password/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onChange and onTogglePassword as expected", () => {
    const onChange = vi.fn();
    const onToggle = vi.fn();
    render(
      <PasswordField
        label="Password"
        value=""
        onChange={onChange}
        autoComplete="new-password"
        showPassword={false}
        onTogglePassword={onToggle}
      />,
    );

    const input = screen.getByLabelText(/^Password$/i, { selector: "input" });
    fireEvent.change(input, { target: { value: "abcd1234" } });
    expect(onChange).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Show password/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
