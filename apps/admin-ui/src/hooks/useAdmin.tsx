import { useQuery } from '@tanstack/react-query';
import { getAdminSession } from '@/utils/adminService';

export default function useAdmin() {
  const {
    data: admin,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-session'],
    queryFn: getAdminSession,
    retry: false,
    staleTime: 60_000,
  });

  return { admin, isLoading, isError };
}