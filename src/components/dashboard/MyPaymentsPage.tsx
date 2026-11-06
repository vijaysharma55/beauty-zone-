import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, BadgeIndianRupee, CheckCircle2, Clock3, Download, Eye, FileText, Landmark, ReceiptIndianRupee, RefreshCw, Search, ShieldCheck, XCircle } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { formatPaise } from '../../lib/payments';
import { getOwnerPaymentDetails, getOwnerPayments, getOwnerPaymentSummary, paymentCsvUrl, statusLabel, type OwnerPayment, type PaymentAuditEntry, type PaymentRefund, type PaymentSummary } from '../../lib/ownerPayments';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, StatCard, Textarea, formatDate } from '../ui';

type Filters = { search: string; status: string; from: string; to: string };
const initialFilters: Filters = { search: '', status: '', from: '', to: '' };
const toneFor = (payment: OwnerPayment): 'green' | 'amber' | 'red' | 'blue' | 'slate' => {
  const s = payment.displayStatus || payment.status;
  if (s === 'verified' || s === 'paid') return 'green';
  if (s === 'refunded') return 'blue';
  if (s === 'failed' || s === 'rejected') return 'red';
  if (s.includes('pending')) return 'amber';
  return 'slate';
};

export const MyPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<OwnerPayment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [applied, setApplied] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<OwnerPayment | null>(null);
  const [audit, setAudit] = useState<PaymentAuditEntry[]>([]);
  const [refunds, setRefunds] = useState<PaymentRefund[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState('');
  const [checkedBank, setCheckedBank] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundReference, setRefundReference] = useState('');
  const [refundConfirmed, setRefundConfirmed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [rows, stats] = await Promise.all([getOwnerPayments(applied), getOwnerPaymentSummary()]);
      setPayments(rows); setSummary(stats);
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, [applied]);
  useEffect(() => { void load(); }, [load]);

  const openDetails = async (payment: OwnerPayment) => {
    setSelected(payment); setAudit([]); setRefunds([]); setNote(''); setCheckedBank(false); setDetailLoading(true);
    try {
      const res = await getOwnerPaymentDetails(payment.id);
      setSelected(res.payment); setAudit(res.audit); setRefunds(res.refunds);
    } catch (err) { setError(errorMessage(err)); }
    finally { setDetailLoading(false); }
  };

  const verify = async (action: 'verify' | 'reject') => {
    if (!selected) return;
    setActionLoading(true); setError(''); setNotice('');
    try {
      await api.post(`/salon/payments/${selected.id}/${action}`, { note });
      setNotice(action === 'verify' ? 'Payment verified. Booking confirmation and receipt were issued.' : 'Payment rejected. The customer may make a new attempt.');
      setSelected(null); await load();
    } catch (err) { setError(errorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const submitRefund = async () => {
    if (!selected) return;
    setActionLoading(true); setError('');
    try {
      const res = await api.post<{ message: string }>(`/salon/payments/${selected.id}/refund`, {
        reason: refundReason, reference: refundReference, confirmed: refundConfirmed,
      });
      setNotice(res.message); setRefundOpen(false); setSelected(null); await load();
    } catch (err) { setError(errorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const customerName = (p: OwnerPayment) => p.booking?.fullName || p.booking?.full_name || 'Customer';
  const isPending = selected?.status === 'verification_pending';
  const canRefund = selected?.status === 'paid' && !selected.refundedAt && selected.provider !== 'mock';

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Finances" title="My Payments" description="Track collections made to your salon’s own accounts, verify static UPI credits and keep a complete reconciliation trail."
        actions={<><a href={paymentCsvUrl(applied)}><Button variant="secondary" size="sm"><ArrowDownToLine className="h-4 w-4" />Export CSV</Button></a><Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" />Refresh</Button></>} />
      {error && <Alert tone="error">{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total collection" value={formatPaise(summary?.receivedPaise)} hint="Verified gross collections" icon={<BadgeIndianRupee className="h-5 w-5" />} />
        <StatCard label="Today's collection" value={formatPaise(summary?.todayCollectionPaise)} icon={<Landmark className="h-5 w-5" />} />
        <StatCard label="This month" value={formatPaise(summary?.monthCollectionPaise)} icon={<ReceiptIndianRupee className="h-5 w-5" />} />
        <StatCard label="Pending verification" value={summary?.pendingVerificationCount ?? 0} hint={formatPaise(summary?.pendingVerificationPaise)} icon={<Clock3 className="h-5 w-5" />} />
        <StatCard label="Verified payments" value={summary?.paidCount ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Rejected payments" value={summary?.failedCount ?? 0} icon={<XCircle className="h-5 w-5" />} />
        <StatCard label="Refunds" value={formatPaise(summary?.refundedPaise)} hint={`${summary?.refundCount ?? 0} transactions`} icon={<RefreshCw className="h-5 w-5" />} />
        <StatCard label="Outstanding balance" value={formatPaise(summary?.outstandingBalancePaise)} icon={<FileText className="h-5 w-5" />} />
      </div>

      <Card>
        <form className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); setApplied(filters); }}>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input aria-label="Search payments" className="pl-9" placeholder="UTR, booking, customer or service" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></div>
          <Select aria-label="Payment status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option><option value="pending_verification">Pending verification</option><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="refunded">Refunded</option><option value="created">Created</option><option value="cancelled">Cancelled</option></Select>
          <Input aria-label="From date" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <Input aria-label="To date" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          <Button type="submit">Apply</Button>
        </form>
        {loading ? <div className="flex justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-slate-400" /></div> : payments.length === 0 ? <EmptyState icon={<ReceiptIndianRupee className="h-6 w-6" />} title="No payments found" description="New customer payment attempts will appear here. Try clearing filters if you expected existing records." action={<Button variant="secondary" onClick={() => { setFilters(initialFilters); setApplied(initialFilters); }}>Clear filters</Button>} /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Transaction ID</th><th className="px-4 py-3">Customer / booking</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{payments.map((payment) => <tr key={payment.id} className="hover:bg-slate-50/70"><td className="max-w-40 px-4 py-3"><span className="block truncate font-mono font-semibold text-slate-800" title={payment.transactionId || payment.manualReference || payment.id}>{payment.transactionId || payment.manualReference || payment.id}</span></td><td className="px-4 py-3"><span className="block font-semibold text-slate-800">{customerName(payment)}</span><span className="text-slate-500">{payment.booking?.reference || payment.bookingId}</span></td><td className="max-w-44 px-4 py-3"><span className="block truncate" title={payment.booking?.service}>{payment.booking?.service || '—'}</span></td><td className="px-4 py-3 font-bold text-slate-900">{formatPaise(payment.amountPaise)}</td><td className="px-4 py-3 capitalize">{payment.provider === 'manual_upi' ? 'UPI QR' : payment.provider}</td><td className="px-4 py-3 text-slate-500">{formatDate(payment.createdAt)}</td><td className="px-4 py-3"><Badge tone={toneFor(payment)}>{statusLabel(payment)}</Badge></td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => openDetails(payment)}><Eye className="h-3.5 w-3.5" />View details</Button></td></tr>)}</tbody></table></div>
        )}
      </Card>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Transaction details" maxWidth="max-w-3xl">
        {detailLoading || !selected ? <div className="flex justify-center py-10"><RefreshCw className="h-6 w-6 animate-spin" /></div> : <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><p className="text-xs text-slate-500">{customerName(selected)} · {selected.booking?.reference}</p><p className="mt-1 text-2xl font-bold">{formatPaise(selected.amountPaise)}</p><p className="mt-1 text-xs capitalize text-slate-500">{selected.provider === 'manual_upi' ? 'Personal UPI QR' : selected.provider} · {selected.kind}</p></div><Badge tone={toneFor(selected)}>{statusLabel(selected)}</Badge></div>
          <dl className="grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2"><div><dt className="text-slate-500">Order / internal ID</dt><dd className="mt-1 break-all font-mono">{selected.orderId}</dd></div><div><dt className="text-slate-500">Bank / provider reference</dt><dd className="mt-1 break-all font-mono">{selected.transactionId || selected.manualReference || 'Not submitted'}</dd></div><div><dt className="text-slate-500">Service</dt><dd className="mt-1">{selected.booking?.service}</dd></div><div><dt className="text-slate-500">Created / verified</dt><dd className="mt-1">{formatDate(selected.createdAt)} / {selected.verifiedAt ? formatDate(selected.verifiedAt) : '—'}</dd></div></dl>
          {selected.customerNote && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Customer note: {selected.customerNote}</p>}
          {selected.hasPaymentProof && <a href={`/api/salon/payments/${selected.id}/proof`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-semibold text-[#8a641f]"><FileText className="h-4 w-4" />View private payment proof</a>}
          {isPending && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-start gap-2 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>Open your own bank/UPI app and match the amount and reference. A screenshot or “Paid” click is not bank confirmation.</p></div><Field label="Verification note" className="mt-3"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Matched ₹ amount and UTR in my bank transaction history" /></Field><label className="mt-3 flex items-start gap-2 text-xs font-medium text-amber-900"><input type="checkbox" className="mt-0.5" checked={checkedBank} onChange={(e) => setCheckedBank(e.target.checked)} />I checked my salon’s actual bank/UPI transaction history.</label><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" disabled={!checkedBank || note.trim().length < 3} loading={actionLoading} onClick={() => verify('verify')}><ShieldCheck className="h-3.5 w-3.5" />Mark verified</Button><Button size="sm" variant="danger" disabled={note.trim().length < 3} loading={actionLoading} onClick={() => verify('reject')}>Reject claim</Button></div></div>}
          {selected.receipt && <a href={`/api/salon/receipts/${selected.receipt.id}/pdf`} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm"><Download className="h-3.5 w-3.5" />Payment receipt {selected.receipt.receiptNumber}</Button></a>}
          {canRefund && <Button variant="secondary" size="sm" onClick={() => { setRefundOpen(true); setRefundReason(''); setRefundReference(''); setRefundConfirmed(false); }}>Refund payment</Button>}
          {refunds.length > 0 && <div><h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Refunds</h4>{refunds.map((r) => <div key={r.id} className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">{formatPaise(r.amountPaise)} · {r.status === 'processed' ? 'Provider processed' : 'Owner recorded'}<br />{r.reference} · {r.reason}</div>)}</div>}
          <div><h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Verification & audit history</h4>{audit.length ? <ol className="mt-3 space-y-3 border-l border-slate-200 pl-4">{audit.map((entry) => <li key={entry.id} className="relative text-xs"><span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#D09A40]" /><p className="font-semibold text-slate-800">{entry.action.replaceAll('.', ' · ')}</p><p className="text-slate-500">{formatDate(entry.createdAt)} · {entry.previousStatus || '—'} → {entry.newStatus || '—'}</p>{entry.notes && <p className="mt-1 text-slate-600">{entry.notes}</p>}</li>)}</ol> : <p className="mt-2 text-xs text-slate-500">No audit entries for this transaction.</p>}</div>
        </div>}
      </Modal>

      <Modal open={refundOpen} onClose={() => setRefundOpen(false)} title="Refund verified payment" footer={<><Button variant="secondary" onClick={() => setRefundOpen(false)}>Cancel</Button><Button loading={actionLoading} disabled={refundReason.trim().length < 3 || (selected?.provider !== 'razorpay' && (!refundConfirmed || refundReference.trim().length < 6))} onClick={submitRefund}>{selected?.provider === 'razorpay' ? 'Request provider refund' : 'Record completed refund'}</Button></>}>
        <div className="space-y-4"><Alert tone="info">{selected?.provider === 'razorpay' ? 'This calls Razorpay’s real refund API. The refund is recorded only after the provider accepts it.' : 'Send the refund from your own UPI/bank app first. This records your action; it does not move money or automatically confirm a bank refund.'}</Alert><Field label="Refund reason" required><Textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Booking cancelled by customer" /></Field>{selected?.provider !== 'razorpay' && <><Field label="Actual UPI/bank refund reference" required><Input value={refundReference} onChange={(e) => setRefundReference(e.target.value)} /></Field><label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={refundConfirmed} onChange={(e) => setRefundConfirmed(e.target.checked)} />I have already sent the full refund from my account.</label></>}</div>
      </Modal>
    </div>
  );
};
