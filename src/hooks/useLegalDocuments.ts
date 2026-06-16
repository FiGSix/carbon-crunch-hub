import { useQuery } from "@tanstack/react-query";
import { getLatestDocument, acceptLegalDocument } from "@/services/legalDocuments";

export function useLegalDocument(documentType: string) {
  return useQuery({
    queryKey: ["legal-document", documentType],
    queryFn: () => getLatestDocument(documentType),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAcceptLegalDocument() {
  return async (documentType: string, documentId: string, version: number, metadata?: Record<string, any>) => {
    await acceptLegalDocument(documentType, {
      document_id: documentId,
      version,
      metadata,
    });
  };
}
