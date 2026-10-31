import useRequireAuth from '@/hooks/useRequiredAuth';
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/router';
import React from 'react'

const Page = () => {
  const searchParams = useSearchParams();
  const { user, isLoading : userLoading } = useRequireAuth()
  const router = useRouter()
  const useRef = useRef<WebSocket | null>(null)
  return (
    <div>Page</div>
  )
}

export default Page