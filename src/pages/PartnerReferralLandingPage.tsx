import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];
const PROPERTY_TYPES = ["Residential", "Commercial", "Agricultural", "Industrial"];

const DEFAULT_ANNUAL_GENERATION_FACTOR = 1642.5;
const DEFAULT_CARBON_FACTOR = 1.0334;

interface PartnerInfo {
  valid: boolean;
  link_type?: "client" | "agent";
  link_id?: string;
  token?: string;
  owner_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  avatar_url?: string | null;
  company_logo_url?: string | null;
  referral_bio?: string | null;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  hasExisting: "yes" | "planning" | "no" | "";
  sizeKwp: string;
  province: string;
  propertyType: string;
}

export default function PartnerReferralLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [step, setStep] = useState(0); // 0..3
  const [submitting, setSubmitting] = useState(false);
  const [proposalCreated, setProposalCreated] = useState(false);

  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    hasExisting: "",
    sizeKwp: "",
    province: "",
    propertyType: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_referral_partner_info", { p_token: token });
      if (cancelled) return;
      if (error || !data) {
        setPartner({ valid: false });
        setLoading(false);
        return;
      }
      const info = data as unknown as PartnerInfo;
      if (info?.link_type === "agent") {
        // Agent-recruitment link: stash token and route to register
        try {
          localStorage.setItem("crunchcarbon_ref", JSON.stringify({ token, link_type: "agent" }));
        } catch {
          /* noop */
        }
        navigate("/register?role=agent&ref=" + encodeURIComponent(token));
        return;
      }
      setPartner(info);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  const partnerName = [partner?.first_name, partner?.last_name].filter(Boolean).join(" ") || "Your partner";
  const ogTitle = partner?.first_name
    ? `${partner.first_name}${partner.company_name ? " from " + partner.company_name : ""} wants to show you what your solar earns`
    : "Find out what your solar earns · Crunch Carbon";
  const ogImage = partner?.avatar_url || "/og-default.png";
  const pageUrl = typeof window !== "undefined"
    ? `${window.location.origin}/ref/${token ?? ""}`
    : `https://crunchcarbon.com/ref/${token ?? ""}`;

  const carbonProjection = useMemo(() => {
    const kwp = parseFloat(form.sizeKwp) || 0;
    const annualEnergyKwh = kwp * DEFAULT_ANNUAL_GENERATION_FACTOR;
    const carbon = (annualEnergyKwh / 1000) * DEFAULT_CARBON_FACTOR;
    return {
      kwp,
      annualEnergyMWh: annualEnergyKwh / 1000,
      carbonTonnes: carbon,
    };
  }, [form.sizeKwp]);

  const progress = ((step + 1) / 4) * 100;

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!form.name.trim()) return "Please enter your name";
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Please enter a valid email";
    }
    if (s === 1) {
      if (!form.hasExisting) return "Please tell us about your solar status";
      const kwp = parseFloat(form.sizeKwp);
      if (!kwp || kwp <= 0) return "Please enter a valid system size";
      if (!form.province) return "Please select your province";
      if (!form.propertyType) return "Please select a property type";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      toast({ title: "Almost there", description: err, variant: "destructive" });
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    if (!token) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-referral-proposal", {
        body: {
          token,
          client: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || undefined,
          },
          system: {
            size_kwp: parseFloat(form.sizeKwp),
            property_type: form.propertyType,
            province: form.province,
            has_existing: form.hasExisting === "yes",
          },
        },
      });
      const resp = (data ?? {}) as { success?: boolean; error?: string };
      if (error || !resp.success) {
        throw new Error(resp.error || error?.message || "Could not create your proposal");
      }
      setProposalCreated(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast({ title: "Proposal could not be sent", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (!partner?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-3">
          <h1 className="text-2xl font-bold">This link is no longer active.</h1>
          <p className="text-muted-foreground">Ask your partner for an updated link, or visit Crunch Carbon directly.</p>
          <Button onClick={() => navigate("/")} className="w-full">Go to Crunch Carbon</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-0">
      <Helmet>
        <title>{`${partnerName} · Crunch Carbon`}</title>
        <meta name="description" content="Free 3-minute assessment. Find out how much your solar system could earn in carbon credits — no account needed." />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content="Free 3-minute assessment. Find out how much your solar system could earn in carbon credits — no account needed." />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Top bar */}
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="font-bold text-lg">Crunch Carbon</div>
          <div className="flex items-center gap-3">
            {partner.avatar_url ? (
              <img
                src={partner.avatar_url}
                alt={partnerName}
                width={44}
                height={44}
                loading="lazy"
                className="h-11 w-11 rounded-full object-cover border"
              />
            ) : (
              <div className="h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center font-semibold text-primary">
                {(partner.first_name?.[0] ?? "?").toUpperCase()}
              </div>
            )}
            <div className="text-sm">
              <div className="font-semibold">{partnerName}</div>
              {partner.company_name && (
                <div className="text-xs text-muted-foreground">{partner.company_name}</div>
              )}
              {partner.referral_bio && (
                <div className="text-xs italic text-muted-foreground mt-1 max-w-[260px]">{partner.referral_bio}</div>
              )}
            </div>
            {partner.company_logo_url && (
              <img
                src={partner.company_logo_url}
                alt={partner.company_name ?? "Company logo"}
                width={40}
                height={40}
                loading="lazy"
                className="h-10 w-auto object-contain ml-auto md:ml-2"
              />
            )}
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && (
            <motion.section
              key="step0"
              initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Find out what your solar system could earn
                </h1>
                <p className="text-muted-foreground">Free assessment · No account needed · Takes 3 minutes</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
                {["No account needed", "Free to use", "Real carbon credits"].map((t) => (
                  <div key={t} className="rounded-xl border bg-card px-4 py-3 text-sm text-center">{t}</div>
                ))}
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                <h2 className="text-xl font-semibold">About you</h2>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="text-base h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="text-base h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (optional)</Label>
                  <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="text-base h-12" />
                </div>
              </div>
            </motion.section>
          )}

          {step === 1 && (
            <motion.section
              key="step1"
              initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 max-w-md mx-auto"
            >
              <h2 className="text-xl font-semibold">Your system</h2>

              <div className="space-y-2">
                <Label>Do you have solar installed?</Label>
                <div className="grid grid-cols-1 gap-2">
                  {([
                    ["yes", "Yes, already installed"],
                    ["planning", "Planning to install"],
                    ["no", "No"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...form, hasExisting: value })}
                      className={`w-full min-h-[52px] rounded-lg border px-4 py-3 text-left text-base transition-colors ${
                        form.hasExisting === value ? "border-primary bg-primary/10 font-semibold" : "border-input"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kwp">System size in kWp</Label>
                <Input
                  id="kwp"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={form.sizeKwp}
                  onChange={(e) => setForm({ ...form, sizeKwp: e.target.value })}
                  className="text-base h-12"
                />
                <p className="text-xs text-muted-foreground">Not sure? Use your monthly kWh bill ÷ 137 as a rough kWp estimate.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Province / Region</Label>
                <select
                  id="province"
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                  className="w-full h-12 rounded-md border border-input bg-background px-3 text-base"
                >
                  <option value="">Select a province</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proptype">Property type</Label>
                <select
                  id="proptype"
                  value={form.propertyType}
                  onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                  className="w-full h-12 rounded-md border border-input bg-background px-3 text-base"
                >
                  <option value="">Select property type</option>
                  {PROPERTY_TYPES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="step2"
              initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 max-w-md mx-auto text-center"
            >
              <div className="rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 text-white p-8 space-y-4">
                <div className="text-sm uppercase tracking-wide text-emerald-200/80">You could earn approximately</div>
                <CountUp value={carbonProjection.carbonTonnes * 1250} prefix="R " suffix=" / year" reducedMotion={prefersReducedMotion} />
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg bg-white/5 p-3">
                    <div className="text-2xl font-semibold">🌱 {carbonProjection.carbonTonnes.toFixed(2)}</div>
                    <div className="text-xs text-emerald-100/80">tonnes CO₂ offset / year</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3">
                    <div className="text-2xl font-semibold">⚡ {carbonProjection.annualEnergyMWh.toFixed(2)}</div>
                    <div className="text-xs text-emerald-100/80">MWh clean energy / year</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 text-left">
                <div className="font-semibold text-amber-900">This is a conservative estimate.</div>
                <p className="text-sm text-amber-900/90 mt-1">
                  Your actual earnings depend on your real energy meter data — the final figure could be higher or lower.
                  We use verified data from your actual system to calculate precisely.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/40 p-4 text-left">
                <div className="font-semibold">For your system to qualify:</div>
                <ul className="text-sm mt-2 space-y-1 list-disc pl-5 text-muted-foreground">
                  <li>Grid-tied (connected to Eskom or municipal supply)</li>
                  <li>Minimum installed capacity as per current programme requirements</li>
                  <li>Separately metered and compliant with local bylaws</li>
                </ul>
                <p className="text-xs mt-2 text-muted-foreground">Your proposal will confirm eligibility once submitted.</p>
              </div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section
              key="step3"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-5 max-w-md mx-auto text-center"
            >
              {!proposalCreated ? (
                <div className="space-y-4 py-12">
                  {submitting ? (
                    <>
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                      <p className="text-muted-foreground">Creating your proposal…</p>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-10 w-10 text-primary mx-auto" />
                      <p className="text-muted-foreground">Ready to send your free proposal — tap below to confirm.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" aria-hidden="true" />
                  <h2 className="text-2xl font-bold">Your proposal is on its way ✉️</h2>
                  <p className="text-muted-foreground">A copy has been sent to {partner.first_name || "your partner"}.</p>
                  <div className="rounded-lg border bg-card p-4 text-left text-sm space-y-1">
                    <div><strong>System size:</strong> {carbonProjection.kwp} kWp</div>
                    <div><strong>Carbon credits:</strong> {carbonProjection.carbonTonnes.toFixed(2)} tCO₂ / year</div>
                    <div className="text-xs text-muted-foreground">(conservative estimate)</div>
                  </div>
                  <p className="text-sm">You can sign your proposal directly from the email — no account needed.</p>
                  <div className="pt-2 space-y-2">
                    <Button asChild className="w-full h-12 text-base">
                      <a href={`/register?email=${encodeURIComponent(form.email)}&ref=${encodeURIComponent(token ?? "")}`}>
                        Create a free account to track your credits
                      </a>
                    </Button>
                    <button onClick={() => navigate("/")} className="text-sm underline text-muted-foreground">
                      Maybe later — I'll check my email
                    </button>
                  </div>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile sticky nav */}
      {!proposalCreated && (
        <nav
          className="fixed md:static bottom-0 left-0 right-0 border-t bg-card md:bg-transparent md:border-0 px-4 py-3 md:max-w-3xl md:mx-auto"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <div className="flex gap-2 max-w-md mx-auto">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12"
              onClick={back}
              disabled={step === 0 || submitting}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {step < 2 && (
              <Button type="button" className="flex-1 h-12 text-base" onClick={next}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 2 && (
              <Button
                type="button"
                className="flex-1 h-12 text-base bg-gradient-to-r from-emerald-500 to-amber-500 hover:opacity-90 cta-pulse"
                onClick={() => {
                  setStep(3);
                  void submit();
                }}
              >
                Get my free proposal
              </Button>
            )}
            {step === 3 && !submitting && !proposalCreated && (
              <Button type="button" className="flex-1 h-12 text-base" onClick={() => void submit()}>
                Confirm and send
              </Button>
            )}
          </div>
        </nav>
      )}

      <style>{`
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          50% { box-shadow: 0 0 0 14px rgba(34, 197, 94, 0); }
        }
        .cta-pulse { animation: ctaPulse 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .cta-pulse { animation: none; } }
      `}</style>
    </div>
  );
}

function CountUp({
  value,
  prefix = "",
  suffix = "",
  reducedMotion,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  reducedMotion: boolean;
}) {
  const [display, setDisplay] = useState(reducedMotion ? value : 0);
  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const duration = 1500;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reducedMotion]);
  return (
    <div className="text-4xl md:text-6xl font-extrabold tracking-tight text-emerald-300">
      {prefix}
      {Math.round(display).toLocaleString()}
      {suffix}
    </div>
  );
}
