import { useCallback, useEffect, useState } from "react";
import { listPackages, listProducts } from "../catalog.api";
import type { PackageItem, ProductItem } from "../types";

export function useCatalog() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productRes, packageRes] = await Promise.all([listProducts(), listPackages()]);
      setProducts(productRes.data);
      setPackages(packageRes.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load catalog"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { products, packages, isLoading, error, refetch };
}
