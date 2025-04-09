
import { motion } from "framer-motion";
import { Leaf, BarChart3, Zap, FileText, Clock, CalendarCheck, Globe } from "lucide-react";

export const HowItWorksSection = () => {
  return <section className="py-20" id="how-it-works">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.5
        }}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-crunch-black">Turn Your Clients Energy Into Income</h2>
            <p className="text-xl text-crunch-black/70 max-w-3xl mx-auto">Our platform automates everything, so you can sit back and watch your green energy create green Rands.</p>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard 
            icon={<FileText className="h-8 w-8 text-purple-600" />} 
            iconBg="bg-purple-100" 
            iconHoverBg="bg-purple-200" 
            title="Tailored Carbon Proposals" 
            description="Custom carbon credit proposals designed specifically for your business needs and industry." 
            delay={0.1} 
          />
          
          <FeatureCard 
            icon={<Clock className="h-8 w-8 text-blue-600" />} 
            iconBg="bg-blue-100" 
            iconHoverBg="bg-blue-200" 
            title="Quick & Efficient" 
            description="Generate comprehensive proposals in minutes, not weeks, with our streamlined process." 
            delay={0.2} 
          />
          
          <FeatureCard 
            icon={<CalendarCheck className="h-8 w-8 text-green-600" />} 
            iconBg="bg-green-100" 
            iconHoverBg="bg-green-200" 
            title="Annual Payouts" 
            description="Receive annual payments directly to your bank account. No hassle, no complicated paperwork, just income." 
            delay={0.3} 
          />
          
          <FeatureCard 
            icon={<Globe className="h-8 w-8 text-orange-600" />} 
            iconBg="bg-orange-100" 
            iconHoverBg="bg-orange-200" 
            title="Local Impact" 
            description="Join thousands of businesses in South Africa making a positive environmental impact." 
            delay={0.4} 
          />
        </div>
      </div>
    </section>;
};

interface FeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconHoverBg: string;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard = ({
  icon,
  iconBg,
  iconHoverBg,
  title,
  description,
  delay
}: FeatureCardProps) => {
  return <motion.div className="group" initial={{
    opacity: 0,
    y: 20
  }} whileInView={{
    opacity: 1,
    y: 0
  }} viewport={{
    once: true
  }} transition={{
    duration: 0.5,
    delay
  }} whileHover={{
    y: -5
  }}>
      <div className="bg-white p-8 rounded-lg shadow-md border border-crunch-black/10 h-full transition-all group-hover:shadow-lg">
        <motion.div 
          className={`rounded-full ${iconBg} p-4 inline-block mb-6 transition-colors`}
          whileHover={{ 
            scale: 1.1,
            backgroundColor: iconHoverBg,
            transition: { type: "spring", stiffness: 400, damping: 10 }
          }}
        >
          {icon}
        </motion.div>
        <h3 className="text-xl font-bold mb-4 text-crunch-black">
          {title}
        </h3>
        <p className="text-crunch-black/70">
          {description}
        </p>
      </div>
    </motion.div>;
};
