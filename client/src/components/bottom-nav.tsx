import { Link, useLocation } from "wouter";
import { Home, MapPin } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();
  const isHome = location === "/";
  const isTrips = location.startsWith("/trips");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="max-w-xl mx-auto flex">
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
            isHome ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="nav-home"
        >
          <Home className="w-5 h-5" />
          日常
        </Link>
        <Link
          href="/trips"
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
            isTrips ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="nav-trips"
        >
          <MapPin className="w-5 h-5" />
          出遊
        </Link>
      </div>
    </nav>
  );
}
