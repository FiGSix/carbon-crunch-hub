import { Sun } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClientReferralStats } from '@/hooks/dashboard/useClientReferralStats';
import { Skeleton } from '@/components/ui/skeleton';

export function SolarStarterBadgeCard() {
  const { referralCount, currentTier, nextTier, targetForCurrentTier, isLoading } = useClientReferralStats();

  if (isLoading) {
    return (
      <Card className="bg-[#8ED973]">
        <CardHeader>
          <CardTitle className="text-white">Solar Starter Badge</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#8ED973]">
      <CardHeader>
        <CardTitle className="text-white">Solar Starter Badge</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20">
            <Sun className="w-6 h-6 text-white" />
          </div>
          
          <h3 className="text-2xl font-bold text-white">
            {currentTier.name}
          </h3>
          
          <p className="text-sm text-white/90 leading-relaxed">
            {referralCount} out of {targetForCurrentTier} Referrals achieved to unlock{' '}
            {currentTier.feePercentage}% fee earnings.
          </p>
          
          {nextTier && (
            <p className="text-xs text-white/75">
              Next Tier: {nextTier.name}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
