import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { inviteUser, resendInvite } from '../auth/authActions'
import type { Invite, Profile, UserRole } from '../../types/database.types'

export interface InviteWithInviter extends Invite {
  zone: string | null
  invitedBy: Pick<Profile, 'id' | 'full_name'> | null
}

export function usePendingInvites() {
  return useQuery({
    queryKey: ['pending-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invites')
        .select('*, invitedBy:profiles(id, full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as InviteWithInviter[]
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

export function useResendInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, email, role }: { id: string; email: string; role: UserRole }) =>
      resendInvite(id, email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] })
    },
  })
}
