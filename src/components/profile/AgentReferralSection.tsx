import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, MessageCircle, Users2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";

export function AgentReferralSection() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Generate agent referral link
  const referralLink = `${window.location.origin}/agents?ref=${profile?.id}`;

  // WhatsApp message content for agent recruitment
  const whatsappMessage = `Hey! I'm working with Crunch Carbon as an agent in the solar industry. It's a great opportunity to build a business helping clients monetize their solar systems through carbon credits. If you work with commercial solar, check it out: ${referralLink}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users2 className="h-5 w-5 text-primary" />
          <CardTitle>Refer an Agent</CardTitle>
        </div>
        <CardDescription>
          Invite other agents to join the Crunch Carbon network
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Referral Link</label>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* WhatsApp Share Button */}
        <Button
          onClick={handleWhatsAppShare}
          className="w-full bg-green-600 hover:bg-green-700"
          variant="default"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Share via WhatsApp
        </Button>
      </CardContent>
    </Card>
  );
}
