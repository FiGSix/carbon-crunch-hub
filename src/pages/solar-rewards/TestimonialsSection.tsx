 import { Avatar, AvatarFallback } from "@/components/ui/avatar";
 import { Star, Quote } from "lucide-react";
 
 const testimonials = [
   {
     name: "Johan van der Merwe",
     location: "Cape Town",
     systemSize: "8kWp",
     earnings: "R1,280",
     initials: "JM",
     avatarBg: "bg-blue-500",
     quote: "I was skeptical at first, but the signup was so easy. Got my first payout after 12 months and it's been consistent ever since. Free money from my solar panels!",
     rating: 5,
   },
   {
     name: "Priya Naidoo",
     location: "Durban",
     systemSize: "5kWp",
     earnings: "R820",
     initials: "PN",
     avatarBg: "bg-rose-500",
     quote: "The whole process was transparent. I love that I'm earning from something I already own, and knowing my solar is helping the environment even more.",
     rating: 5,
   },
   {
     name: "Thabo Molefe",
     location: "Johannesburg",
     systemSize: "12kWp",
     earnings: "R1,950",
     initials: "TM",
     avatarBg: "bg-amber-500",
     quote: "As a business owner with a larger system, the annual payout is significant. Crunch Carbon made it effortless to monetize my investment further.",
     rating: 5,
   },
 ];
 
 export function TestimonialsSection() {
   return (
     <section className="py-16 md:py-20 bg-muted/30">
       <div className="container mx-auto px-4">
         <div className="text-center mb-12">
           <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
             <Quote className="w-7 h-7 text-primary" />
           </div>
           <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
             What Homeowners Are Saying
           </h2>
           <p className="text-muted-foreground max-w-2xl mx-auto">
             Real stories from South African solar owners earning with Crunch Carbon
           </p>
         </div>
         
         <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
           {testimonials.map((testimonial, index) => (
             <div 
               key={index}
               className="bg-background rounded-xl p-6 shadow-sm border border-border/50 flex flex-col"
             >
               {/* Stars */}
               <div className="flex gap-1 mb-4">
                 {Array.from({ length: testimonial.rating }).map((_, i) => (
                   <Star key={i} className="w-4 h-4 fill-crunch-yellow text-crunch-yellow" />
                 ))}
               </div>
               
               {/* Quote */}
               <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-6">
                 "{testimonial.quote}"
               </p>
               
               {/* Author */}
               <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                 <Avatar className={`h-10 w-10 ${testimonial.avatarBg}`}>
                   <AvatarFallback className={`${testimonial.avatarBg} text-white text-sm font-medium`}>
                     {testimonial.initials}
                   </AvatarFallback>
                 </Avatar>
                 <div className="flex-1">
                   <p className="text-sm font-medium text-foreground">
                     {testimonial.name}
                   </p>
                   <p className="text-xs text-muted-foreground">
                     {testimonial.location} • {testimonial.systemSize}
                   </p>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-bold text-primary">
                     {testimonial.earnings}
                   </p>
                   <p className="text-xs text-muted-foreground">per year</p>
                 </div>
               </div>
             </div>
           ))}
         </div>
       </div>
     </section>
   );
 }