// Replays the offline queue against the backend and keeps the UI's pending
// count in sync. Author: Piyush Kapoor.
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useToast } from '../../components/Toast'
import { allOps, queueCount, removeOp, subscribe, type QueueOp } from './queue'

async function replay(op: QueueOp): Promise<void> {
  const p = op.payload
  if (op.kind === 'stock') {
    const { error } = await supabase.from('stock_reports').insert({
      org_id: op.orgId,
      visit_id: op.visitId,
      sku: p.sku,
      quantity: p.quantity,
      price: p.price,
      competitor_price: p.competitor_price,
      ai_extracted: p.ai_extracted ?? null,
    })
    if (error) throw error
  } else if (op.kind === 'complaint') {
    const { error } = await supabase.from('complaints').insert({
      org_id: op.orgId,
      visit_id: op.visitId,
      category: p.category || null,
      description: p.description,
    })
    if (error) throw error
  } else if (op.kind === 'voice') {
    const { error } = await supabase.from('voice_notes').insert({
      org_id: op.orgId,
      visit_id: op.visitId,
      audio_transcript: p.transcript,
      structured_data: p.structured ?? null,
    })
    if (error) throw error
  } else if (op.kind === 'notes') {
    const { error } = await supabase.from('visits').update({ notes: p.notes }).eq('id', op.visitId)
    if (error) throw error
  } else if (op.kind === 'submit') {
    const { error } = await supabase
      .from('visits')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', op.visitId)
    if (error) throw error
  }
}

export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  let flushed = 0
  for (const op of allOps()) {
    try {
      await replay(op)
      removeOp(op.id)
      flushed++
    } catch {
      break // stop on the first failure; retry later
    }
  }
  return { flushed, remaining: queueCount() }
}

/** Mount once (App). Flushes on reconnect and on load. */
export function useOfflineSync() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  useEffect(() => {
    let running = false
    const run = async () => {
      if (running || !navigator.onLine || queueCount() === 0) return
      running = true
      const { flushed } = await flushQueue()
      running = false
      if (flushed > 0) {
        await queryClient.invalidateQueries()
        toast(`Synced ${flushed} offline change${flushed === 1 ? '' : 's'}.`, 'success')
      }
    }
    run()
    window.addEventListener('online', run)
    const timer = setInterval(run, 30_000)
    return () => {
      window.removeEventListener('online', run)
      clearInterval(timer)
    }
  }, [queryClient, toast])
}

export function useOfflineQueueCount(): number {
  const [count, setCount] = useState(queueCount)
  useEffect(() => subscribe(() => setCount(queueCount())), [])
  return count
}
