"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Copies this booking's private link (built from the current site address). */
export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11"
      onClick={() => {
        const url = `${window.location.origin}${path}`;
        navigator.clipboard
          .writeText(url)
          .then(() => {
            setCopied(true);
            toast.success("Link copied. Paste it somewhere safe, like your notes.");
            setTimeout(() => setCopied(false), 2500);
          })
          .catch(() => toast.error("Couldn't copy automatically. Please bookmark this page instead."));
      }}
    >
      {copied ? <Check /> : <Link2 />} {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
