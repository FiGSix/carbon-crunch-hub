
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search, BookOpen, Trash2, Download } from 'lucide-react';
import { CategoryFilter } from '@/components/knowledge-hub/CategoryFilter';
import { ResourceUploadForm } from '@/components/knowledge-hub/ResourceUploadForm';
import {
  useKnowledgeHubResources,
  useTogglePublished,
  useDeleteResource,
  formatFileSize,
  RESOURCE_CATEGORIES,
} from '@/hooks/useKnowledgeHub';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function getCategoryLabel(value: string) {
  return RESOURCE_CATEGORIES.find(c => c.value === value)?.label || value;
}

export default function KnowledgeHubAdmin() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const { data: resources, isLoading } = useKnowledgeHubResources(category, search);
  const togglePublished = useTogglePublished();
  const deleteResource = useDeleteResource();

  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Knowledge Hub Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload and manage resources for agents and partners.
            </p>
          </div>
          <ResourceUploadForm />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <CategoryFilter value={category} onChange={setCategory} />

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-center">Downloads</TableHead>
                  <TableHead className="text-center">Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources && resources.length > 0 ? (
                  resources.map(resource => (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{resource.title}</p>
                          <p className="text-xs text-muted-foreground">{resource.file_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getCategoryLabel(resource.category)}</Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(resource.file_size_bytes)}</TableCell>
                      <TableCell className="text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Download className="h-3 w-3" />
                          {resource.download_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={resource.is_published}
                          onCheckedChange={(checked) =>
                            togglePublished.mutate({ id: resource.id, is_published: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{resource.title}" and its file. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteResource.mutate({ id: resource.id, file_url: resource.file_url })}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No resources yet. Upload your first resource above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
