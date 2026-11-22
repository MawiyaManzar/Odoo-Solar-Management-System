export type InquiryFieldType = "single_choice" | "select" | "text" | "number" | "boolean";

export type InquiryMapsTo =
  | "requestedKw"
  | "systemKind"
  | "wantsSubsidy"
  | "monthlyBillInr"
  | "roofAreaSqft"
  | "gridSuitable"
  | null;

export interface InquiryOption {
  value: string;
  label: string;
  mapValue?: number | boolean | string;
}

export interface InquiryQuestion {
  id: string;
  key: string;
  label: string;
  helpText: string | null;
  fieldType: InquiryFieldType;
  options: InquiryOption[] | null;
  mapsTo: InquiryMapsTo;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InquiryQuestionPublic = Omit<InquiryQuestion, "isActive" | "createdAt" | "updatedAt">;

export interface InquiryQuestionInput {
  key: string;
  label: string;
  helpText?: string | null;
  fieldType: InquiryFieldType;
  options?: InquiryOption[] | null;
  mapsTo?: InquiryMapsTo;
  sortOrder: number;
  isRequired?: boolean;
  isActive?: boolean;
}

export type InquiryQuestionPatch = Partial<InquiryQuestionInput>;
