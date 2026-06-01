"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, Home, Map } from "lucide-react";
import { useHyojaRuntime } from "@/contexts/HyojaRuntimeContext";
import { buildShareHref } from "@/lib/hyoja/share-routes";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "홈", icon: Home },
  { path: "/recommend", label: "추천", icon: Compass },
  { path: "/roadmap", label: "로드맵", icon: Map },
  { path: "/subjects", label: "과목", icon: BookOpen },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { basePath } = useHyojaRuntime();

  return (
    <nav
      aria-label="학생 공개 하단 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const href = buildShareHref(basePath, item.path);
          const isActive =
            item.path === "/"
              ? pathname === basePath
              : pathname.startsWith(href);

          return (
            <Link
              key={item.path}
              href={href}
              className={cn(
                "flex min-h-[56px] min-w-[64px] flex-col items-center justify-center gap-0.5 px-3 py-2 text-xs transition-colors active:scale-95",
                isActive
                  ? "font-medium text-[var(--primary)]"
                  : "text-muted-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-[var(--primary)]" : "text-muted-foreground",
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
