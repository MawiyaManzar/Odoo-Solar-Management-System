import { useCallback, useEffect, useState } from "react";
import { listInquiryQuestions } from "../inquiry-form.api";
import type { InquiryQuestion } from "../types";

export function useInquiryQuestions() {
  const [data, setData] = useState<InquiryQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listInquiryQuestions();
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load inquiry questions"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}
