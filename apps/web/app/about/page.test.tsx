import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage from "./page";

describe("AboutPage", () => {
  it("renders the about content with a back link", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { name: /ABOUT THE DEVELOPER/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /LinkedIn/i }),
    ).toHaveAttribute("href", "https://www.linkedin.com/in/yuvalgershon/");
    expect(
      screen.getByRole("link", { name: /Back to menu/i }),
    ).toHaveAttribute("href", "/");
  });
});
