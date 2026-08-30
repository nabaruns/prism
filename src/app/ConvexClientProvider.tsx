"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ReactNode } from "react";

// Public Convex deployment URL. Env var wins; the literal is a safe fallback
// (this URL is public, not a secret) so the client always connects.
const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://sincere-dragon-258.eu-west-1.convex.cloud";

const convex = new ConvexReactClient(CONVEX_URL);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
