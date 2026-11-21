import type { ComponentType } from "react";
import { CatalogPage } from "../features/catalog/pages/CatalogPage";
import { PackageDetailPage } from "../features/catalog/pages/PackageDetailPage";
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
