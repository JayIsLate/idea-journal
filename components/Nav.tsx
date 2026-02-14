"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Stream" },
  { href: "/grid", label: "Grid" },
  { href: "/ideas", label: "Ideas" },
  { href: "/submit", label: "+" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="max-w-stream mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="font-mono text-base sm:text-lg font-bold tracking-tight">
          idea<span className="text-accent">.</span>journal
        </Link>
        <div className="flex gap-1">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-mono px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "text-text font-medium bg-bg"
                    : "text-secondary active:bg-bg"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
