"use client";

import { useQuery } from "@tanstack/react-query";
import { getRepositories } from "@/lib/github/repository";

export function useRepositories(accessToken: string | null) {
  return useQuery({
    queryKey: ["repositories"],
    queryFn: () => getRepositories(accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}
