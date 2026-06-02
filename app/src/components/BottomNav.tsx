"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, LayoutGrid, Map } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/exhibition", label: "전시관", icon: LayoutGrid },
  { href: "/recommend", label: "추천", icon: Compass },
  { href: "/roadmap", label: "로드맵", icon: Map },
  { href: "/subjects", label: "과목", icon: BookOpen },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex w-full max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] transition-colors",
                "active:scale-95",
                isActive
                  ? "font-medium text-[var(--primary)]"
                  : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-[var(--primary)]" : "text-muted-foreground"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
