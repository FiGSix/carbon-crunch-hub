
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface ProposalFiltersProps {
  onSearchChange?: (value: string) => void;
  onStatusChange?: (value: string) => void;
  onSortChange?: (value: string) => void;
}

export function ProposalFilters({
  onSearchChange,
  onStatusChange,
  onSortChange
}: ProposalFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-carbon-gray-400" />
        <Input 
          placeholder="Search proposals..." 
          className="pl-10 retro-input"
          onChange={e => onSearchChange?.(e.target.value)}
        />
      </div>
      
      <Select 
        defaultValue="all"
        onValueChange={value => onStatusChange?.(value)}
      >
        <SelectTrigger className="retro-input">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
      
      <Select 
        defaultValue="newest"
        onValueChange={value => onSortChange?.(value)}
      >
        <SelectTrigger className="retro-input">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest First</SelectItem>
          <SelectItem value="oldest">Oldest First</SelectItem>
          <SelectItem value="size-high">Size (High to Low)</SelectItem>
          <SelectItem value="size-low">Size (Low to High)</SelectItem>
          <SelectItem value="revenue-high">Revenue (High to Low)</SelectItem>
          <SelectItem value="revenue-low">Revenue (Low to High)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
