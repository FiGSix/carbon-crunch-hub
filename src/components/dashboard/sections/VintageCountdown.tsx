import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { vintageConfigService } from "@/services/vintageConfigService";

interface VintageInfo {
  year: number;
  deadline: Date;
}

export function VintageCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [vintageInfo, setVintageInfo] = useState<VintageInfo | null>(null);

  useEffect(() => {
    // Fetch vintage deadline from config
    vintageConfigService.getNextVintageDeadline().then((info) => {
      if (info) {
        setVintageInfo(info);
      }
    });
  }, []);

  useEffect(() => {
    if (!vintageInfo) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = vintageInfo.deadline.getTime() - now.getTime();

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
  }, [vintageInfo]);

  const formatDeadline = (date: Date) => {
    return date.toLocaleDateString('en-ZA', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!vintageInfo) {
    return null; // Don't show countdown if no deadline configured
  }

  return (
    <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
      <CardContent className="py-6">
        <div className="flex flex-col gap-4">
          {/* Title section */}
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Vintage {vintageInfo.year} Closing Countdown
              </h3>
              <p className="text-xs text-muted-foreground">
                Deadline: {formatDeadline(vintageInfo.deadline)}
              </p>
            </div>
          </div>
          
          {/* Countdown numbers */}
          <div className="flex items-center justify-center gap-6">
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
