import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface AdminFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    stage: string;
    cofounderType: string;
    locationPreference: string;
    matched: string;
    status: string;
  };
  onFiltersChange: (filters: any) => void;
  sortBy: "seriousness_score" | "created_at";
  onSortChange: (value: "seriousness_score" | "created_at") => void;
}

export const AdminFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
}: AdminFiltersProps) => {
  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-silver/40" />
        <Input
          placeholder="Search ideas, skills, location, phone..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-12 h-14 bg-transparent border-white/10 text-white placeholder:text-silver/40 text-base focus:border-white/30 transition-colors"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger className="w-auto min-w-[160px] bg-transparent border-white/10 text-silver hover:border-white/20 transition-colors h-10">
            <SelectValue placeholder="Pipeline" />
          </SelectTrigger>
          <SelectContent className="bg-charcoal border-white/10">
            <SelectItem value="all" className="text-silver hover:text-white">All Pipeline</SelectItem>
            <SelectItem value="new" className="text-silver hover:text-white">New</SelectItem>
            <SelectItem value="reviewed" className="text-silver hover:text-white">Reviewed</SelectItem>
            <SelectItem value="matched" className="text-silver hover:text-white">Matched</SelectItem>
            <SelectItem value="contacted" className="text-silver hover:text-white">Contacted</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.stage}
          onValueChange={(value) => onFiltersChange({ ...filters, stage: value })}
        >
          <SelectTrigger className="w-auto min-w-[160px] bg-transparent border-white/10 text-silver hover:border-white/20 transition-colors h-10">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent className="bg-charcoal border-white/10">
            <SelectItem value="all" className="text-silver hover:text-white">All Stages</SelectItem>
            <SelectItem value="idea" className="text-silver hover:text-white">Idea</SelectItem>
            <SelectItem value="customer" className="text-silver hover:text-white">Customers</SelectItem>
            <SelectItem value="prototype" className="text-silver hover:text-white">Prototype</SelectItem>
            <SelectItem value="mvp" className="text-silver hover:text-white">MVP</SelectItem>
            <SelectItem value="launched" className="text-silver hover:text-white">Launched</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.cofounderType}
          onValueChange={(value) => onFiltersChange({ ...filters, cofounderType: value })}
        >
          <SelectTrigger className="w-auto min-w-[160px] bg-transparent border-white/10 text-silver hover:border-white/20 transition-colors h-10">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-charcoal border-white/10">
            <SelectItem value="all" className="text-silver hover:text-white">All Types</SelectItem>
            <SelectItem value="technical" className="text-silver hover:text-white">Technical</SelectItem>
            <SelectItem value="business" className="text-silver hover:text-white">Business</SelectItem>
            <SelectItem value="growth" className="text-silver hover:text-white">Growth</SelectItem>
            <SelectItem value="mix" className="text-silver hover:text-white">Mix</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.locationPreference}
          onValueChange={(value) => onFiltersChange({ ...filters, locationPreference: value })}
        >
          <SelectTrigger className="w-auto min-w-[160px] bg-transparent border-white/10 text-silver hover:border-white/20 transition-colors h-10">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent className="bg-charcoal border-white/10">
            <SelectItem value="all" className="text-silver hover:text-white">All Locations</SelectItem>
            <SelectItem value="remote" className="text-silver hover:text-white">Remote</SelectItem>
            <SelectItem value="city" className="text-silver hover:text-white">Same City</SelectItem>
            <SelectItem value="timezone" className="text-silver hover:text-white">Same Timezone</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Select
          value={sortBy}
          onValueChange={(value) => onSortChange(value as "seriousness_score" | "created_at")}
        >
          <SelectTrigger className="w-auto min-w-[160px] bg-transparent border-white/10 text-silver hover:border-white/20 transition-colors h-10">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="bg-charcoal border-white/10">
            <SelectItem value="created_at" className="text-silver hover:text-white">Most Recent</SelectItem>
            <SelectItem value="seriousness_score" className="text-silver hover:text-white">Highest Score</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
