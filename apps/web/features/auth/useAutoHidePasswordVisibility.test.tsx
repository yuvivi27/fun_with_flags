import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoHidePasswordVisibility } from "./useAutoHidePasswordVisibility";

describe("useAutoHidePasswordVisibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts hidden", () => {
    const { result } = renderHook(() => useAutoHidePasswordVisibility());
    expect(result.current.visible).toBe(false);
  });

  it("toggles visible on, then auto-hides after the default timeout", () => {
    const { result } = renderHook(() => useAutoHidePasswordVisibility());
    act(() => result.current.toggle());
    expect(result.current.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(result.current.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(result.current.visible).toBe(false);
  });

  it("manual toggle off cancels the pending timer", () => {
    const { result } = renderHook(() => useAutoHidePasswordVisibility(1000));
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.visible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.visible).toBe(false);
  });

  it("rescheduling resets the auto-hide window", () => {
    const { result } = renderHook(() => useAutoHidePasswordVisibility(500));
    act(() => result.current.toggle());
    act(() => {
      vi.advanceTimersByTime(400);
    });
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.visible).toBe(true);
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current.visible).toBe(true);
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(result.current.visible).toBe(false);
  });

  it("clears the timer on unmount", () => {
    const { result, unmount } = renderHook(() =>
      useAutoHidePasswordVisibility(500),
    );
    act(() => result.current.toggle());
    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
  });
});
