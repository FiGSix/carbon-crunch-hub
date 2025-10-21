import { SafeMotionDiv } from "@/components/common/SafeMotionDiv";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const VerificationSection = () => {
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
            Is Your Carbon Partner Verified?
          </h2>
          <p className="text-lg text-crunch-black/70 max-w-3xl mx-auto">
            At Crunch Carbon, we pride ourselves on transparency, expertise, and affiliation with industry-leading frameworks. 
            Our projects are fully registered with Verra's Verified Carbon Standard (VCS), ensuring the highest level of credibility.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-crunch-yellow/10 to-white border-crunch-yellow/20">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-crunch-black flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    Verified Carbon Standard
                  </h3>
                  <p className="text-crunch-black/70">
                    The VCS is the most widely used voluntary greenhouse gas (GHG) program globally. 
                    By partnering with Crunch Carbon, you're aligning with a team committed to the highest standards of integrity.
                  </p>
                </div>

                <div className="bg-white/50 backdrop-blur-sm p-4 rounded-lg border border-crunch-black/5">
                  <p className="text-sm italic text-crunch-black/70">
                    <strong>VCS STANDARD:</strong> The VCS Standard lays out the rules and requirements that projects 
                    must follow to be certified, including independent auditing, accounting methodologies, and the registry system.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium rounded-xl"
                    onClick={() => window.open('https://registry.verra.org/app/projectDetail/VCS/4799', '_blank')}
                  >
                    View Our Project
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="border-crunch-black/20 hover:bg-crunch-yellow/10 rounded-xl"
                    onClick={() => window.open('https://verra.org/programs/verified-carbon-standard/', '_blank')}
                  >
                    Learn About VCS
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl border border-green-200/50">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-crunch-black mb-2">Registered Project</h4>
                  <p className="text-sm text-crunch-black/70">
                    Our project is officially registered with Verra, providing full traceability and accountability.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-200/50">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-crunch-black mb-2">CDSA Affiliated</h4>
                  <p className="text-sm text-crunch-black/70">
                    Member of the Carbon Disclosure Standards Association, reinforcing our dedication to transparency and excellence.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-200/50">
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-bold text-crunch-black mb-2">Global Standards</h4>
                  <p className="text-sm text-crunch-black/70">
                    We meet both international and local standards, giving you peace of mind when choosing us as your partner.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
