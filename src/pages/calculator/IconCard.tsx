
import { LucideProps } from "lucide-react";

interface IconCardProps {
  icon: React.FC<LucideProps>;
  title: string;
  description: string;
}

export const IconCard = ({ icon: Icon, title, description }: IconCardProps) => {
  return (
    <div className="bg-white/50 p-3 md:p-4 rounded-xl shadow-sm border border-crunch-black/5 hover:shadow-md transition-all hover:-translate-y-1 text-center">
      <div className="bg-crunch-yellow/10 w-10 h-10 md:w-12 md:h-12 mx-auto rounded-full flex items-center justify-center mb-2 md:mb-3">
        <Icon className="h-5 w-5 md:h-6 md:w-6 text-crunch-yellow" />
      </div>
      <h3 className="text-sm md:text-base font-medium text-crunch-black">{title}</h3>
      <p className="text-xs text-crunch-black/60">{description}</p>
    </div>
  );
};
