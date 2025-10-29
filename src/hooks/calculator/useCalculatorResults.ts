import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface CalculatorResult {
  id: string;
  email: string;
  name: string | null;
  system_size_kwp: number;
  commissioning_date: string;
  invitation_token: string;
  invitation_expires_at: string;
  invitation_sent_at: string;
  invitation_viewed_at: string | null;
  created_at: string;
}

interface SendCalculatorResultsParams {
  email: string;
  name?: string;
  systemSizeKwp: number;
  commissioningDate: string;
}

export const useCalculatorResults = (resultId: string, token: string) => {
  const query = useQuery({
    queryKey: ["calculator-results", resultId, token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculator_results")
        .select("*")
        .eq("id", resultId)
        .eq("invitation_token", token)
        .single();

      if (error) throw error;
      
      // Check if expired
      if (new Date(data.invitation_expires_at) < new Date()) {
        throw new Error("EXPIRED");
      }

      return data as CalculatorResult;
    },
    retry: false,
  });

  // Mark as viewed on first load
  useEffect(() => {
    if (query.data && !query.data.invitation_viewed_at) {
      supabase
        .from("calculator_results")
        .update({ invitation_viewed_at: new Date().toISOString() })
        .eq("id", resultId)
        .eq("invitation_token", token)
        .then(() => {
          console.log("Calculator results marked as viewed");
        });
    }
  }, [query.data, resultId, token]);

  return query;
};

export const useSendCalculatorResults = () => {
  return useMutation({
    mutationFn: async (params: SendCalculatorResultsParams) => {
      const { data, error } = await supabase.functions.invoke("send-calculator-results", {
        body: {
          email: params.email,
          name: params.name,
          systemSizeKwp: params.systemSizeKwp,
          commissioningDate: params.commissioningDate,
          ipAddress: null, // Could be captured from client if needed
          userAgent: navigator.userAgent,
        },
      });

      if (error) throw error;
      return data;
    },
  });
};
