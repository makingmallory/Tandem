"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";

export function InviteCard({ inviteCode }: Readonly<{ inviteCode: string }>) {
  const [copied, setCopied] = useState(false);

  async function copyInviteLink() {
    const inviteUrl = `${window.location.origin}/join/${inviteCode}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="section-stack">
      <div>
        <p className="eyebrow">Invite your person</p>
        <p className="invite-code">{inviteCode}</p>
      </div>
      <p className="muted-copy">
        Share the link or this code. It can only add someone who is signed in and does not already
        belong to a household.
      </p>
      <AppButton type="button" variant="secondary" onClick={copyInviteLink}>
        {copied ? <Check aria-hidden="true" size={19} /> : <Copy aria-hidden="true" size={19} />}
        {copied ? "Invite link copied" : "Copy invite link"}
      </AppButton>
      <span className="muted-copy">
        <Link2 aria-hidden="true" size={15} /> Secure household link
      </span>
    </Card>
  );
}
