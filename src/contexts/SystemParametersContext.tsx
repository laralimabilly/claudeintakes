// src/contexts/SystemParametersContext.tsx
// ============================================================================
// Context that loads system_parameters once when the admin panel mounts.
// All admin components can read matching weights (and future params) from
// this context without additional DB calls.
// ============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  MatchingWeightsConfig,
  SystemParameter,
} from "@/types/systemParameters";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface SystemParametersState {
  /** The full MATCHING_WEIGHTS config (null while loading) */
  matchingWeights: MatchingWeightsConfig | null;
  /** Raw map of all parameters by key */
  parameters: Record<string, SystemParameter>;
  /** True during the initial fetch */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Re-fetch all parameters from DB */
  refresh: () => Promise<void>;
  /** Update a single parameter (persists to DB) */
  updateParameter: <T>(key: string, value: T) => Promise<void>;
}

const SystemParametersContext = createContext<SystemParametersState>({
  matchingWeights: null,
  parameters: {},
  isLoading: true,
  error: null,
  refresh: async () => {},
  updateParameter: async () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SystemParametersProvider({ children }: { children: ReactNode }) {
  const [parameters, setParameters] = useState<Record<string, SystemParameter>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchParameters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const { data, error: fnError } = await supabase.functions.invoke(
        "system-parameters",
        {
          headers: { Authorization: `Bearer ${token}` },
          method: "GET",
        }
      );

      if (fnError) throw fnError;

      const paramsList: SystemParameter[] = data?.parameters || [];
      const map: Record<string, SystemParameter> = {};
      for (const p of paramsList) {
        map[p.system_key] = p;
      }
      setParameters(map);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load system parameters";
      console.error("[SystemParameters] fetch error:", msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateParameter = useCallback(
    async <T,>(key: string, value: T) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const { data, error: fnError } = await supabase.functions.invoke(
        "system-parameters",
        {
          headers: { Authorization: `Bearer ${token}` },
          method: "PUT",
          body: { system_key: key, value },
        }
      );

      if (fnError) throw fnError;

      // Update local state
      setParameters((prev) => ({
        ...prev,
        [key]: data as SystemParameter,
      }));
    },
    []
  );

  useEffect(() => {
    fetchParameters();
  }, [fetchParameters]);

  const matchingWeights =
    (parameters["MATCHING_WEIGHTS"]?.value as MatchingWeightsConfig) ?? null;

  return (
    <SystemParametersContext.Provider
      value={{
        matchingWeights,
        parameters,
        isLoading,
        error,
        refresh: fetchParameters,
        updateParameter,
      }}
    >
      {children}
    </SystemParametersContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSystemParameters() {
  return useContext(SystemParametersContext);
}

export function useMatchingWeights() {
  const { matchingWeights } = useContext(SystemParametersContext);
  return matchingWeights;
}
