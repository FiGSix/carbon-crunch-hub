 import {
   Accordion,
   AccordionContent,
   AccordionItem,
   AccordionTrigger,
 } from "@/components/ui/accordion";
 import { HelpCircle } from "lucide-react";
 
 const faqs = [
   {
     question: "Is this really free?",
     answer: "Yes, 100% free. There are no upfront costs, no monthly fees, and no hidden charges. Crunch Carbon earns a small share of the carbon credit revenue only when you earn. If you don't earn, we don't earn."
   },
   {
     question: "How much can I realistically earn?",
     answer: "Earnings depend on your system size and energy production. A typical 5kWp residential system earns approximately R600-R1,000 per year. Larger systems earn proportionally more. Use our calculator for a personalized estimate based on your actual system."
   },
   {
     question: "What happens to my data?",
     answer: "We only access your solar production data (how much energy your system generates). We never access your personal electricity usage, billing information, or any other private data. Your data is encrypted and stored securely, and we never sell it to third parties."
   },
   {
     question: "How long until I get paid?",
     answer: "Carbon credits are verified and sold in annual cycles. After your first year of data collection, you'll receive your first payout. Payments are made annually, after the verification, issuance and sale of the carbon credits."
   },
   {
     question: "What if I sell my house?",
     answer: "If you sell your home, you simply notify us and we'll close your account. Any earned credits up to that point will still be paid out to you. The new homeowner can register their own account if they wish to continue earning."
   },
   {
     question: "Do I need any special equipment?",
     answer: "No additional equipment is needed. We integrate with your existing solar monitoring system (like SolarEdge, Enphase, or Huawei). If you can see your solar production on an app, we can likely connect to it."
   },
 ];
 
 export function FAQSection() {
   return (
     <section className="py-16 md:py-20 bg-background">
       <div className="container mx-auto px-4">
         <div className="max-w-3xl mx-auto">
           <div className="text-center mb-10">
             <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
               <HelpCircle className="w-7 h-7 text-primary" />
             </div>
             <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
               Frequently Asked Questions
             </h2>
             <p className="text-muted-foreground">
               Got questions? We've got answers.
             </p>
           </div>
           
           <Accordion type="single" collapsible className="w-full">
             {faqs.map((faq, index) => (
               <AccordionItem key={index} value={`item-${index}`}>
                 <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                   {faq.question}
                 </AccordionTrigger>
                 <AccordionContent className="text-muted-foreground leading-relaxed">
                   {faq.answer}
                 </AccordionContent>
               </AccordionItem>
             ))}
           </Accordion>
         </div>
       </div>
     </section>
   );
 }