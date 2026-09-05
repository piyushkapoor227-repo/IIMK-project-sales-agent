// Uploads for the private `visit-photos` bucket. Paths are org-scoped
// (`<org_id>/<visit_id>/<file>`) to satisfy the storage RLS policy.
// Author: Piyush Kapoor.
import { supabase } from './supabaseClient'

const BUCKET = 'visit-photos'

export async function uploadVisitPhoto(
  orgId: string,
  visitId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${orgId}/${visitId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

// visit-photos is private — callers need a signed URL to render an image.
export async function signedVisitPhotoUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  return data?.signedUrl ?? null
}
