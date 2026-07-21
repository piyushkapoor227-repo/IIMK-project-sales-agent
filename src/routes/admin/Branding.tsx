import { useRef, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Button } from '../../components/Button'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth/AuthContext'
import { adminNav } from './nav'

export function Branding() {
  const { organization, refreshProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange() {
    const file = fileInputRef.current?.files?.[0]
    if (!file || !organization) return

    setUploading(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop()
      const path = `${organization.id}/logo.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('org-logos').getPublicUrl(path)
      const logoUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: logoUrl })
        .eq('id', organization.id)
      if (updateError) throw updateError

      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <AppShell nav={adminNav}>
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Branding</h2>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Customize the logo shown across the app for your organization.
      </p>

      <div className="mb-4 flex items-center gap-4">
        {organization?.logo_url ? (
          <img src={organization.logo_url} alt="Current logo" className="h-16 w-16 rounded-lg border border-slate-200 object-contain dark:border-slate-700" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700">
            No logo
          </div>
        )}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
            id="logo_upload"
          />
          <Button
            type="button"
            variant="outline"
            className="w-auto"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {organization?.logo_url ? 'Replace logo' : 'Upload logo'}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </AppShell>
  )
}
