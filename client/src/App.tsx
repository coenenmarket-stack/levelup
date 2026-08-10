import { Switch, Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./lib/theme";
import { GameProvider } from "./lib/game";
import { AuthProvider, useAuth } from "./lib/auth";
import { AppShell } from "./components/AppShell";
import { InstallIosPrompt } from "./components/InstallIosPrompt";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Quests from "./pages/Quests";
import Character from "./pages/Character";
import Achievements from "./pages/Achievements";
import Stats from "./pages/Stats";
import Shop from "./pages/Shop";
import Coach from "./pages/Coach";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import AuthPage from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Support from "./pages/Support";
import Mindset from "./pages/Mindset";
import Certifications from "./pages/Certifications";
import SideHustles from "./pages/SideHustles";
import Friends from "./pages/Friends";
import Invite from "./pages/Invite";
import SocialHub from "./pages/SocialHub";
import Leaderboard from "./pages/Leaderboard";
import Personalize from "./pages/Personalize";
import Explore from "./pages/Explore";
import Goals from "./pages/Goals";
import CareerPaths, { CareerPathDetailPage } from "./pages/CareerPaths";
import NotFound from "@/pages/not-found";

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-7 h-7 text-primary animate-spin" />
    </div>
  );
}

function GatedApp() {
  const { me, isLoading } = useAuth();
  const [loc, setLoc] = useLocation();

  // Redirect /login or /auth path away if already signed in
  useEffect(() => {
    if (!isLoading && me?.onboarded && (loc === "/login" || loc === "/auth" || loc === "/onboarding")) {
      setLoc("/");
    }
  }, [isLoading, me, loc, setLoc]);

  // Native invite deep links → Friends page; reschedule notifications on resume
  useEffect(() => {
    if (!me?.onboarded) return;
    let handle: { remove: () => Promise<void> } | null = null;
    let resumeHandle: { remove: () => Promise<void> } | null = null;
    void (async () => {
      try {
        const { App: CapApp } = await import("@capacitor/app");
        const { parseInviteCodeFromUrl, isNativeApp } = await import("./lib/ios");
        if (!isNativeApp()) return;
        handle = await CapApp.addListener("appUrlOpen", ({ url }) => {
          const code = parseInviteCodeFromUrl(url);
          if (code) setLoc(`/friends?code=${encodeURIComponent(code)}`);
        });
        resumeHandle = await CapApp.addListener("appStateChange", async ({ isActive }) => {
          if (!isActive || !me) return;
          try {
            const { syncNotificationsForUser } = await import("./lib/notifications");
            await syncNotificationsForUser({
              prefs: {
                notificationsEnabled: !!me.notificationsEnabled,
                notifyDailyQuests: me.notifyDailyQuests !== false,
                notifyStreakRisk: me.notifyStreakRisk !== false,
                notifyWeeklyChallenges: me.notifyWeeklyChallenges !== false,
              },
            });
          } catch {
            /* ignore */
          }
        });
      } catch {
        // web / unavailable
      }
    })();
    return () => {
      void handle?.remove();
      void resumeHandle?.remove();
    };
  }, [me, setLoc]);

  if (isLoading) return <FullScreenSpinner />;

  if (!me) return <AuthPage />;
  if (!me.onboarded) return <Onboarding />;

  return (
    <GameProvider>
      <AppShell>
        <InstallIosPrompt />
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/quests" component={Quests} />
          <Route path="/character" component={Character} />
          <Route path="/profile" component={Profile} />
          <Route path="/settings" component={Settings} />
          <Route path="/achievements" component={Achievements} />
          <Route path="/stats" component={Stats} />
          <Route path="/shop" component={Shop} />
          <Route path="/coach" component={Coach} />
          <Route path="/support" component={Support} />
          <Route path="/mindset" component={Mindset} />
          <Route path="/certifications" component={Certifications} />
          <Route path="/side-hustles" component={SideHustles} />
          <Route path="/friends" component={Friends} />
          <Route path="/invite" component={Invite} />
          <Route path="/social" component={SocialHub} />
          <Route path="/leaderboard" component={Leaderboard} />
          <Route path="/personalize" component={Personalize} />
          <Route path="/explore" component={Explore} />
          <Route path="/goals" component={Goals} />
          <Route path="/career-paths/:id" component={CareerPathDetailPage} />
          <Route path="/career-paths" component={CareerPaths} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </GameProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AuthProvider>
              <GatedApp />
            </AuthProvider>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
