import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(() => window.history.replaceState(null, "", "/"));

describe("landing page visitor journeys", () => {
  it("lets a visitor switch sample shelves, pick, and reset without leaving the demo", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /おしごと/ }));
    fireEvent.click(screen.getByRole("button", { name: "ロケット" }));
    expect(
      screen.getByText("ロケット をプレビューに追加しました"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /リセット/ }));
    expect(
      screen.queryByText("ロケット をプレビューに追加しました"),
    ).not.toBeInTheDocument();
  });

  it("keeps the actual prerelease status and install guide next to the release link", () => {
    render(<App />);
    const download = screen.getByRole("region", {
      name: "はじめる前に、知っておきたいこと。",
    });
    expect(within(download).getByText("テスト用 RC 1 · 未署名")).toBeVisible();
    expect(
      within(download).getByRole("link", { name: /RC 1の配布ページ/ }),
    ).toHaveAttribute(
      "href",
      "https://github.com/ELRdn/EmoShelf/releases/tag/v1.0.0-rc.1",
    );
    expect(
      within(download).getByRole("link", { name: /インストール手順/ }),
    ).toHaveAttribute("href", expect.stringContaining("README.jp.md"));
  });

  it("loads English from its shareable URL and links back to Japanese", () => {
    window.history.replaceState(null, "", "/en/");
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Your favorites.",
    );
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "日本語" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: /Read the install guide/ }),
    ).toHaveAttribute("href", "https://github.com/ELRdn/EmoShelf#install");
  });
});
