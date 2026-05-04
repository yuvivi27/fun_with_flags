import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, vi } from "vitest";

// ---- Firebase ---------------------------------------------------------------

vi.mock("../firebaseConfig", () => ({
  db: {},
  auth: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  setDoc: vi.fn(async () => undefined),
  serverTimestamp: vi.fn(() => "__server-ts__"),
  collection: vi.fn(() => ({})),
  query: vi.fn((..._args: unknown[]) => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  getDocs: vi.fn(async () => ({ docs: [] })),
  getCountFromServer: vi.fn(async () => ({ data: () => ({ count: 0 }) })),
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
  getApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
}));

// ---- Capacitor (used in auth-context for native platform detection) --------

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => "web"),
  },
}));

// ---- next/navigation -------------------------------------------------------

const routerMocks = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

let pathname = "/";
let searchParams = new URLSearchParams();

export const __routerMocks = routerMocks;

export function __setPathname(next: string): void {
  pathname = next;
}

export function __setSearchParams(next: URLSearchParams | string): void {
  searchParams =
    typeof next === "string" ? new URLSearchParams(next) : next;
}

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
  usePathname: () => pathname,
  useSearchParams: () => searchParams,
}));

// ---- next/link -------------------------------------------------------------

type LinkProps = {
  children: ReactNode;
  href: string | { pathname?: string };
  [key: string]: unknown;
};

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: LinkProps) => {
    const resolved =
      typeof href === "string"
        ? href
        : typeof href === "object" && href && "pathname" in href
          ? (href.pathname ?? "#")
          : "#";
    return (
      <a href={resolved} {...rest}>
        {children}
      </a>
    );
  },
}));

// ---- Browser polyfills jsdom doesn't ship --------------------------------

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    })),
  });
}

class MockImage {
  decode?: () => Promise<void>;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  #src = "";
  get src(): string {
    return this.#src;
  }
  set src(value: string) {
    this.#src = value;
    queueMicrotask(() => this.onload?.());
  }
}

vi.stubGlobal("Image", MockImage);

// ---- Per-test resets -------------------------------------------------------

beforeEach(() => {
  routerMocks.push.mockReset();
  routerMocks.replace.mockReset();
  routerMocks.back.mockReset();
  routerMocks.forward.mockReset();
  routerMocks.refresh.mockReset();
  routerMocks.prefetch.mockReset();
  pathname = "/";
  searchParams = new URLSearchParams();
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
});
