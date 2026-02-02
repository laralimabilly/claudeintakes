import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Edit, Trash2, MessageSquare, CheckCircle, X } from "lucide-react";
import type { FounderProfile } from "@/types/founder";

interface BulkActionsBarProps {
  selectedProfiles: FounderProfile[];
  onClearSelection: () => void;
  onEdit: (profile: FounderProfile) => void;
  onDelete: (profileIds: string[]) => void;
  onMarkMatched: (profileIds: string[]) => void;
  onSendWhatsAppIntro: (profiles: FounderProfile[]) => void;
}

export const BulkActionsBar = ({
  selectedProfiles,
  onClearSelection,
  onEdit,
  onDelete,
  onMarkMatched,
  onSendWhatsAppIntro,
}: BulkActionsBarProps) => {
  const count = selectedProfiles.length;
  const isSingleSelection = count === 1;
  const isPairSelection = count === 2;

  if (count === 0) return null;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-sm px-6 py-4 flex items-center justify-between animate-fade-in">
      <div className="flex items-center gap-4">
        <span className="text-sm text-white/80">
          {count} selected
        </span>
        <button
          onClick={onClearSelection}
          className="text-xs text-silver/40 hover:text-silver transition-colors flex items-center gap-1"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
          >
            Actions
            <ChevronDown className="h-3.5 w-3.5 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-charcoal border-white/10">
          {isSingleSelection && (
            <>
              <DropdownMenuItem onClick={() => onEdit(selectedProfiles[0])} className="text-silver hover:text-white focus:bg-white/5 focus:text-white">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
            </>
          )}
          
          {isPairSelection && (
            <DropdownMenuItem onClick={() => onMarkMatched(selectedProfiles.map(p => p.id))} className="text-silver hover:text-white focus:bg-white/5 focus:text-white">
              <CheckCircle className="h-4 w-4 mr-2" />
              Match These 2 Founders
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => onSendWhatsAppIntro(selectedProfiles)} className="text-silver hover:text-white focus:bg-white/5 focus:text-white">
            <MessageSquare className="h-4 w-4 mr-2" />
            {isSingleSelection 
              ? "Send WhatsApp Intro" 
              : `Intro ${count} Founders`}
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/5" />

          <DropdownMenuItem 
            onClick={() => onDelete(selectedProfiles.map(p => p.id))}
            className="text-red-400/70 hover:text-red-400 focus:text-red-400 focus:bg-red-500/5"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete {isSingleSelection ? "Profile" : `${count} Profiles`}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
