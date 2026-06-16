import { SafeMotionDiv } from "@/components/common/SafeMotionDiv";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, BarChart3, Lock, Users } from "lucide-react";

const benefits = [
  {
    icon: ShieldCheck,
    title: "Trade Verified Credits",
    description:
      "Buy and sell Verra-certified carbon credits with full traceability and compliance.",
  },
  {
    icon: BarChart3,
    title: "Transparent Pricing",
    description:
      "Real-time market pricing with full visibility — no hidden fees or surprises.",
  },
  {
    icon: Lock,
    title: "Simple & Secure",
    description:
      "An easy-to-use platform built with enterprise-grade security from day one.",
  },
  {
    icon: Users,
    title: "For Buyers & Sellers",
    description:
      "Whether you generate credits or need to offset, we have you covered.",
  },
];

export function MarketplaceBenefits() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container-responsive max-w-5xl mx-auto">
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-crunch-black mb-4">
            Why the Marketplace?
          </h2>
          <p className="text-crunch-black/70 max-w-xl mx-auto">
            Everything you need to participate in the carbon credit economy, in one place.
          </p>
        </SafeMotionDiv>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {benefits.map((benefit, i) => (
            <SafeMotionDiv
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
            >
              <Card interactive className="h-full border-crunch-black/5">
                <CardContent className="p-6 flex gap-4 items-start">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-crunch-yellow/15 flex items-center justify-center">
                    <benefit.icon className="text-crunch-yellow" size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-crunch-black text-lg mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-crunch-black/65 text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </SafeMotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
}
