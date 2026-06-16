import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, ExternalLink, QrCode, Share2, Loader2 } from "lucide-react";

const QRCodeCanvas = lazy(() => import("qrcode.react").then((m) => ({ default: m.QRCodeCanvas })));

interface Props {
  linkType: "client" | "agent";
}

interface LinkRow {
  id: string;
  token: string;
  is_active: boolean;
  clicks: number;
  signups: number;
  conversions: number;
}

export function ReferralLinkWidget({ linkType }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [link, setLink] = useState<LinkRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const fetchLink = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("referral_links")
      .select("id, token, is_active, clicks, signups, conversions")
      .eq("owner_id", user.id)
      .eq("link_type", linkType)
      .maybeSingle();
    setLink((data as LinkRow) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void fetchLink();
    const interval = setInterval(() => void fetchLink(), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, linkType]);

  const url = link ? `${window.location.origin}/ref/${link.token}` : "";

  const onCreate = async () => {
    if (!user?.id) return;
    setCreating(true);
    const { error } = await supabase
      .from("referral_links")
      .insert({ owner_id: user.id, link_type: linkType });
    setCreating(false);
    if (error) {
      toast({ title: "Could not create link", description: error.message, variant: "destructive" });
      return;
    }
    void fetchLink();
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Crunch Carbon", url });
      } catch {
        /* noop */
      }
    } else {
      void onCopy();
    }
  };

  const onDownloadQR = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#referral-qr canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = "crunchcarbon-referral.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your referral link</CardTitle>
        <CardDescription>
          {linkType === "client"
            ? "Share this link — clients receive a signable proposal immediately and are assigned to you automatically."
            : "Share this link — partners who sign up are linked to your network pending admin approval."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!link ? (
          <Button onClick={onCreate} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Generate my link
          </Button>
        ) : (
          <>
            <div className="flex gap-2">
              <Input readOnly value={url} className="font-mono text-sm" />
              <Button type="button" variant="outline" size="icon" onClick={onCopy} title="Copy">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" /> Preview
                </a>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowQR((v) => !v)}>
                <QrCode className="h-4 w-4 mr-1" /> {showQR ? "Hide QR" : "Show QR"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onShare}>
                <Share2 className="h-4 w-4 mr-1" /> Share
              </Button>
            </div>

            {showQR && (
              <div id="referral-qr" className="flex flex-col items-start gap-2">
                <Suspense fallback={<Loader2 className="h-4 w-4 animate-spin" />}>
                  <QRCodeCanvas value={url} size={160} includeMargin />
                </Suspense>
                <Button type="button" variant="outline" size="sm" onClick={onDownloadQR}>
                  Download PNG
                </Button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-2">
              <Stat label="Clicks" value={link.clicks} />
              <Stat label="Signups" value={link.signups} />
              <Stat label="Conversions" value={link.conversions} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
