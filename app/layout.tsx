import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import Providers from "@/components/Providers";
import NavbarUser from "@/components/NavbarUser";

export const metadata: Metadata = {
  title: "BenQ",
  description: "Learn consistently. Improve daily.",
};

export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const name = process.env.NEXT_PUBLIC_APP_NAME || "BenQ";

  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-700 min-h-screen">
        <Providers>
          <nav className="sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="mx-auto max-w-4xl px-4 py-3 flex items-center">
              <div className="flex items-center gap-4">
                <span className="font-extrabold text-lg tracking-tight">
                  <Link
                    href="/"
                    className="text-gray-900 hover:text-emerald-600 transition"
                  >
                    {name}
                  </Link>
                </span>

                <ul className="flex gap-4 text-sm font-medium text-gray-600">
                  <li>
                    <Link
                      href="/quiz"
                      className="hover:text-emerald-600 transition"
                    >
                      Quiz
                    </Link>
                  </li>

                  <li>
                    <Link
                      href="/match"
                      className="hover:text-emerald-600 transition"
                    >
                      Match
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/calendar"
                      className="hover:text-emerald-600 transition"
                    >
                      Calendar
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/leaderboard"
                      className="hover:text-emerald-600 transition"
                    >
                      Leaderboard
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="ml-auto hidden md:flex items-center gap-4">
                <NavbarUser />
              </div>
            </div>
          </nav>

          <main className="mx-auto max-w-4xl">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
