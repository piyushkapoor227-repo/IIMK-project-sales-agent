// Outlet directory — shared by reps (visit target picker) and admins (management).
// Author: Piyush Kapoor.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'
import type { Coords } from '../geo'
import type { Outlet } from '../../types/database.types'

export function useOutlets() {
  return useQuery({
    queryKey: ['outlets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      return data as Outlet[]
    },
  })
}

export interface NewOutlet {
  name: string
  address?: string
  territory?: string
  distributor_name?: string
  gps?: Coords | null
}

export function useCreateOutlet() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()

  return useMutation({
    mutationFn: async (input: NewOutlet) => {
      if (!organization) throw new Error('No organization.')
      const { data, error } = await supabase
        .from('outlets')
        .insert({
          org_id: organization.id,
          name: input.name,
          address: input.address || null,
          territory: input.territory || null,
          distributor_name: input.distributor_name || null,
          gps_lat: input.gps?.lat ?? null,
          gps_lng: input.gps?.lng ?? null,
        })
        .select('*')
        .single()
      if (error) throw error
      return data as Outlet
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] })
    },
  })
}
