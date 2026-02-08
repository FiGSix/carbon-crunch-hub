import { motion } from "framer-motion";
import { ClipboardList, Link, Shield, Wallet } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    step: "1",
    title: "Register Your Systems",
    description: "Submit details about your solar installations online. Add multiple sites at once for portfolio management.",
  },
  {
    icon: Link,
    step: "2",
    title: "Connect Monitoring Data",
    description: "We integrate with your inverter monitoring system (Huawei, SMA, SolarEdge, etc.) for automated data collection.",
  },
  {
    icon: Shield,
    step: "3",
    title: "We Verify & Aggregate",
    description: "Our team validates your installation against Verra VCS standards and aggregates your generation data.",
  },
  {
    icon: Wallet,
    step: "4",
    title: "Annual Payouts + ESG Reports",
    description: "Receive your carbon credit earnings annually, plus official documentation for sustainability reporting.",
  },
];

export function BusinessHowItWorks() {
  return (
    <section className="py-16 md:py-20 bg-accent/30">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A streamlined process designed for enterprise efficiency. Your team stays focused while we handle the complexity.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-border" />
              )}
              
              <div className="bg-card border border-border/40 rounded-2xl p-6 relative z-10 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {step.step}
                  </div>
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
