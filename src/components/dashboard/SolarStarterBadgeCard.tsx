import { Sun, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClientReferralStats } from '@/hooks/dashboard/useClientReferralStats';
import { Skeleton } from '@/components/ui/skeleton';

export function SolarStarterBadgeCard() {
  const { referralCount, currentTier, nextTier, targetForCurrentTier, isLoading } = useClientReferralStats();

  if (isLoading) {
    return (
      <Card className="bg-white border border-crunch-black/5 shadow-sm h-full">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="bg-white border border-crunch-black/5 shadow-sm hover:shadow-md transition-shadow duration-300 h-full">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full bg-[#DEF1D3] p-3">
              <Sun className="h-5 w-5 text-[#8ED973]" />
            </div>
            <h3 className="text-lg font-bold text-[#8ED973]">
              {currentTier.name}
            </h3>
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">
            {referralCount} out of {targetForCurrentTier} Referrals achieved to unlock{' '}
            {currentTier.feePercentage}% fee earnings.
          </p>
          
          {nextTier && (
            <p className="text-xs text-muted-foreground mb-4">
              Next Tier: {nextTier.name}
            </p>
          )}
          
          <Link to="/referral" className="block mt-4">
            <Button variant="outline" className="w-full">
              <UserPlus className="mr-2 h-4 w-4" />
              Refer a Friend
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
