import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PageLoading } from "@/components/ui/loading-states";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

const REASONS: Array<{ value: string; label: string }> = [
  { value: "not_interested", label: "Not interested" },
  { value: "income_too_low", label: "Income estimate is too low" },
  { value: "need_more_information", label: "Need more information" },
  { value: "not_authorised_to_sign", label: "Not authorised to sign" },
  { value: "project_details_incorrect", label: "Project details are incorrect" },
  { value: "already_participating", label: "Already participating elsewhere" },
  { value: "other", label: "Other" },
];

/**
 * Token-authorised decline confirmation. Opening this page does NOT decline
 * anything — the client must confirm.
 */
export default function ProposalDecline() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [alreadyResolved, setAlreadyResolved] = useState<string | null>(null);

  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [contactRequested, setContactRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoadError("This link is invalid. Please use the decline link from your proposal email.");
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.rpc("get_proposal_by_token_direct", {
          token_param: token,
        });
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("not found");

        const proposal = data[0];
        setTitle(proposal.title);
        if (proposal.status === "rejected") {
          setAlreadyResolved("You have already declined this proposal.");
        } else if (proposal.signed_at || proposal.status === "approved") {
          setAlreadyResolved("This proposal has already been signed and can no longer be declined.");
        }
      } catch {
        setLoadError("This link is invalid or has expired. Please contact your Crunch Carbon representative.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, id]);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data, error } = await supabase.functions.invoke("decline-proposal", {
        body: {
          token,
          reason: reason || undefined,
          note: reason === "other" ? note : undefined,
          contactRequested,
        },
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || "Could not record your response.");
      setDone(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not record your response. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading minimal />;

  if (loadError) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto" />
            <h1 className="text-xl font-semibold">Link no longer valid</h1>
            <p className="text-muted-foreground">{loadError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done || alreadyResolved) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-6 md:p-8 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">
              {done ? "Thank you — your response has been recorded" : "Already responded"}
            </h1>
            <p className="text-muted-foreground">
              {done
                ? contactRequested
                  ? "We've let your Crunch Carbon representative know, and someone will be in touch with you."
                  : "We've let your Crunch Carbon representative know. You're welcome to get in touch at any time if things change."
                : alreadyResolved}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-12">
      <Card>
        <CardContent className="p-6 md:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Decline this proposal</h1>
            <p className="text-muted-foreground">
              You're about to decline{title ? ` "${title}"` : " this proposal"}. Nothing has changed
              yet — your response is only recorded once you confirm below.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-base">Reason (optional)</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {REASONS.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
                  <Label htmlFor={`reason-${r.value}`} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {reason === "other" && (
              <Textarea
                placeholder="Tell us a little more (optional)"
                value={note}
                maxLength={1000}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </div>

          <div className="flex items-start space-x-2 rounded-lg border border-border p-4">
            <Checkbox
              id="contact-me"
              className="mt-0.5"
              checked={contactRequested}
              onCheckedChange={(checked) => setContactRequested(checked === true)}
            />
            <Label htmlFor="contact-me" className="font-normal cursor-pointer leading-relaxed">
              Please contact me — I'd like to discuss this before deciding finally.
            </Label>
          </div>

          {submitError && (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="destructive"
              size="lg"
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm decline
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => {
                window.location.href = `/proposals/${id}/accept${token ? `?token=${token}` : ""}`;
              }}
            >
              Go back to the proposal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
