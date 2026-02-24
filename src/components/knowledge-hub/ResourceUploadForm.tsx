
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Upload } from 'lucide-react';
import { useCreateResource, RESOURCE_CATEGORIES } from '@/hooks/useKnowledgeHub';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';

export function ResourceUploadForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const createResource = useCreateResource();
  const { user } = useAuth();
  const { toast } = useToast();

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('other');
    setTags('');
    setFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const storagePath = `${category}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('knowledge-hub')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const fileUrl = `knowledge-hub/${storagePath}`;

      await createResource.mutateAsync({
        title,
        description: description || null,
        category,
        file_name: file.name,
        file_url: fileUrl,
        file_size_bytes: file.size,
        mime_type: file.type || null,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        is_published: false,
        uploaded_by: user.id,
      });

      resetForm();
      setOpen(false);
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const categories = RESOURCE_CATEGORIES.filter(c => c.value !== 'all');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Upload Resource
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload New Resource</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input id="tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. solar, brochure, pricing" />
          </div>
          <div>
            <Label htmlFor="file">File *</Label>
            <Input id="file" type="file" onChange={e => setFile(e.target.files?.[0] || null)} required />
          </div>
          <Button type="submit" disabled={uploading || !file || !title} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
