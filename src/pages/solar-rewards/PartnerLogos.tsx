 import { useIsMobile } from "@/hooks/use-mobile";
 
 const partners = [
   { name: "Moolman Group", logo: "/partner-logos/moolman-group.png", category: "Property Developer" },
   { name: "Blume", logo: "/partner-logos/blume.png", category: "Energy Development Partner" },
   { name: "RISE", logo: "/partner-logos/rise.png", category: "Renewable Energy Fund" },
   { name: "MPower", logo: "/partner-logos/mpower.png", category: "Energy Developer" },
   { name: "AlphaESS", logo: "/partner-logos/alpha-ess.png", category: "Global OEM" },
   { name: "Carbon Disclosure SA", logo: "/partner-logos/cdsa.png", category: "Carbon Credit Partner" },
   { name: "i-G3N", logo: "/partner-logos/i-g3n.png", category: "Energy Storage Manufacturer" },
   { name: "GridVolt", logo: "/partner-logos/gridvolt.png", category: "Solar Installer" },
   { name: "PV Solutions", logo: "/partner-logos/pv-solutions.png", category: "Solar Installer" },
   { name: "Solar Giant", logo: "/partner-logos/solar-giant.avif", category: "Solar Installer" },
   { name: "Rentech", logo: "/partner-logos/rentech.svg", category: "Solar Installer" },
   { name: "Renen Solar", logo: "/partner-logos/renen-solar.png", category: "Solar Installer" },
   { name: "MiSolar", logo: "/partner-logos/misolar.avif", category: "Solar Installer" },
   { name: "Oryx Renewables", logo: "/partner-logos/oryx-renewables.png", category: "Solar Installer" },
   { name: "The Greenway Solar", logo: "/partner-logos/greenway-solar.svg", category: "Solar Installer" },
 ];
 
 export function PartnerLogos() {
   const isMobile = useIsMobile();
 
   return (
     <section className="py-12 md:py-16 bg-muted/30 overflow-hidden">
       <div className="container mx-auto px-4">
         <h2 className="text-center text-lg md:text-xl font-medium text-muted-foreground mb-8 md:mb-12">
           Trusted by Leading Solar Industry Partners
         </h2>
 
         {/* Desktop/Tablet Grid */}
         <div className="hidden md:grid grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 items-center justify-items-center">
           {partners.map((partner) => (
             <div
               key={partner.name}
               className="group flex items-center justify-center h-12 w-full"
               title={`${partner.name} - ${partner.category}`}
             >
               <img
                 src={partner.logo}
                 alt={partner.name}
                 className="max-h-10 lg:max-h-12 w-auto object-contain grayscale opacity-70 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
                 loading="lazy"
               />
             </div>
           ))}
         </div>
 
         {/* Mobile Scroll Carousel */}
         <div className="md:hidden relative">
           {/* Fade edges */}
           <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
           <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />
           
           {/* Scrolling container */}
           <div className="flex animate-scroll-logos hover:[animation-play-state:paused]">
             {/* First set of logos */}
             {partners.map((partner) => (
               <div
                 key={`first-${partner.name}`}
                 className="flex-shrink-0 flex items-center justify-center h-12 px-6"
                 title={`${partner.name} - ${partner.category}`}
               >
                 <img
                   src={partner.logo}
                   alt={partner.name}
                   className="max-h-10 w-auto object-contain grayscale opacity-70"
                   loading="lazy"
                 />
               </div>
             ))}
             {/* Duplicate set for seamless loop */}
             {partners.map((partner) => (
               <div
                 key={`second-${partner.name}`}
                 className="flex-shrink-0 flex items-center justify-center h-12 px-6"
                 aria-hidden="true"
               >
                 <img
                   src={partner.logo}
                   alt=""
                   className="max-h-10 w-auto object-contain grayscale opacity-70"
                   loading="lazy"
                 />
               </div>
             ))}
           </div>
         </div>
       </div>
 
       {/* CSS Animation */}
       <style>{`
         @keyframes scroll-logos {
           0% { transform: translateX(0); }
           100% { transform: translateX(-50%); }
         }
         .animate-scroll-logos {
           animation: scroll-logos 45s linear infinite;
         }
       `}</style>
     </section>
   );
 }