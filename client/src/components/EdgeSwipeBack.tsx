import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBackNavigation } from "@/lib/navigation/BackHandlerContext";

const EDGE_WIDTH_PX = 22;
const ACTIVATE_DX = 56;
const MAX_PULL_PX = 96;
const AXIS_LOCK_PX = 10;

function isInteractiveBlocker(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-no-swipe-back]")) return true;
  if (target.closest('[role="dialog"][data-state="open"]')) return true;
  if (target.closest("[data-radix-dialog-content]")) return true;
  if (target.closest("[data-radix-alert-dialog-content]")) return true;
  // Horizontal scroll regions — don't steal the gesture mid-scroll.
  const scrollers = target.closest("[data-swipe-scroll], .overflow-x-auto, .overflow-x-scroll");
  if (scrollers instanceof HTMLElement) {
    const style = window.getComputedStyle(scrollers);
    if (style.overflowX === "auto" || style.overflowX === "scroll") return true;
  }
  return false;
}

/**
 * Facebook / iOS-style left-edge swipe to go back.
 * Prefer registered local dismiss handlers, then in-app route history.
 */
export function EdgeSwipeBack({
  children,
  disabled = false,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  const { goBack, canGoBack } = useBackNavigation();
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pullRef = useRef(0);
  const goBackRef = useRef(goBack);
  const canGoBackRef = useRef(canGoBack);
  goBackRef.current = goBack;
  canGoBackRef.current = canGoBack;

  const tracking = useRef<{
    id: number;
    startX: number;
    startY: number;
    locked: "h" | "v" | null;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    if (disabled) return;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (!canGoBackRef.current()) return;
      const t = e.touches[0];
      if (t.clientX > EDGE_WIDTH_PX) return;
      if (isInteractiveBlocker(e.target)) return;

      tracking.current = {
        id: t.identifier,
        startX: t.clientX,
        startY: t.clientY,
        locked: null,
        active: true,
      };
      pullRef.current = 0;
      setDragging(true);
      setPull(0);
    };

    const onMove = (e: TouchEvent) => {
      const tr = tracking.current;
      if (!tr?.active) return;
      const t = Array.from(e.touches).find((x) => x.identifier === tr.id);
      if (!t) return;

      const dx = t.clientX - tr.startX;
      const dy = t.clientY - tr.startY;

      if (!tr.locked) {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        tr.locked = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
        if (tr.locked === "v") {
          tr.active = false;
          pullRef.current = 0;
          setDragging(false);
          setPull(0);
          tracking.current = null;
          return;
        }
      }

      if (tr.locked !== "h") return;
      if (e.cancelable) e.preventDefault();
      const next = Math.max(0, Math.min(MAX_PULL_PX, dx));
      pullRef.current = next;
      setPull(next);
    };

    const finish = (e: TouchEvent) => {
      const tr = tracking.current;
      if (!tr) return;
      const changed = Array.from(e.changedTouches).find((x) => x.identifier === tr.id);
      if (!changed && e.type !== "touchcancel") return;

      const dx = changed ? changed.clientX - tr.startX : pullRef.current;
      const shouldBack = tr.active && tr.locked === "h" && dx >= ACTIVATE_DX;

      tracking.current = null;
      pullRef.current = 0;
      setDragging(false);
      setPull(0);

      if (shouldBack) {
        goBackRef.current();
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true, capture: true });
    document.addEventListener("touchmove", onMove, { passive: false, capture: true });
    document.addEventListener("touchend", finish, { passive: true, capture: true });
    document.addEventListener("touchcancel", finish, { passive: true, capture: true });

    return () => {
      document.removeEventListener("touchstart", onStart, true);
      document.removeEventListener("touchmove", onMove, true);
      document.removeEventListener("touchend", finish, true);
      document.removeEventListener("touchcancel", finish, true);
    };
  }, [disabled]);

  const progress = Math.min(1, pull / ACTIVATE_DX);

  return (
    <div className="relative min-h-screen">
      {/* Edge affordance + drag shadow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 left-0 z-[70]"
        style={{
          width: dragging ? Math.max(EDGE_WIDTH_PX, pull * 0.35) : EDGE_WIDTH_PX,
          background: dragging
            ? `linear-gradient(90deg, rgba(0,0,0,${0.18 + progress * 0.12}) 0%, transparent 100%)`
            : "transparent",
          transition: dragging ? "none" : "width 160ms ease, background 160ms ease",
        }}
      />
      <div
        style={{
          transform: pull > 0 ? `translate3d(${pull * 0.55}px, 0, 0)` : undefined,
          transition: dragging ? "none" : "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          willChange: dragging ? "transform" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
