import type { ComponentType } from "react";
import { CatalogPage } from "../features/catalog/pages/CatalogPage";
import { PackageDetailPage } from "../features/catalog/pages/PackageDetailPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { EnquiriesPage } from "../features/enquiries/pages/EnquiriesPage";
import { EnquiryDetailPage } from "../features/enquiries/pages/EnquiryDetailPage";
import { QuoteDetailPage } from "../features/quotes/pages/QuoteDetailPage";
import { QuotesPage } from "../features/quotes/pages/QuotesPage";
import { RecordsPage } from "../features/records/pages/RecordsPage";

export interface FeatureRoute {
  id: string;
  path: string;
  label: string;
  roles: string[];
  page: ComponentType;
  showInNav?: boolean;
}

// Add a hackathon screen by appending one object. Then add the API route file.
const staff = ["admin", "sales", "warehouse", "technician", "support"];

export const featureRoutes: FeatureRoute[] = [
  {
    id: "dashboard",
    path: "dashboard",
    label: "Dashboard",
    roles: staff,
    page: DashboardPage
  },
  {
    id: "enquiries",
    path: "enquiries",
    label: "Enquiries",
    roles: staff,
    page: EnquiriesPage
  },
  {
    id: "enquiry-detail",
    path: "enquiries/:enquiryId",
    label: "Enquiry",
    roles: staff,
    page: EnquiryDetailPage,
    showInNav: false
  },
  {
    id: "quotes",
    path: "quotes",
    label: "Quotes",
    roles: staff,
    page: QuotesPage
  },
  {
    id: "quote-detail",
    path: "quotes/:quoteId",
    label: "Quote",
    roles: staff,
    page: QuoteDetailPage,
    showInNav: false
  },
  {
    id: "catalog",
    path: "catalog",
    label: "Catalog",
    roles: ["admin"],
    page: CatalogPage
  },
  {
    id: "catalog-detail",
    path: "catalog/:packageId",
    label: "Package",
    roles: ["admin"],
    page: PackageDetailPage,
    showInNav: false
  },
  {
    id: "records",
    path: "records",
    label: "Records Console",
    roles: staff,
    page: RecordsPage
  }
];
