import { useQuery } from "@tanstack/react-query";
import { productApi } from "../services/api";

export const PRODUCT_LIST_QUERY_KEY = ["products", "list"];
export const PRODUCT_LIST_CACHE_MS = 5 * 60 * 1000;

export function useProductsQuery() {
  return useQuery({
    queryKey: PRODUCT_LIST_QUERY_KEY,
    queryFn: () => productApi.list(),
    staleTime: PRODUCT_LIST_CACHE_MS,
    gcTime: PRODUCT_LIST_CACHE_MS,
    refetchOnWindowFocus: false,
  });
}
