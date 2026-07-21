import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { inviteUser } from '../auth/authActions'
import type { Invite, UserRole } from '../../types/database.types'

export function usePendingInvites() {
  return useQuery({
    queryKey: ['pending-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Invite[]
    },
  })
}

export function useInviteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, role, fullName }: { email: string; role: UserRole; fullName?: string }) =>
      inviteUser(email, role, fullName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] })
    },
  })
}
