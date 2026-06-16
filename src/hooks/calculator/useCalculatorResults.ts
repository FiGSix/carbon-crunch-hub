import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SendCalculatorResultsParams {
  email: string;
  name?: string;
  systemSizeKwp: number;
  commissioningDate: string;
  referralCode?: string;
  address?: string;
}

export const useSendCalculatorResults = () => {
  return useMutation({
    mutationFn: async (params: SendCalculatorResultsParams) => {
      const { data, error } = await supabase.functions.invoke("send-calculator-results", {
        body: {
          email: params.email,
          name: params.name,
          systemSizeKwp: params.systemSizeKwp,
          commissioningDate: params.commissioningDate,
          referralCode: params.referralCode,
          address: params.address,
          ipAddress: null,
          userAgent: navigator.userAgent,
        },
      });

      if (error) throw error;
      return data;
    },
  });
};
