
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Image, FileSpreadsheet, File } from 'lucide-react';
import { KnowledgeHubResource, downloadResource, formatFileSize, RESOURCE_CATEGORIES } from '@/hooks/useKnowledgeHub';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText;
  return File;
}

function getCategoryLabel(value: string) {
  return RESOURCE_CATEGORIES.find(c => c.value === value)?.label || value;
}

interface ResourceCardProps {
  resource: KnowledgeHubResource;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const FileIcon = getFileIcon(resource.mime_type);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadResource(resource.file_url, resource.file_name, resource.id);
    } catch (error: any) {
      toast({ title: 'Download failed', description: error.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-muted">
            <FileIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-tight line-clamp-2">{resource.title}</CardTitle>
            <Badge variant="secondary" className="mt-1.5 text-xs">
              {getCategoryLabel(resource.category)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        {resource.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">{resource.description}</p>
        )}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {resource.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatFileSize(resource.file_size_bytes)}
        </span>
        <Button size="sm" onClick={handleDownload} disabled={downloading}>
          <Download className="h-4 w-4 mr-1" />
          {downloading ? 'Downloading...' : 'Download'}
        </Button>
      </CardFooter>
    </Card>
  );
}
