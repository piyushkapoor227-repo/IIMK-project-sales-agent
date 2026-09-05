// Renders an image stored in the private `visit-photos` bucket via a short-lived
// signed URL. Author: Piyush Kapoor.
import { useEffect, useState } from 'react'
import { signedVisitPhotoUrl } from '../lib/storage'

export function SignedImage({
  path,
  alt,
  className = '',
}: {
  path: string
  alt: string
  className?: string
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    signedVisitPhotoUrl(path)
      .then((u) => active && setUrl(u))
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [path])

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-xs text-slate-400 dark:bg-slate-800 ${className}`}>
        Image unavailable
      </div>
    )
  }
  if (!url) {
    return <div className={`animate-pulse bg-slate-100 dark:bg-slate-800 ${className}`} />
  }
  return <img src={url} alt={alt} className={className} />
}
