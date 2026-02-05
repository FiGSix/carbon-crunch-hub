 import { useState, useEffect } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { CheckCircle2 } from "lucide-react";
 
 const activities = [
   { name: "John M.", city: "Cape Town", time: "2 mins ago" },
   { name: "Sarah K.", city: "Johannesburg", time: "5 mins ago" },
   { name: "Thabo N.", city: "Pretoria", time: "8 mins ago" },
   { name: "Lisa V.", city: "Durban", time: "12 mins ago" },
   { name: "Michael P.", city: "Stellenbosch", time: "15 mins ago" },
   { name: "Nomsa D.", city: "Sandton", time: "18 mins ago" },
   { name: "Ryan B.", city: "Centurion", time: "22 mins ago" },
   { name: "Fatima A.", city: "Port Elizabeth", time: "25 mins ago" },
 ];
 
 export function LiveActivityNotification() {
   const [currentIndex, setCurrentIndex] = useState(0);
   const [isVisible, setIsVisible] = useState(false);
 
   useEffect(() => {
     // Initial delay before showing first notification
     const initialDelay = setTimeout(() => {
       setIsVisible(true);
     }, 3000);
 
     return () => clearTimeout(initialDelay);
   }, []);
 
   useEffect(() => {
     if (!isVisible) return;
 
     const interval = setInterval(() => {
       // Hide current notification
       setIsVisible(false);
       
       // Show next notification after a brief pause
       setTimeout(() => {
         setCurrentIndex((prev) => (prev + 1) % activities.length);
         setIsVisible(true);
       }, 500);
     }, 5000);
 
     return () => clearInterval(interval);
   }, [isVisible]);
 
   const activity = activities[currentIndex];
 
   return (
     <AnimatePresence>
       {isVisible && (
         <motion.div
           initial={{ opacity: 0, x: -100, y: 20 }}
           animate={{ opacity: 1, x: 0, y: 0 }}
           exit={{ opacity: 0, x: -100 }}
           transition={{ type: "spring", stiffness: 300, damping: 30 }}
           className="fixed bottom-20 md:bottom-6 left-4 z-40 max-w-xs"
         >
           <div className="bg-background/95 backdrop-blur-md border border-border rounded-lg shadow-lg p-3 flex items-center gap-3">
             <div className="flex-shrink-0">
               <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                 <CheckCircle2 className="w-5 h-5 text-primary" />
               </div>
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium text-foreground truncate">
                 {activity.name} from {activity.city}
               </p>
               <p className="text-xs text-muted-foreground">
                 Just registered • {activity.time}
               </p>
             </div>
           </div>
         </motion.div>
       )}
     </AnimatePresence>
   );
 }