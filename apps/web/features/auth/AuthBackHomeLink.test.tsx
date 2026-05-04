import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthBackHomeLink } from "./AuthBackHomeLink";

describe("AuthBackHomeLink", () => {
  it("renders an accessible link back to the homepage", () => {
    render(<AuthBackHomeLink />);
    const link = screen.getByRole("link", { name: /Back to home/i });
    expect(link).toHaveAttribute("href", "/");
  });
});
