import Link from "next/link";

/**
 * Public route group layout.
 *
 * Provides a shared header navigation and content container for the public
 * Match Center pages (matches, standings, bracket, players). Inherits the
 * root layout's ThemeProvider, fonts, and KOORAKIT tokens; the home page
 * remains at `app/page.tsx` and is unaffected by this group.
 */

const NAV_LINKS = [
  { href: "/matches", label: "Matches" },
  { href: "/standings", label: "Standings" },
  { href: "/bracket", label: "Bracket" },
  { href: "/news", label: "News" },
  { href: "/faq", label: "FAQ" },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="glass sticky top-0 z-20 border-b border-white/10">
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"
        >
          <Link
            href="/"
            className="font-orbitron text-lg font-black uppercase tracking-[0.2em] text-accent"
          >
            KOORAKIT
          </Link>
          <ul className="flex items-center gap-6 text-sm font-medium">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-foreground/70 transition-colors hover:text-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
