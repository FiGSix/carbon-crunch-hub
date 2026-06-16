import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type VintageYear = 'blend' | '2025' | '2026' | '2027' | '2028' | '2029' | '2030';

export function useVintageProgressNotes(vintageYear: VintageYear) {
  const queryClient = useQueryClient();

  const { data: notes = '', isLoading } = useQuery({
    queryKey: ['vintage-progress-notes', vintageYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vintage_progress_notes')
        .select('notes')
        .eq('vintage_year', vintageYear)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data?.notes || '';
    },
  });

  const updateNotes = useMutation({
    mutationFn: async (notes: string) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('vintage_progress_notes')
        .upsert({
          vintage_year: vintageYear,
          notes,
          updated_by: userData.user?.id,
        }, {
          onConflict: 'vintage_year',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vintage-progress-notes', vintageYear] });
      toast.success('Notes saved');
    },
    onError: (error) => {
      console.error('Failed to save notes:', error);
      toast.error('Failed to save notes');
    },
  });

  return {
    notes,
    isLoading,
    updateNotes: updateNotes.mutate,
  };
}
