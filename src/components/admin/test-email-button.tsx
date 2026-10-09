"use client";

import { useState } from "react";
import { sendAdminTestEmail } from "@/app/admin/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/** Proves this server can send order emails through Gmail, by mailing the admin a test. */
export function TestEmailButton() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const { error, sentTo } = await sendAdminTestEmail();
      setResult(
        error
          ? { ok: false, message: error }
          : { ok: true, message: `Sent to ${sentTo}. Check that inbox (and Spam) in a minute.` }
      );
    } catch {
      setResult({ ok: false, message: "Couldn't reach the server. Please try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="border border-border p-4">
      <h2 className="font-semibold">Order emails</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Customers get &ldquo;payment confirmed&rdquo; and &ldquo;shipped&rdquo; emails from this website through Gmail.
        Send yourself a test to check it works.
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={send} disabled={sending}>
        {sending ? "Sending…" : "Send test email"}
      </Button>
      {result && (
        <p className={cn("mt-2 text-sm", result.ok ? "text-success" : "text-danger")} role="status">
          {result.message}
        </p>
      )}
    </section>
  );
}
