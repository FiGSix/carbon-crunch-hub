import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BusinessCTAProps {
  onConsultationClick: () => void;
}

export function BusinessCTA({ onConsultationClick }: BusinessCTAProps) {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6">
            <Building2 className="h-8 w-8 text-primary" />
          </div>

          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Ready to Monetize Your Commercial Solar?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of businesses already earning from their solar investments. 
            Start today or speak with our enterprise team for a customized solution.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 py-6 text-lg font-medium shadow-md hover:shadow-lg transition-all"
              onClick={() => navigate("/register")}
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl px-8 py-6 text-lg"
              onClick={onConsultationClick}
            >
              <Phone className="mr-2 h-5 w-5" />
              Request Enterprise Consultation
            </Button>
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">Free</p>
              <p className="text-sm text-muted-foreground">No setup costs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">5 min</p>
              <p className="text-sm text-muted-foreground">Quick registration</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">R100k+</p>
              <p className="text-sm text-muted-foreground">Annual potential</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
