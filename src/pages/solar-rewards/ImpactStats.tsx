 import { AnimatedCounter } from "@/components/solar-rewards/AnimatedCounter";
 import { Users, Banknote, Leaf, TrendingUp } from "lucide-react";
 
 const stats = [
   {
     icon: Users,
     value: 1500,
     prefix: "",
     suffix: "+",
     label: "Homeowners Registered",
     description: "Solar owners earning with us",
   },
   {
     icon: Banknote,
     value: 1200000,
     prefix: "R",
     suffix: "+",
     label: "Total Earnings Paid",
     description: "Distributed to homeowners",
   },
   {
     icon: Leaf,
     value: 28000,
     prefix: "",
     suffix: " tons",
     label: "CO₂ Offset",
     description: "Environmental impact verified",
   },
   {
     icon: TrendingUp,
     value: 800,
     prefix: "R",
     suffix: "/yr",
     label: "Average Annual Payout",
     description: "Per typical 5kWp system",
   },
 ];
 
 export function ImpactStats() {
   return (
     <section className="py-16 md:py-20 bg-muted/30">
       <div className="container mx-auto px-4">
         <div className="text-center mb-12">
           <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
             Real Impact, Real Results
           </h2>
           <p className="text-muted-foreground max-w-2xl mx-auto">
             Join thousands of South African homeowners already earning from their solar systems
           </p>
         </div>
         
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
           {stats.map((stat, index) => (
             <div 
               key={index}
               className="bg-background rounded-xl p-6 shadow-sm border border-border/50 text-center"
             >
               <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                 <stat.icon className="w-6 h-6 text-primary" />
               </div>
               <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                 <AnimatedCounter 
                   target={stat.value} 
                   prefix={stat.prefix} 
                   suffix={stat.suffix}
                   duration={2.5}
                 />
               </div>
               <div className="text-sm font-medium text-foreground mb-1">
                 {stat.label}
               </div>
               <div className="text-xs text-muted-foreground">
                 {stat.description}
               </div>
             </div>
           ))}
         </div>
       </div>
     </section>
   );
 }