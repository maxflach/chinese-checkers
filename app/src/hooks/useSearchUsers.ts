import { useMutation } from '@tanstack/react-query';
import { searchUsersFn } from '@/lib/api';

export function useSearchUsers() {
  return useMutation({
    mutationFn: (searchQuery: string) => searchUsersFn({ query: searchQuery }),
  });
}
