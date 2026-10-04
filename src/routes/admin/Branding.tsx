import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { AppShell } from '../../components/AppShell'
import { Button } from '../../components/Button'
import { FormField } from '../../components/FormField'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth/AuthContext'
import { MOCK_AUTH } from '../../lib/auth/mockAuth'
import { updateOrgLogo, updateOrgName } from '../../lib/auth/mockOrgStore'
import { adminNav } from './nav'

const MAX_LOGO_BYTES = 2 * 1024 * 1024

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}

export function Branding() {
  const { organization, refreshProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState(organization?.name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file || !organization) return
    setError(null)

    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) {
      setError('Please choose a PNG, JPG, SVG or WebP image.')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError('Logo must be under 2 MB.')
      return
    }

    setUploading(true)
    try {
      if (MOCK_AUTH) {
        const dataUrl = await readFileAsDataUrl(file)
        updateOrgLogo(organization.id, dataUrl)
        return
      }

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

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  async function handleSaveName(e: FormEvent) {
    e.preventDefault()
    if (!organization || !nameDraft.trim()) return
    setSavingName(true)
    try {
      if (MOCK_AUTH) {
        updateOrgName(organization.id, nameDraft.trim())
      }
    } finally {
      setSavingName(false)
    }
  }

  function handleCopyCode() {
    if (!organization) return
    navigator.clipboard?.writeText(organization.org_code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <AppShell nav={adminNav}>
      <h2 className="mb-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Branding</h2>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        The logo and name below appear in the app header for everyone in your organization.
      </p>

      <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">Preview</h3>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Light</p>
          <div className="flex items-center gap-2 rounded-control border border-slate-200 bg-white px-3 py-2.5">
            <LogoOrInitial organization={organization} />
            <span className="text-sm font-semibold text-slate-900">{organization?.name}</span>
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Dark</p>
          <div className="flex items-center gap-2 rounded-control border border-slate-800 bg-slate-950 px-3 py-2.5">
            <LogoOrInitial organization={organization} />
            <span className="text-sm font-semibold text-white">{organization?.name}</span>
          </div>
        </div>
      </div>

      <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">Logo</h3>
      <div className="mb-6 flex flex-col gap-3 rounded-control border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-control border border-slate-200 dark:border-slate-700">
          {organization?.logo_url ? (
            <img src={organization.logo_url} alt="Current logo" className="h-full w-full rounded-control object-contain" />
          ) : (
            <span className="text-xs text-slate-400">No logo</span>
          )}
        </div>
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/svg+xml, image/webp"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
            id="logo_upload"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`mb-2 cursor-pointer rounded-control border border-dashed px-4 py-6 text-center transition-colors ${
              dragOver
                ? 'border-brand bg-brand/5'
                : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600'
            }`}
          >
            <p className="text-sm font-medium text-slate-900 dark:text-white">Drop an image here, or click to choose</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              PNG, JPG, SVG or WebP &middot; under 2 MB &middot; a square, transparent PNG works best
            </p>
          </div>
          <Button type="button" variant="outline" className="w-auto" loading={uploading} onClick={() => fileInputRef.current?.click()}>
            {organization?.logo_url ? 'Replace logo' : 'Upload logo'}
          </Button>
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>

      <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">Organization</h3>
      <div className="rounded-control border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleSaveName} className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FormField label="Display name" id="org_display_name" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
          </div>
          <Button type="submit" variant="primary" className="w-auto" loading={savingName} disabled={!nameDraft.trim()}>
            Save name
          </Button>
        </form>

        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Company login code
        </p>
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-100 px-2 py-1 font-mono text-sm text-slate-900 dark:bg-slate-800 dark:text-white">
            {organization?.org_code}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="text-sm font-medium text-brand hover:underline"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Team members enter this with their employee code on the Company login tab. It can&apos;t be changed.
        </p>
      </div>
    </AppShell>
  )
}

function LogoOrInitial({ organization }: { organization: { logo_url: string | null; name: string } | null }) {
  if (organization?.logo_url) {
    return <img src={organization.logo_url} alt={organization.name} className="h-6 w-6 rounded object-contain" />
  }
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded bg-brand text-[10px] font-semibold text-white">
      {organization?.name?.[0] ?? 'A'}
    </div>
  )
}
