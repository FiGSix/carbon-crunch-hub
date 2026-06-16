
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RESOURCE_CATEGORIES } from '@/hooks/useKnowledgeHub';

interface CategoryFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className="flex-wrap h-auto gap-1">
        {RESOURCE_CATEGORIES.map((cat) => (
          <TabsTrigger key={cat.value} value={cat.value} className="text-xs sm:text-sm">
            {cat.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
