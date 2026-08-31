import { Email } from "@convex-dev/auth/providers/Email";

// Emails a 6-digit code on sign-up (via Resend HTTP API — no SDK needed).
// Requires RESEND_API_KEY in the Convex deployment env.
export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  maxAge: 60 * 15, // codes valid for 15 minutes
  async generateVerificationToken() {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    return String(num % 1000000).padStart(6, "0");
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Prism <onboarding@resend.dev>",
        to: [email],
        subject: `Your Prism verification code is ${token}`,
        text: `Welcome to Prism.\n\nYour verification code is ${token}\n\nIt expires in 15 minutes.`,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
    }
  },
});
