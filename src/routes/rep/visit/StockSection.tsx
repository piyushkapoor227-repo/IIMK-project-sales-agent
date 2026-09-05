import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/Button'
import { FormField } from '../../../components/FormField'
import { Card, EmptyState, SectionTitle } from '../../../components/primitives'
import {
  useAddStockReport,
  useDeleteStockReport,
  useStockReports,
} from '../../../lib/queries/useVisits'

const EMPTY = { sku: '', quantity: '', price: '', competitor_price: '' }

export function StockSection({ visitId, readOnly }: { visitId: string; readOnly: boolean }) {
  const { data: rows } = useStockReports(visitId)
  const add = useAddStockReport(visitId)
  const remove = useDeleteStockReport(visitId)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await add.mutateAsync({
        sku: form.sku.trim(),
        quantity: form.quantity ? Number(form.quantity) : null,
        price: form.price ? Number(form.price) : null,
        competitor_price: form.competitor_price ? Number(form.competitor_price) : null,
      })
      setForm(EMPTY)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the row.')
    }
  }

  return (
    <section className="mb-8">
      <SectionTitle>Stock &amp; pricing</SectionTitle>

      {rows?.length ? (
        <div className="mb-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3">SKU</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Price</th>
                <th className="py-2 pr-3">Competitor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="py-2 pr-3 font-medium text-slate-900 dark:text-white">{r.sku}</td>
                  <td className="py-2 pr-3">{r.quantity ?? '—'}</td>
                  <td className="py-2 pr-3">{r.price != null ? `₹${r.price}` : '—'}</td>
                  <td className="py-2 pr-3">{r.competitor_price != null ? `₹${r.competitor_price}` : '—'}</td>
                  <td className="py-2 text-right">
                    {!readOnly && (
                      <button
                        onClick={() => remove.mutate(r.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>No stock rows captured.</EmptyState>
      )}

      {!readOnly && (
        <Card className="mt-3">
          <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="SKU"
              id="stock_sku"
              required
              value={form.sku}
              onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))}
            />
            <FormField
              label="Quantity on shelf"
              id="stock_qty"
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))}
            />
            <FormField
              label="Our price (₹)"
              id="stock_price"
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
            />
            <FormField
              label="Competitor price (₹)"
              id="stock_comp"
              type="number"
              min={0}
              step="0.01"
              value={form.competitor_price}
              onChange={(e) => setForm((s) => ({ ...s, competitor_price: e.target.value }))}
            />
            <div className="sm:col-span-2">
              <Button type="submit" loading={add.isPending}>
                Add stock row
              </Button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </Card>
      )}
    </section>
  )
}
