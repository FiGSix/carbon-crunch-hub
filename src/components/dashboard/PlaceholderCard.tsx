import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PlaceholderCardProps {
  title: string;
  description?: string;
  className?: string;
  height?: string;
}

export function PlaceholderCard({ 
  title, 
  description = "Coming Soon", 
  className,
  height = "h-full"
}: PlaceholderCardProps) {
  return (
    <Card className={cn(
      "border-2 border-dashed border-muted-foreground/20 bg-muted/5",
      height,
      className
    )}>
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-full min-h-[80px]">
          <p className="text-sm text-muted-foreground/60 italic">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
