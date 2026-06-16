
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Search, BookOpen } from 'lucide-react';
import { CategoryFilter } from '@/components/knowledge-hub/CategoryFilter';
import { ResourceCard } from '@/components/knowledge-hub/ResourceCard';
import { useKnowledgeHubResources } from '@/hooks/useKnowledgeHub';

export default function KnowledgeHub() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const { data: resources, isLoading } = useKnowledgeHubResources(category, search);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Knowledge Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and download marketing materials, templates, and guides.
          </p>
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
          <div className="text-center py-12 text-muted-foreground">Loading resources...</div>
        ) : resources && resources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map(resource => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No resources found. Check back later for new materials.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
