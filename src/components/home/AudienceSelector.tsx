import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, Briefcase, ArrowRight, Calculator, Users, Building2, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AudienceSelector() {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            How Can We Help You?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose your path to start earning from solar energy
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Homeowner Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="meta-card rounded-3xl p-6 cursor-pointer group"
            onClick={() => navigate("/home-owners")}
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-primary/10">
                <Home className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  Homeowners
                </h3>
                <p className="text-muted-foreground text-sm">
                  Own a solar system at home
                </p>
              </div>
            </div>

            <ul className="space-y-2 mb-5 text-sm">
              <li className="flex items-center gap-2 text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Earn R600-R1,000+ per year
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Free to join, no setup costs
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                We handle everything
              </li>
            </ul>

            <Button
              className="w-full group-hover:bg-primary/90 rounded-xl"
              size="default"
            >
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Earnings
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Business Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            className="meta-card rounded-3xl p-6 cursor-pointer group border-2 border-primary/20"
            onClick={() => navigate("/business")}
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-primary/10">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  Business
                </h3>
                <p className="text-muted-foreground text-sm">
                  Commercial or industrial solar
                </p>
              </div>
            </div>

            <ul className="space-y-2 mb-5 text-sm">
              <li className="flex items-center gap-2 text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Earn R10,000-R100,000+ per year
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                ESG reporting & certificates
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Multi-site aggregation
              </li>
            </ul>

            <Button
              className="w-full group-hover:bg-primary/90 rounded-xl"
              size="default"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Calculate ROI
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Solar Professional Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            className="meta-card rounded-3xl p-6 cursor-pointer group"
            onClick={() => navigate("/agents")}
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-accent">
                <Briefcase className="h-7 w-7 text-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  Solar Professionals
                </h3>
                <p className="text-muted-foreground text-sm">
                  Installers, agents & consultants
                </p>
              </div>
            </div>

            <ul className="space-y-2 mb-5 text-sm">
              <li className="flex items-center gap-2 text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                Earn commission per referral
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                Add value to your clients
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                Professional proposal tools
              </li>
            </ul>

            <Button
              variant="outline"
              className="w-full rounded-xl"
              size="default"
            >
              <Users className="mr-2 h-4 w-4" />
              Become a Partner
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
