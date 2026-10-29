// Optional Cloudflare Turnstile. When TURNSTILE_SECRET_KEY is not set the check is skipped (the honeypot, the timing check
// and the rate limits still apply). Set TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY to turn it on.
export const turnstileEnabled = () => !!process.env.TURNSTILE_SECRET_KEY;

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, ...(ip && ip !== "unknown" ? { remoteip: ip } : {}) }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false; // fail closed: the visitor can try again
  }
}
