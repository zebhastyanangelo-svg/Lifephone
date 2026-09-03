import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AnyRouter } from '@trpc/server'

export const trpc = createTRPCProxyClient<AnyRouter>({
  links: [
    httpBatchLink({
      url: `${import.meta.env.VITE_TRPC_URL || '/trpc'}`,
      headers: () => {
        const token = localStorage.getItem('authToken')
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
    }),
  ],
})