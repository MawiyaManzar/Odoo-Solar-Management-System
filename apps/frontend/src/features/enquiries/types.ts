export interface EnquiryItem {
  id: string;
  customerId: string;
  source: string;
  requestedKw: number;
  systemKind: string | null;
  wantsSubsidy: boolean;
  monthlyBillInr: number | null;
  roofAreaSqft: number | null;
  gridSuitable: boolean | null;
  status: string;
  assignedTo: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone: number;
  addressLine: string;
  city: string;
}

export interface SurveyItem {
  id: string;
  enquiryId: string;
  technicianId: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  roofDirection: string | null;
  tiltDegrees: number | null;
  cableDistanceM: number | null;
  usableAreaSqft: number | null;
  shadowNotes: string | null;
  result: string | null;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
}
