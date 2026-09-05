// Organization branding — logo (drag & drop or pick) + display name + join code,
// with a live header preview. Author: Piyush Kapoor.
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { AppShell } from '../../components/AppShell'
import { Button } from '../../components/Button'
import { FormField } from '../../components/FormField'
import { Card, SectionTitle } from '../../components/primitives'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../lib/auth/AuthContext'
import { useUpdateOrg } from '../../lib/queries/useOrganization'
import { LOGO_ACCEPT, resolveLogoUrl, validateLogoFile } from '../../lib/storage'
import { adminNav } from './nav'

export function Branding() {
  const { organization } = useAuth()
  const toast = useToast()
  const update = useUpdateOrg()

  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState(organization?.name ?? '')

  // Fill the field once the organization loads (if the admin hasn't typed yet).
  useEffect(() => {
    setName((n) => (n === '' ? organization?.name ?? '' : n))
  }, [organization?.name])

  const logoUrl = organization?.logo_url ?? null
  const orgName = organization?.name ?? 'Organization'
  const nameDirty = name.trim() !== '' && name.trim() !== organization?.name

  async function handleFile(file: File | undefined) {
    if (!file || !organization) return
    const invalid = validateLogoFile(file)
    if (invalid) {
      toast.error(invalid)
      return
    }
    setUploading(true)
    try {
      const url = await resolveLogoUrl(organization.id, file)
      await update.mutateAsync({ logo_url: url })
      toast.success('Logo updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  async function removeLogo() {
    try {
      await update.mutateAsync({ logo_url: null })
      toast.success('Logo removed.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove the logo.')
    }
  }

  async function saveName(e: FormEvent) {
    e.preventDefault()
    if (!nameDirty) return
    try {
      await update.mutateAsync({ name: name.trim() })
      toast.success('Organization name updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the name.')
    }
  }

  return (
    <AppShell nav={adminNav}>
      <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">Branding</h2>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        The logo and name below appear in the app header for everyone in your organization.
      </p>

      <SectionTitle>Preview</SectionTitle>
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <HeaderPreview scheme="light" logoUrl={logoUrl} orgName={orgName} />
        <HeaderPreview scheme="dark" logoUrl={logoUrl} orgName={orgName} />
      </div>

      <SectionTitle>Logo</SectionTitle>
      <Card className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            {logoUrl ? (
              <img src={logoUrl} alt="Current logo" className="max-h-20 max-w-20 object-contain" />
            ) : (
              <span className="text-xs text-slate-400">No logo</span>
            )}
          </div>

          <div className="flex-1">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors ${
                dragging
                  ? 'border-slate-500 bg-slate-50 dark:bg-slate-800'
                  : 'border-slate-300 text-slate-500 hover:border-slate-400 dark:border-slate-600'
              }`}
            >
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {uploading ? 'Uploading…' : 'Drop an image here, or click to choose'}
              </span>
              <span className="mt-1 text-xs text-slate-400">
                PNG, JPG, SVG or WebP · under 2 MB · a square, transparent PNG works best
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={LOGO_ACCEPT}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-auto"
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {logoUrl ? 'Replace logo' : 'Upload logo'}
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-auto"
                  loading={update.isPending && !uploading}
                  onClick={removeLogo}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <SectionTitle>Organization</SectionTitle>
      <Card>
        <form onSubmit={saveName} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FormField
              label="Display name"
              id="org_name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" className="sm:w-auto" disabled={!nameDirty} loading={update.isPending}>
            Save name
          </Button>
        </form>

        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Company login code</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="rounded-md bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
              {organization?.org_code ?? '—'}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(organization?.org_code ?? '')
                toast.success('Code copied.')
              }}
              className="text-xs font-medium text-slate-500 underline hover:text-slate-800 dark:hover:text-slate-200"
            >
              Copy
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Team members enter this with their employee code on the Company login tab. It can&apos;t be changed.
          </p>
        </div>
      </Card>
    </AppShell>
  )
}

function HeaderPreview({
  scheme,
  logoUrl,
  orgName,
}: {
  scheme: 'light' | 'dark'
  logoUrl: string | null
  orgName: string
}) {
  const dark = scheme === 'dark'
  return (
    <div>
      <p className="mb-1 text-xs text-slate-400">{dark ? 'Dark' : 'Light'}</p>
      <div
        className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${
          dark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-xs font-semibold text-white">
            {orgName[0] ?? 'A'}
          </div>
        )}
        <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{orgName}</span>
      </div>
    </div>
  )
}
