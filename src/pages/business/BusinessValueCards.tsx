import { motion } from "framer-motion";
import { TrendingUp, FileText, Zap, Layers } from "lucide-react";

const valueProps = [
  {
    icon: TrendingUp,
    title: "Additional Revenue Stream",
    description: "Transform your solar investment into a recurring income source. Earn R120-R200+ per kWp annually from verified carbon credits.",
    highlight: "No extra investment needed",
  },
  {
    icon: FileText,
    title: "ESG Reporting & Certificates",
    description: "Receive official carbon offset certificates for your annual sustainability reports. Demonstrate climate leadership to stakeholders.",
    highlight: "Board-ready documentation",
  },
  {
    icon: Zap,
    title: "Zero Operational Burden",
    description: "We handle all verification, aggregation, and credit sales. Your team doesn't need to learn carbon markets or manage registrations.",
    highlight: "Fully managed service",
  },
  {
    icon: Layers,
    title: "Multi-Site Aggregation",
    description: "Manage all your solar sites from one dashboard. Combine smaller sites to maximize credit value through portfolio aggregation.",
    highlight: "Single point of contact",
  },
];

export function BusinessValueCards() {
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
            Why Businesses Choose Crunch Carbon
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Purpose-built for commercial and industrial solar owners with enterprise-grade requirements.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {valueProps.map((prop, index) => (
            <motion.div
              key={prop.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-border/40 rounded-2xl p-6 md:p-8 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                  <prop.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">{prop.title}</h3>
                  <p className="text-muted-foreground mb-3">{prop.description}</p>
                  <span className="text-sm font-medium text-primary">
                    ✓ {prop.highlight}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
