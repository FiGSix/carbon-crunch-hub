import { motion } from "framer-motion";
import { Shield, Lock, Eye, FileCheck } from "lucide-react";

const securityFeatures = [
  {
    icon: Lock,
    title: "Bank-Level Encryption",
    description: "Your data is protected with 256-bit SSL encryption, the same standard used by major banks.",
  },
  {
    icon: Eye,
    title: "Privacy First",
    description: "We only access your energy generation data. We never share your personal information with third parties.",
  },
  {
    icon: FileCheck,
    title: "POPIA Compliant",
    description: "Fully compliant with South Africa's Protection of Personal Information Act.",
  },
  {
    icon: Shield,
    title: "Verified Platform",
    description: "Working with Verra-certified carbon credit standards and CDSA-affiliated processes.",
  },
];

export function SecuritySection() {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Your Data is Safe With Us
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We take security seriously. Here's how we protect your information.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {securityFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-border/50"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 flex-shrink-0">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
