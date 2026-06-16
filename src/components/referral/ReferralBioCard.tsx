import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const MAX_LEN = 300;

export function ReferralBioCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("referral_bio")
        .eq("id", user.id)
        .maybeSingle();
      setBio((data?.referral_bio as string) ?? "");
      setLoading(false);
    })();
  }, [user?.id]);

  const onSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ referral_bio: bio.trim() ? bio.trim() : null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Bio saved", description: "Your referral page is updated." });
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
        <CardTitle>Your referral page bio</CardTitle>
        <CardDescription>
          Shown to potential clients on your personal referral link page. Example: I help homeowners in the Western Cape turn their solar into passive income.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="referral-bio">Bio</Label>
          <Textarea
            id="referral-bio"
            value={bio}
            maxLength={MAX_LEN}
            onChange={(e) => setBio(e.target.value.slice(0, MAX_LEN))}
            rows={4}
          />
          <div className="text-xs text-muted-foreground text-right">{bio.length} / {MAX_LEN}</div>
        </div>
        <Button onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save bio
        </Button>
      </CardContent>
    </Card>
  );
}
