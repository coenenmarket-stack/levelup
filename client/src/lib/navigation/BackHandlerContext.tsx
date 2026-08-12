import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { normalizeLocation, parentRouteFor } from "./routeParents";

/** Return true if this handler consumed the back action. */
export type BackHandler = () => boolean;

type BackNavigationApi = {
  register: (handler: BackHandler) => () => void;
  goBack: () => boolean;
  canGoBack: () => boolean;
};

const BackNavigationContext = createContext<BackNavigationApi | null>(null);

export function BackHandlerProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useLocation();
  const handlersRef = useRef<BackHandler[]>([]);
  const pathStackRef = useRef<string[]>([]);
  const skippingPushRef = useRef(false);

  useEffect(() => {
    const next = normalizeLocation(loc);
    if (skippingPushRef.current) {
      skippingPushRef.current = false;
      const top = pathStackRef.current[pathStackRef.current.length - 1];
      if (top !== next) {
        pathStackRef.current[pathStackRef.current.length - 1] = next;
      }
      return;
    }

    const stack = pathStackRef.current;
    if (stack.length >= 2 && stack[stack.length - 2] === next) {
      stack.pop();
      return;
    }
    if (stack[stack.length - 1] === next) return;
    stack.push(next);
  }, [loc]);

  const register = useCallback((handler: BackHandler) => {
    handlersRef.current.push(handler);
    return () => {
      const i = handlersRef.current.lastIndexOf(handler);
      if (i >= 0) handlersRef.current.splice(i, 1);
    };
  }, []);

  const canGoBack = useCallback(() => {
    if (handlersRef.current.length > 0) return true;
    if (pathStackRef.current.length >= 2) return true;
    return parentRouteFor(normalizeLocation(loc)) != null;
  }, [loc]);

  const goBack = useCallback(() => {
    const handlers = handlersRef.current;
    for (let i = handlers.length - 1; i >= 0; i--) {
      try {
        if (handlers[i]()) return true;
      } catch {
        /* ignore handler errors */
      }
    }

    const stack = pathStackRef.current;
    if (stack.length >= 2) {
      stack.pop();
      const prev = stack[stack.length - 1] ?? "/";
      skippingPushRef.current = true;
      setLoc(prev);
      return true;
    }

    const parent = parentRouteFor(normalizeLocation(loc));
    if (parent) {
      skippingPushRef.current = true;
      pathStackRef.current = [parent];
      setLoc(parent);
      return true;
    }

    return false;
  }, [loc, setLoc]);

  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;

  // Android hardware back → same stack as edge swipe.
  useEffect(() => {
    let handle: { remove: () => Promise<void> } | null = null;
    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App: CapApp } = await import("@capacitor/app");
        handle = await CapApp.addListener("backButton", () => {
          goBackRef.current();
        });
      } catch {
        /* web / unavailable */
      }
    })();
    return () => {
      void handle?.remove();
    };
  }, []);

  const api = useMemo(
    () => ({ register, goBack, canGoBack }),
    [register, goBack, canGoBack],
  );

  return (
    <BackNavigationContext.Provider value={api}>{children}</BackNavigationContext.Provider>
  );
}

export function useBackNavigation(): BackNavigationApi {
  const ctx = useContext(BackNavigationContext);
  if (!ctx) {
    throw new Error("useBackNavigation must be used within BackHandlerProvider");
  }
  return ctx;
}

/** Register a dismiss/back handler while `enabled` is true (LIFO stack). */
export function useRegisterBackHandler(handler: BackHandler, enabled = true) {
  const { register } = useBackNavigation();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    return register(() => handlerRef.current());
  }, [enabled, register]);
}
