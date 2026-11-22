import { useCallback, useEffect, useState } from "react";
import { getPublicInquiryForm } from "../inquiry-form.api";
import type { InquiryQuestionPublic } from "../types";

export function usePublicInquiryForm() {
  const [questions, setQuestions] = useState<InquiryQuestionPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getPublicInquiryForm();
      setQuestions(response.data.questions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load survey form"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { questions, isLoading, error, refetch };
}
