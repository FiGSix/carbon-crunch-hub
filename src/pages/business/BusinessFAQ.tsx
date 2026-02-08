import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do you handle multi-site portfolios?",
    answer: "We provide a unified dashboard for all your sites. You can register multiple properties at once, and we aggregate the generation data across your entire portfolio. This simplifies administration and often improves credit pricing through volume benefits.",
  },
  {
    question: "What documentation do we receive for ESG reporting?",
    answer: "You receive official carbon offset certificates, annual generation summaries, and Verra VCS verification documentation. These are board-ready documents suitable for sustainability reports, annual reports, and ESG disclosures to stakeholders.",
  },
  {
    question: "What's the procurement/finance process?",
    answer: "Registration is free with no upfront costs. We operate on a revenue-share model - you receive your portion of carbon credit sales annually. For larger portfolios, we can provide enterprise agreements with dedicated account management.",
  },
  {
    question: "How does data integration work with our monitoring systems?",
    answer: "We integrate with all major inverter monitoring platforms (Huawei FusionSolar, SMA Sunny Portal, SolarEdge, Fronius, etc.) via API. For systems without monitoring, we can work with manual meter readings or install data loggers.",
  },
  {
    question: "What's the minimum system size for businesses?",
    answer: "While we accept any size, commercial benefits are most significant for systems 50kWp and above. Smaller commercial systems can still participate and are often aggregated with residential portfolios.",
  },
  {
    question: "How are carbon credit prices determined?",
    answer: "Carbon credit prices fluctuate based on international markets. We sell on established exchanges and provide transparency on pricing. Business clients receive detailed breakdowns of credit sales and market conditions.",
  },
  {
    question: "Can we claim the carbon credits for our own offsetting?",
    answer: "Yes, you can choose to retire credits against your own carbon footprint instead of selling them. This is popular with companies that have net-zero commitments or want to claim carbon neutrality.",
  },
  {
    question: "What happens if we sell a property with solar?",
    answer: "Carbon credit rights can be transferred to the new owner or terminated. We handle the administrative transition. The registration is tied to the physical system, not the legal entity.",
  },
];

export function BusinessFAQ() {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Business FAQ
          </h2>
          <p className="text-muted-foreground">
            Common questions from facility managers, CFOs, and sustainability officers.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-foreground hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
