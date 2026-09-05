// Uploads for the private `visit-photos` bucket. Paths are org-scoped
// (`<org_id>/<visit_id>/<file>`) to satisfy the storage RLS policy.
// Author: Piyush Kapoor.
import { supabase } from './supabaseClient'
import { DEMO } from './demo/store'

const BUCKET = 'visit-photos'

// ---- organization logo -------------------------------------------------

export const LOGO_MAX_BYTES = 2 * 1024 * 1024
export const LOGO_ACCEPT = 'image/png,image/jpeg,image/svg+xml,image/webp'
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']

/** Returns an error message, or null if the file is a valid logo. */
export function validateLogoFile(file: File): string | null {
  if (!LOGO_TYPES.includes(file.type)) return 'Use a PNG, JPG, SVG or WebP image.'
  if (file.size > LOGO_MAX_BYTES) return `Image must be under ${LOGO_MAX_BYTES / 1024 / 1024} MB.`
  return null
}

/** Stores the logo (data URL in demo, org-logos bucket otherwise) and returns
 *  the URL to save on the organization row. */
export async function resolveLogoUrl(orgId: string, file: File): Promise<string> {
  if (DEMO) return fileToDataURL(file)

  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `${orgId}/logo.${ext}`
  const { error } = await supabase.storage
    .from('org-logos')
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (error) throw error
  const { data } = supabase.storage.from('org-logos').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

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

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}
