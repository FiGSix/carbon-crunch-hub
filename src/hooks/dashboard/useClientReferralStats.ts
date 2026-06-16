import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface ReferralTier {
  name: string;
  minReferrals: number;
  maxReferrals: number;
  feePercentage: number;
}

export interface ReferralStats {
  referralCount: number;
  currentTier: ReferralTier;
  nextTier: ReferralTier | null;
  targetForCurrentTier: number;
  isLoading: boolean;
  error: string | null;
}

const REFERRAL_TIERS: ReferralTier[] = [
  { name: 'Solar Starter', minReferrals: 0, maxReferrals: 5, feePercentage: 0.5 },
  { name: 'Rooftop Rookie', minReferrals: 6, maxReferrals: 15, feePercentage: 1.0 },
  { name: 'Captain Carbon', minReferrals: 16, maxReferrals: 20, feePercentage: 1.5 },
  { name: 'Solar Legend', minReferrals: 21, maxReferrals: 50, feePercentage: 2.0 },
  { name: 'Crunch Carbon Ambassador', minReferrals: 51, maxReferrals: Infinity, feePercentage: 2.5 },
];

function getCurrentTier(referralCount: number): ReferralTier {
  for (const tier of REFERRAL_TIERS) {
    if (referralCount <= tier.maxReferrals) {
      return tier;
    }
  }
  return REFERRAL_TIERS[REFERRAL_TIERS.length - 1];
}

function getNextTier(currentTier: ReferralTier): ReferralTier | null {
  const currentIndex = REFERRAL_TIERS.findIndex(t => t.name === currentTier.name);
  if (currentIndex === -1 || currentIndex === REFERRAL_TIERS.length - 1) {
    return null;
  }
  return REFERRAL_TIERS[currentIndex + 1];
}

export function useClientReferralStats(): ReferralStats {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['clientReferralStats', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { count: 0 };
      }

      const { count, error } = await supabase
        .from('client_referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
        .eq('status', 'confirmed');

      if (error) {
        console.error('Error fetching referral stats:', error);
        throw error;
      }

      return { count: count || 0 };
    },
    enabled: !!user?.id,
  });

  const referralCount = data?.count || 0;
  const currentTier = getCurrentTier(referralCount);
  const nextTier = getNextTier(currentTier);
  const targetForCurrentTier = currentTier.maxReferrals === Infinity ? 50 : currentTier.maxReferrals;

  return {
    referralCount,
    currentTier,
    nextTier,
    targetForCurrentTier,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
