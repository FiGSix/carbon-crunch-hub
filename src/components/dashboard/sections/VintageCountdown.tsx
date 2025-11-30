import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export function VintageCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const targetDate = new Date('2025-12-31T23:59:59');
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeLeft({ days, hours, minutes });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
      <CardContent className="py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Vintage 2025 Closing Countdown
              </h3>
              <p className="text-sm text-muted-foreground">
                Time remaining to submit projects for Vintage 2025
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary tabular-nums">
                {timeLeft.days}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Days
              </div>
            </div>
            
            <div className="text-2xl font-light text-muted-foreground">:</div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-primary tabular-nums">
                {timeLeft.hours.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Hours
              </div>
            </div>
            
            <div className="text-2xl font-light text-muted-foreground">:</div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-primary tabular-nums">
                {timeLeft.minutes.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Minutes
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
