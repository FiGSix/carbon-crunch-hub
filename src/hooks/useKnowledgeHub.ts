
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface KnowledgeHubResource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  tags: string[];
  is_published: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  download_count: number;
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'marketing', label: 'Marketing Materials' },
  { value: 'templates', label: 'Templates' },
  { value: 'explainers', label: 'Explainers' },
  { value: 'faq', label: 'FAQ / Guides' },
  { value: 'email_templates', label: 'Email Templates' },
  { value: 'other', label: 'Other' },
] as const;

export const RESOURCE_CATEGORIES = CATEGORIES;

export function useKnowledgeHubResources(category: string, search: string) {
  return useQuery({
    queryKey: ['knowledge-hub-resources', category, search],
    queryFn: async () => {
      let query = supabase
        .from('knowledge_hub_resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as KnowledgeHubResource[];
    },
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (resource: Omit<KnowledgeHubResource, 'id' | 'created_at' | 'updated_at' | 'download_count'>) => {
      const { data, error } = await supabase
        .from('knowledge_hub_resources')
        .insert(resource)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-hub-resources'] });
      toast({ title: 'Resource uploaded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useTogglePublished() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from('knowledge_hub_resources')
        .update({ is_published })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-hub-resources'] });
      toast({ title: 'Status updated' });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, file_url }: { id: string; file_url: string }) => {
      // Extract storage path from file_url
      const path = file_url.split('/knowledge-hub/')[1];
      if (path) {
        await supabase.storage.from('knowledge-hub').remove([path]);
      }
      const { error } = await supabase
        .from('knowledge_hub_resources')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-hub-resources'] });
      toast({ title: 'Resource deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    },
  });
}

export async function downloadResource(fileUrl: string, fileName: string, resourceId: string) {
  // Extract storage path
  const path = fileUrl.split('/knowledge-hub/')[1];
  if (!path) {
    throw new Error('Invalid file URL');
  }

  const { data, error } = await supabase.storage
    .from('knowledge-hub')
    .createSignedUrl(path, 60);

  if (error) throw error;

  // Increment download count (best-effort)
  supabase
    .from('knowledge_hub_resources')
    .select('download_count')
    .eq('id', resourceId)
    .single()
    .then(({ data }) => {
      if (data) {
        supabase
          .from('knowledge_hub_resources')
          .update({ download_count: (data.download_count || 0) + 1 })
          .eq('id', resourceId)
          .then(() => {});
      }
    });

  // Trigger download
  const link = document.createElement('a');
  link.href = data.signedUrl;
  link.download = fileName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
