import { useState, useEffect, useCallback } from "react";
import { Settings, Save, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useSystemParameters, useMatchingWeights } from "@/contexts/SystemParametersContext";
import type { MatchingWeightsConfig } from "@/types/systemParameters";
import { toast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deep-clone a JSON-safe value */
function deepClone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

/** Set a nested value by dot-path, e.g. "dimensions.skills.weight" */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] === undefined || typeof cur[keys[i]] !== "object") {
      cur[keys[i]] = {};
    }
    cur = cur[keys[i]] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

const DIMENSION_KEYS = ["skills", "stage", "communication", "values", "vision", "geo", "advantages"] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NumberField({
  label,
  value,
  onChange,
  step = 0.01,
  min,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-silver/70">{label}</Label>
      <Input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-8 bg-white/5 border-white/10 text-white text-sm"
      />
      {hint && <p className="text-[10px] text-silver/40">{hint}</p>}
    </div>
  );
}

function RecordField({
  label,
  record,
  onChange,
}: {
  label: string;
  record: Record<string, unknown>;
  onChange: (r: Record<string, unknown>) => void;
}) {
  if (!record || typeof record !== "object") return null;

  // If it's a nested record (like stage_matrix), show as JSON textarea
  const firstValue = Object.values(record)[0];
  const isNested = typeof firstValue === "object" && firstValue !== null;

  if (isNested) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-silver/70">{label}</Label>
        <textarea
          className="w-full h-32 bg-white/5 border border-white/10 rounded-md text-white text-xs p-2 font-mono"
          value={JSON.stringify(record, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange(parsed);
            } catch {
              // ignore invalid JSON while typing
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs text-silver/70">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(record).map(([k, v]) => (
          <NumberField
            key={k}
            label={k}
            value={typeof v === "number" ? v : 0}
            onChange={(newVal) => onChange({ ...record, [k]: newVal })}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dimension editor
// ---------------------------------------------------------------------------

function DimensionSection({
  dimensionKey,
  config,
  onUpdate,
}: {
  dimensionKey: string;
  config: Record<string, unknown>;
  onUpdate: (path: string, value: unknown) => void;
}) {
  const weight = (config.weight as number) ?? 0;
  const label = (config.label as string) ?? dimensionKey;

  return (
    <Card className="bg-white/[0.03] border-white/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white capitalize">{label}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-silver/50">Weight</span>
          <Input
            type="number"
            step={0.01}
            min={0}
            max={1}
            value={weight}
            onChange={(e) => onUpdate(`dimensions.${dimensionKey}.weight`, parseFloat(e.target.value) || 0)}
            className="w-20 h-7 bg-white/5 border-white/10 text-white text-sm text-right"
          />
          <span className="text-xs text-silver/50">{Math.round(weight * 100)}%</span>
        </div>
      </div>

      {/* Render sub-fields */}
      <div className="space-y-3 pl-2 border-l border-white/5">
        {Object.entries(config).map(([key, value]) => {
          if (key === "weight" || key === "label") return null;

          const path = `dimensions.${dimensionKey}.${key}`;

          if (typeof value === "number") {
            return (
              <NumberField
                key={key}
                label={key}
                value={value}
                onChange={(v) => onUpdate(path, v)}
              />
            );
          }

          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            // Check if it's a simple flat object of numbers or a nested one
            const entries = Object.entries(value as Record<string, unknown>);
            const allNumbers = entries.every(([, v]) => typeof v === "number");

            if (allNumbers) {
              return (
                <div key={key} className="space-y-2">
                  <Label className="text-xs text-silver/60 font-medium">{key}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-2">
                    {entries.map(([subKey, subVal]) => (
                      <NumberField
                        key={subKey}
                        label={subKey}
                        value={subVal as number}
                        onChange={(v) => onUpdate(`${path}.${subKey}`, v)}
                      />
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <RecordField
                key={key}
                label={key}
                record={value as Record<string, unknown>}
                onChange={(v) => onUpdate(path, v)}
              />
            );
          }

          return null;
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const SystemParametersView = () => {
  const { matchingWeights, isLoading, error, updateParameter, refresh } = useSystemParameters();
  const [draft, setDraft] = useState<MatchingWeightsConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Seed draft from context
  useEffect(() => {
    if (matchingWeights && !draft) {
      setDraft(deepClone(matchingWeights));
    }
  }, [matchingWeights]);

  const resetDraft = useCallback(() => {
    if (matchingWeights) setDraft(deepClone(matchingWeights));
  }, [matchingWeights]);

  // Compute weight sum
  const weightSum = draft
    ? DIMENSION_KEYS.reduce((sum, k) => sum + ((draft.dimensions as Record<string, { weight: number }>)[k]?.weight ?? 0), 0)
    : 0;
  const weightSumValid = Math.abs(weightSum - 1) < 0.005; // tolerance for floating-point

  const handleUpdate = (path: string, value: unknown) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = deepClone(prev);
      setNestedValue(next as unknown as Record<string, unknown>, path, value);
      return next;
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    if (!weightSumValid) {
      toast({ title: "Invalid weights", description: "Dimension weights must sum to 1 (100%).", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateParameter("MATCHING_WEIGHTS", draft);
      toast({ title: "Saved", description: "Matching weights updated successfully." });
      await refresh();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-silver/60 text-sm">Loading system parameters…</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-destructive text-sm">Error: {error}</div>
    );
  }

  if (!draft) {
    return (
      <div className="p-6 text-silver/60 text-sm">No MATCHING_WEIGHTS parameter found in database.</div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5">
            <Settings className="h-5 w-5 text-silver/60" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">System Configuration</h1>
            <p className="text-silver/60 text-sm">Edit matching weights and algorithm thresholds</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetDraft} className="text-silver/60 hover:text-white">
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !weightSumValid} className="bg-teal hover:bg-teal/90 text-white">
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Global thresholds */}
      <Card className="bg-white/[0.03] border-white/5 p-4">
        <h2 className="text-sm font-semibold text-white mb-3">Global Thresholds</h2>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Min Match Score"
            value={draft.min_match_score}
            onChange={(v) => handleUpdate("min_match_score", v)}
            step={1}
            min={0}
            max={100}
            hint="Minimum score to include in automated matching"
          />
          <NumberField
            label="Highly Compatible Threshold"
            value={draft.highly_compatible_threshold}
            onChange={(v) => handleUpdate("highly_compatible_threshold", v)}
            step={1}
            min={0}
            max={100}
            hint="Score threshold for 'highly compatible' label"
          />
        </div>
      </Card>

      {/* Weight sum indicator */}
      <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${weightSumValid ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
        {!weightSumValid && <AlertTriangle className="h-4 w-4" />}
        <span>
          Dimension weight total: <strong>{(weightSum * 100).toFixed(1)}%</strong>
          {weightSumValid ? " ✓" : " — must equal 100%"}
        </span>
      </div>

      {/* Dimensions */}
      <div className="space-y-4">
        {DIMENSION_KEYS.map((key) => (
          <DimensionSection
            key={key}
            dimensionKey={key}
            config={(draft.dimensions as Record<string, Record<string, unknown>>)[key]}
            onUpdate={handleUpdate}
          />
        ))}
      </div>
    </div>
  );
};
