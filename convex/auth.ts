import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTP } from "./ResendOTP";

// Password auth with email verification: sign-up emails a 6-digit code that must
// be entered before the account is active. Sample runs are seeded from the app
// via seed.ensureSamples once the verified user's dashboard is empty.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({ verify: ResendOTP })],
});
