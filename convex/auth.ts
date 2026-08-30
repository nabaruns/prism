import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

// Sample runs are seeded from the app via seed.ensureSamples (fires when the
// signed-in user's dashboard is empty) — see src/app/app/page.tsx.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
