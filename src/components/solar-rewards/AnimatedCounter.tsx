 import { useEffect, useState, useRef } from "react";
 import { motion, useInView } from "framer-motion";
 
 interface AnimatedCounterProps {
   target: number;
   prefix?: string;
   suffix?: string;
   duration?: number;
   decimals?: number;
 }
 
 export function AnimatedCounter({ 
   target, 
   prefix = "", 
   suffix = "", 
   duration = 2,
   decimals = 0 
 }: AnimatedCounterProps) {
   const [count, setCount] = useState(0);
   const ref = useRef<HTMLSpanElement>(null);
   const isInView = useInView(ref, { once: true, margin: "-100px" });
   const hasAnimated = useRef(false);
 
   useEffect(() => {
     if (isInView && !hasAnimated.current) {
       hasAnimated.current = true;
       const startTime = Date.now();
       const endTime = startTime + duration * 1000;
 
       const animate = () => {
         const now = Date.now();
         const progress = Math.min((now - startTime) / (duration * 1000), 1);
         
         // Ease out cubic for smooth deceleration
         const easeOut = 1 - Math.pow(1 - progress, 3);
         const currentValue = easeOut * target;
         
         setCount(currentValue);
 
         if (now < endTime) {
           requestAnimationFrame(animate);
         } else {
           setCount(target);
         }
       };
 
       requestAnimationFrame(animate);
     }
   }, [isInView, target, duration]);
 
   const formatNumber = (num: number) => {
     if (decimals > 0) {
       return num.toFixed(decimals);
     }
     // Format with K/M for large numbers
     if (target >= 1000000) {
       return (num / 1000000).toFixed(1) + "M";
     }
     if (target >= 10000) {
       return (num / 1000).toFixed(1) + "K";
     }
     return Math.round(num).toLocaleString();
   };
 
   return (
     <motion.span
       ref={ref}
       initial={{ opacity: 0, y: 20 }}
       animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
       transition={{ duration: 0.5 }}
       className="tabular-nums"
     >
       {prefix}{formatNumber(count)}{suffix}
     </motion.span>
   );
 }