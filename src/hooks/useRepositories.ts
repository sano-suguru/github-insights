"use client";

import { useQuery } from "@tanstack/react-query";
import { getRepositories } from "@/lib/github/repository";
import { CLIENT_CACHE } from "@/lib/cache-config";

export function useRepositories(accessToken: string | null) {
  return useQuery({
    queryKey: ["repositories"],
    queryFn: () => getRepositories(accessToken!),
    enabled: !!accessToken,
    staleTime: CLIENT_CACHE.REPOSITORIES_STALE_TIME,
  });
}
