import { motion } from "framer-motion";
import { Building2, Factory, Wheat, Building } from "lucide-react";

const segments = [
  {
    icon: Building2,
    title: "Commercial Rooftops",
    description: "Shopping centers, office buildings, warehouses, and retail spaces with rooftop solar installations.",
    examples: "50kWp - 500kWp typical",
  },
  {
    icon: Factory,
    title: "Industrial Facilities",
    description: "Manufacturing plants, factories, data centers, and logistics hubs with large-scale solar arrays.",
    examples: "200kWp - 2MW+ typical",
  },
  {
    icon: Wheat,
    title: "Agricultural Operations",
    description: "Farms, packhouses, cold storage, wineries, and food processing facilities powered by solar.",
    examples: "100kWp - 1MW typical",
  },
  {
    icon: Building,
    title: "Property Portfolios",
    description: "REITs, property developers, and facilities managers with multiple solar-equipped buildings.",
    examples: "Aggregated multi-site",
  },
];

export function BusinessSegments() {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Who Is This For?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Commercial and industrial solar owners across all sectors can monetise their generation through carbon credits.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {segments.map((segment, index) => (
            <motion.div
              key={segment.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-border/40 rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                <segment.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{segment.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{segment.description}</p>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                {segment.examples}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
