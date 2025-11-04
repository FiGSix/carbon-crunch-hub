import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Mail, MessageCircle, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormValidation } from "@/hooks/useFormValidation";

export default function Referral() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { validateEmail } = useFormValidation();
  const [copied, setCopied] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [message, setMessage] = useState("");

  // Generate referral link with user ID
  const referralLink = `${window.location.origin}/register?ref=${profile?.id}`;

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
    const text = `Hey! I've been using Crunch Carbon for my solar energy needs and thought you might be interested. Check them out here: ${referralLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleEmailShare = () => {
    const emailError = validateEmail(friendEmail);
    if (emailError) {
      toast({
        title: "Validation Error",
        description: emailError,
        variant: "destructive",
      });
      return;
    }

    if (!friendName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your friend's name",
        variant: "destructive",
      });
      return;
    }

    const subject = `${profile?.first_name || "A friend"} recommends Crunch Carbon`;
    const body = `Hi ${friendName},

${message || `I've been using Crunch Carbon for my solar energy needs and thought you might be interested!`}

You can learn more here: ${referralLink}

Best regards,
${profile?.first_name} ${profile?.last_name || ""}`;

    const mailtoLink = `mailto:${friendEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;

    // Reset form
    setFriendName("");
    setFriendEmail("");
    setMessage("");

    toast({
      title: "Email client opened",
      description: "Your email client should open with the referral message",
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Refer a Friend</h1>
          <p className="text-lg text-muted-foreground">
            Share Crunch Carbon with your friends and help them discover sustainable solar energy solutions
          </p>
        </div>

        {/* Referral Benefits */}
        <Card className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-6 w-6 text-primary" />
              <CardTitle>Why Refer?</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Help your friends save on energy costs with solar power</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Support sustainable energy adoption in your community</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Share the benefits of working with trusted solar experts</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Referral Link Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Unique Referral Link</CardTitle>
            <CardDescription>Share this link with your friends</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Share Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* WhatsApp Share */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Share via WhatsApp</CardTitle>
              </div>
              <CardDescription>Send a quick message to your friends</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleWhatsAppShare}
                className="w-full"
                variant="default"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Share on WhatsApp
              </Button>
            </CardContent>
          </Card>

          {/* Email Share */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Share via Email</CardTitle>
              </div>
              <CardDescription>Send a personalized email invitation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="friendName">Friend's Name</Label>
                <Input
                  id="friendName"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="friendEmail">Friend's Email</Label>
                <Input
                  id="friendEmail"
                  type="email"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal note to your referral..."
                  rows={3}
                />
              </div>
              <Button
                onClick={handleEmailShare}
                className="w-full"
                variant="default"
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
