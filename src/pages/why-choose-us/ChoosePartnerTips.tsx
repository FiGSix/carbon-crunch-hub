import { SafeMotionDiv } from "@/components/common/SafeMotionDiv";
import { motion } from "framer-motion";
import { CheckCircle2, FileSearch, Users, Award } from "lucide-react";

const tips = [
  {
    icon: Award,
    title: "Verify their credentials",
    description: "Ensure the partner has a registered project with Verra or Gold Standard.",
  },
  {
    icon: FileSearch,
    title: "Ask for transparency",
    description: "Request detailed project documentation and methodology.",
  },
  {
    icon: Users,
    title: "Check Affiliations",
    description: "Look for reputable memberships, such as the CDSA.",
  },
  {
    icon: CheckCircle2,
    title: "Prioritise experience",
    description: "Choose partners like Crunch Carbon with a proven track record and expertise.",
  },
];

export const ChoosePartnerTips = () => {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-crunch-black">
            Tips for Choosing a Reliable Carbon Partner
          </h2>
          <p className="text-lg text-crunch-black/70 max-w-2xl mx-auto">
            Don't leave your carbon offsetting strategy to chance. Here's what to look for:
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tips.map((tip, index) => (
            <motion.div
              key={tip.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ x: 5 }}
              className="group"
            >
              <div className="bg-gradient-to-br from-white to-crunch-yellow/5 p-6 rounded-xl border border-crunch-black/5 hover:border-crunch-yellow/30 transition-all hover:shadow-md h-full">
                <div className="flex items-start gap-4">
                  <div className="bg-crunch-yellow/20 p-3 rounded-full group-hover:bg-crunch-yellow/30 transition-colors flex-shrink-0">
                    <tip.icon className="h-6 w-6 text-crunch-yellow" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-crunch-black mb-2">
                      {tip.title}
                    </h3>
                    <p className="text-crunch-black/70">
                      {tip.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12"
        >
          <div className="bg-gradient-to-br from-crunch-yellow/10 to-white p-8 rounded-2xl border border-crunch-yellow/30 text-center">
            <p className="text-lg text-crunch-black/80 leading-relaxed max-w-3xl mx-auto">
              <strong className="text-crunch-black">Choosing the right carbon partner is about more than just offsetting emissions</strong> — 
              it's about ensuring your contributions drive real, measurable change. Crunch Carbon's commitment to transparency, 
              verified standards, and client success sets us apart as the trusted choice for businesses looking to make a difference.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
