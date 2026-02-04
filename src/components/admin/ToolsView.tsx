import { BackfillEmbeddings } from "./BackfillEmbeddings";
import { BackfillGeolocation } from "./BackfillGeolocation";
import { Wrench } from "lucide-react";

export const ToolsView = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/5">
          <Wrench className="h-5 w-5 text-silver/60" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Tools</h1>
          <p className="text-silver/60 text-sm">System utilities and batch operations</p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid gap-6 max-w-2xl">
        <BackfillEmbeddings />
        <BackfillGeolocation />
      </div>
    </div>
  );
};
