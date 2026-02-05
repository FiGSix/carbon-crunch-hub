 import { Avatar, AvatarFallback } from "@/components/ui/avatar";
 
 const avatars = [
   { initials: "JM", bg: "bg-emerald-500" },
   { initials: "SK", bg: "bg-blue-500" },
   { initials: "NP", bg: "bg-amber-500" },
   { initials: "TL", bg: "bg-rose-500" },
   { initials: "RV", bg: "bg-violet-500" },
 ];
 
 interface AvatarStackProps {
   count?: number;
   className?: string;
 }
 
 export function AvatarStack({ count = 1247, className }: AvatarStackProps) {
   return (
     <div className={`flex items-center gap-3 ${className}`}>
       <div className="flex -space-x-3">
         {avatars.map((avatar, index) => (
           <Avatar 
             key={index} 
             className={`h-8 w-8 border-2 border-background ring-0 ${avatar.bg}`}
           >
             <AvatarFallback className={`${avatar.bg} text-white text-xs font-medium`}>
               {avatar.initials}
             </AvatarFallback>
           </Avatar>
         ))}
       </div>
       <span className="text-sm font-medium text-muted-foreground">
         <span className="text-foreground font-semibold">{count.toLocaleString()}+</span> homeowners earning with Crunch Carbon
       </span>
     </div>
   );
 }