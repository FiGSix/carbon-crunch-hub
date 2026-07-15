import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RegenerateSignedAgreementButtonProps {
  proposalId: string;
}

/**
 * Admin-only. Re-invokes generate-signed-agreement-pdf for a proposal whose
 * signed_pdf_url is missing (e.g. signed while the post-signature background
 * task was being killed by the edge runtime). Optionally re-sends the client
 * email with the signed PDF attached.
 */
export function RegenerateSignedAgreementButton({ proposalId }: RegenerateSignedAgreementButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const run = async (sendEmail: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-signed-agreements', {
        body: { proposalId, sendEmail },
      });
      if (error) throw error;
      const first = data?.results?.[0];
      if (first?.ok) {
        toast({
          title: 'Signed PDF regenerated',
          description: sendEmail
            ? first.emailed ? 'Client email resent with signed PDF.' : 'PDF regenerated but email was not sent (no client email found).'
            : 'Signed PDF is now available for download.',
        });
      } else {
        toast({
          title: 'Nothing to regenerate',
          description: first?.error || 'No missing signed PDF found for this proposal.',
          variant: 'destructive',
        });
      }
    } catch (e) {
      toast({
        title: 'Regeneration failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => run(true)}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Working...' : 'Regenerate & Resend'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Regenerate the signed agreement PDF and resend it to the client</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
