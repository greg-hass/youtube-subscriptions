import type { Metadata } from "next";
import "./globals.css";
import RootProviders from "./providers";

export const metadata: Metadata = {
  title: "YouTube Subscriptions",
  description: "Manage your YouTube subscriptions",
};

// Prevent static generation for all routes
export const dynamic = 'force-dynamic';

// Disable CSP for Electron app (localhost environment)
const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self';",
  "base-uri 'self';",
  "object-src 'none';",
  "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com https://www.gstatic.com;",
  "style-src 'self' 'unsafe-inline';",
  "img-src 'self' data: blob: https://i.ytimg.com https://yt3.ggpht.com https://lh3.googleusercontent.com;",
  "font-src 'self' data:;",
  "connect-src 'self' https://www.googleapis.com https://oauth2.googleapis.com https://accounts.google.com https://www.youtube.com https://s.ytimg.com http://localhost:3000;",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com;",
  "media-src 'self' blob:;",
  "form-action 'self';",
  "worker-src 'self' blob:;",
].join(" ");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {isProduction && (
          <meta
            httpEquiv="Content-Security-Policy"
            content={contentSecurityPolicy}
          />
        )}
      </head>
      <body className="antialiased">
        <RootProviders>
          {children}
        </RootProviders>
      </body>
    </html>
  );
}
