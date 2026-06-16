import { SafeMotionDiv } from "@/components/common/SafeMotionDiv";
import { motion } from "framer-motion";
import { Eye, BarChart3, ShieldCheck } from "lucide-react";

const benefits = [
  {
    icon: Eye,
    title: "Transparent",
    description: "Providing full visibility into how emissions reductions are achieved.",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: BarChart3,
    title: "Measurable",
    description: "Using rigorous methodologies to quantify carbon savings.",
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
  },
  {
    icon: ShieldCheck,
    title: "Verified",
    description: "Subject to third-party audits to ensure compliance and credibility.",
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
  },
];

export const WhyVerraMatters = () => {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-crunch-yellow/5 to-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-crunch-black">
            Why Verra and the VCS Program Matter
          </h2>
          <p className="text-lg text-crunch-black/70 max-w-2xl mx-auto">
            Verra's Verified Carbon Standard is designed to ensure that carbon reduction projects are:
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group"
            >
              <div className={`${benefit.bgColor} p-8 rounded-2xl border border-crunch-black/5 transition-all hover:shadow-lg h-full`}>
                <div className={`bg-gradient-to-br ${benefit.color} w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform`}>
                  <benefit.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-crunch-black mb-4 text-center">
                  {benefit.title}
                </h3>
                <p className="text-crunch-black/70 text-center">
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-crunch-black/5 max-w-3xl mx-auto">
            <p className="text-crunch-black/70 leading-relaxed">
              Any legitimate carbon partner should have a registered project with Verra or Gold Standard to guarantee their reliability. 
              <strong className="text-crunch-black"> Without this affiliation, there's no assurance of the quality or authenticity</strong> of the carbon credits being offered.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
