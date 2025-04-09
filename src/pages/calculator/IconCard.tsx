
import { LucideProps } from "lucide-react";

interface IconCardProps {
  icon: React.FC<LucideProps>;
  title: string;
  description: string;
}

export const IconCard = ({ icon: Icon, title, description }: IconCardProps) => {
  return (
    <div className="bg-white/50 p-4 rounded-xl shadow-sm border border-crunch-black/5 hover:shadow-md transition-all hover:-translate-y-1 text-center">
      <div className="bg-crunch-yellow/10 w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-crunch-yellow" />
      </div>
      <h3 className="font-medium text-crunch-black">{title}</h3>
      <p className="text-xs text-crunch-black/60">{description}</p>
    </div>
  );
};
