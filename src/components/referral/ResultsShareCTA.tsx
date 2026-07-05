import { MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import {
  buildReferralUrl,
  buildWhatsAppShareUrl,
  defaultInviteMessage,
} from "@/lib/referral";

/**
 * Inline share CTA shown on the calculator results screen —
 * the highest-intent moment to invite a friend.
 */
export function ResultsShareCTA() {
  const { profile } = useAuth();

  const url = buildReferralUrl(profile?.id);
  const message = defaultInviteMessage(url);
  const shareHref = buildWhatsAppShareUrl(message);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied to clipboard");
    } catch {
      toast.error("Couldn't copy link — please try again");
    }
  };

  return (
    <div className="mb-6 p-4 md:p-5 rounded-xl border border-[#25D366]/30 bg-[#25D366]/5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-medium text-crunch-black">
            Know someone with solar? Share the cash.
          </p>
          <p className="text-xs text-crunch-black/60">
            Send them your invite on WhatsApp — takes 5 seconds.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            asChild
            size="sm"
            className="bg-[#25D366] text-white hover:bg-[#20BD5A]"
          >
            <a
              href={shareHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on WhatsApp"
            >
              <MessageCircle className="mr-2 h-4 w-4" fill="currentColor" strokeWidth={0} />
              Share on WhatsApp
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-crunch-black/70"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy link
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ResultsShareCTA;
