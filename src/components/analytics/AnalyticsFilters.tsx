import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface AnalyticsFiltersProps {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  stageFilter: string;
  onStageFilterChange: (value: string) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
}

export const AnalyticsFilters = ({
  dateRange,
  onDateRangeChange,
  stageFilter,
  onStageFilterChange,
  locationFilter,
  onLocationFilterChange,
}: AnalyticsFiltersProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={dateRange} onValueChange={onDateRangeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={stageFilter} onValueChange={onStageFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="prototype">Prototype</SelectItem>
              <SelectItem value="mvp">MVP</SelectItem>
              <SelectItem value="launched">Launched</SelectItem>
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={onLocationFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="in-person">In-person</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
