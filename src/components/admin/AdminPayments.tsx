import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Eye, FileText, Landmark, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { formatPaise } from '../../lib/payments';
import type { OwnerPayment, PaymentAuditEntry, PaymentRefund } from '../../lib/ownerPayments';
import { Alert, Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, StatCard, Textarea, formatDate } from '../ui';

type Configuration = { salonId: string; salonName: string; slug: string; ownerEmail: string; configured: boolean; active: boolean; verificationMode: string; upiId: string; accountHolderName: string; bankName: string; hasQr: boolean; providerAccountId: string; providerOnboardingStatus: string; updatedAt: string | null };
type AdminPayment = OwnerPayment & { salonName: string; flags: string[]; booking: OwnerPayment['booking'] & { customerName?: string } };

export const AdminPayments: React.FC = () => {
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<AdminPayment | null>(null);
  const [audit, setAudit] = useState<PaymentAuditEntry[]>([]);
  const [refunds, setRefunds] = useState<PaymentRefund[]>([]);
  const [kycTarget, setKycTarget] = useState<Configuration | null>(null);
  const [kycStatus, setKycStatus] = useState('verified');
  const [kycNote, setKycNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [configs, ledger] = await Promise.all([
        api.get<{ configurations: Configuration[] }>('/admin/payment-configurations'),
        api.get<{ payments: AdminPayment[] }>(`/admin/payments${status ? `?status=${encodeURIComponent(status)}` : ''}`),
      ]);
      setConfigurations(configs.configurations); setPayments(ledger.payments);
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  const openDetails = async (payment: AdminPayment) => {
    setSelected(payment); setAudit([]); setRefunds([]);
    try {
      const res = await api.get<{ payment: AdminPayment; audit: PaymentAuditEntry[]; refunds: PaymentRefund[] }>(`/admin/payments/details/${payment.id}`);
      setSelected(res.payment); setAudit(res.audit); setRefunds(res.refunds);
    } catch (err) { setError(errorMessage(err)); }
  };
  const reviewKyc = async () => {
    if (!kycTarget) return; setSaving(true); setError('');
    try {
      await api.patch(`/admin/payment-configurations/${kycTarget.salonId}`, { providerOnboardingStatus: kycStatus, note: kycNote });
      setNotice('Provider KYC review saved. Activation still depends on the salon’s settings.'); setKycTarget(null); await load();
    } catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  };
  const filtered = payments.filter((p) => !query || JSON.stringify([p.id, p.transactionId, p.manualReference, p.salonName, p.booking?.reference, p.booking?.customerName]).toLowerCase().includes(query.toLowerCase()));
  const pending = payments.filter((p) => p.status === 'verification_pending').length;
  const flagged = payments.filter((p) => p.flags.length > 0 && !p.refundedAt).length;

  return <div className="space-y-6">
    <PageHeader eyebrow="Platform oversight" title="Salon payment monitoring" description="Monitor tenant configurations, verification queues, suspicious records, provider onboarding and refunds. Personal UPI credits can only be verified by the salon owner." actions={<Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" />Refresh</Button>} />
    {error && <Alert tone="error">{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}
    <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Salon configurations" value={configurations.length} icon={<Landmark className="h-5 w-5" />} /><StatCard label="Pending owner verification" value={pending} icon={<ShieldCheck className="h-5 w-5" />} /><StatCard label="Suspicious flags" value={flagged} icon={<AlertTriangle className="h-5 w-5" />} /></div>

    <Card><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold">Payment configurations</h2><p className="text-xs text-slate-500">QR activity and provider/KYC status by salon</p></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Salon</th><th className="px-4 py-3">Mode / payee</th><th className="px-4 py-3">QR</th><th className="px-4 py-3">Provider account</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">KYC</th></tr></thead><tbody className="divide-y divide-slate-100">{configurations.map((c) => <tr key={c.salonId}><td className="px-4 py-3"><p className="font-semibold">{c.salonName}</p><p className="text-slate-500">{c.ownerEmail}</p></td><td className="px-4 py-3"><p className="capitalize">{c.verificationMode.replace('_', ' ')}</p><p className="font-mono text-slate-500">{c.upiId || c.accountHolderName || '—'}</p></td><td className="px-4 py-3">{c.hasQr ? 'Uploaded' : 'None'}</td><td className="px-4 py-3"><p className="font-mono">{c.providerAccountId || 'Not connected'}</p><Badge tone={c.providerOnboardingStatus === 'verified' ? 'green' : c.providerOnboardingStatus === 'rejected' ? 'red' : 'amber'}>{c.providerOnboardingStatus}</Badge></td><td className="px-4 py-3"><Badge tone={c.active ? 'green' : 'slate'}>{c.active ? 'Active' : 'Inactive'}</Badge></td><td className="px-4 py-3 text-right">{c.providerAccountId && <Button size="sm" variant="ghost" onClick={() => { setKycTarget(c); setKycNote(''); }}>Review KYC</Button>}</td></tr>)}</tbody></table></div></Card>

    <Card><div className="flex flex-wrap gap-3 border-b border-slate-100 p-4"><div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search salon, transaction or booking" value={query} onChange={(e) => setQuery(e.target.value)} /></div><Select className="w-52" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="verification_pending">Pending verification</option><option value="paid">Verified / refunded</option><option value="failed">Rejected</option></Select></div>
      {loading ? <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <EmptyState title="No payment records" description="Transactions from every salon will appear here." /> : <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Salon / transaction</th><th className="px-4 py-3">Customer / booking</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Flags</th><th className="px-4 py-3 text-right">Details</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((p) => <tr key={p.id}><td className="px-4 py-3"><p className="font-semibold">{p.salonName}</p><p className="max-w-44 truncate font-mono text-slate-500">{p.transactionId || p.manualReference || p.id}</p></td><td className="px-4 py-3"><p>{p.booking?.customerName || p.booking?.fullName}</p><p className="text-slate-500">{p.booking?.reference}</p></td><td className="px-4 py-3 font-semibold">{formatPaise(p.amountPaise)}</td><td className="px-4 py-3">{formatDate(p.createdAt)}</td><td className="px-4 py-3"><Badge tone={p.refundedAt ? 'blue' : p.status === 'paid' ? 'green' : p.status === 'failed' ? 'red' : p.status === 'verification_pending' ? 'amber' : 'slate'}>{p.refundedAt ? 'Refunded' : p.status === 'paid' ? 'Verified' : p.status === 'failed' ? 'Rejected' : p.status.replaceAll('_', ' ')}</Badge></td><td className="max-w-52 px-4 py-3">{p.flags.length ? p.flags.map((flag) => <Badge key={flag} tone="amber" className="mr-1">{flag.replaceAll('_', ' ')}</Badge>) : '—'}</td><td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => openDetails(p)}><Eye className="h-3.5 w-3.5" />View</Button></td></tr>)}</tbody></table></div>}
    </Card>

    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Admin transaction review" maxWidth="max-w-2xl">{selected && <div className="space-y-4"><Alert tone="info">Monitoring only. Administrators cannot mark a personal UPI payment as bank-confirmed.</Alert><div className="grid gap-3 text-xs sm:grid-cols-2"><p><span className="text-slate-500">Salon:</span><br /><strong>{selected.salonName}</strong></p><p><span className="text-slate-500">Amount:</span><br /><strong>{formatPaise(selected.amountPaise)}</strong></p><p className="break-all"><span className="text-slate-500">Reference:</span><br /><code>{selected.transactionId || selected.manualReference || selected.id}</code></p><p><span className="text-slate-500">Provider:</span><br />{selected.provider}</p></div>{selected.hasPaymentProof && <a href={`/api/admin/payments/${selected.id}/proof`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-semibold text-[#8a641f]"><FileText className="h-4 w-4" />Review private proof</a>}<div><h3 className="text-xs font-semibold uppercase text-slate-500">Verification history</h3><div className="mt-2 space-y-2">{audit.map((a) => <div key={a.id} className="rounded-lg bg-slate-50 p-3 text-xs"><p className="font-semibold">{a.action}</p><p className="text-slate-500">{formatDate(a.createdAt)} · {a.previousStatus} → {a.newStatus}</p><p>{a.notes}</p></div>)}</div></div>{refunds.length > 0 && <div><h3 className="text-xs font-semibold uppercase text-slate-500">Refund records</h3>{refunds.map((r) => <p key={r.id} className="mt-2 rounded-lg bg-blue-50 p-3 text-xs">{formatPaise(r.amountPaise)} · {r.status} · {r.reference} · {r.reason}</p>)}</div>}</div>}</Modal>

    <Modal open={Boolean(kycTarget)} onClose={() => setKycTarget(null)} title="Review provider KYC" footer={<><Button variant="secondary" onClick={() => setKycTarget(null)}>Cancel</Button><Button loading={saving} disabled={kycNote.trim().length < 3} onClick={reviewKyc}>Save provider review</Button></>}><div className="space-y-4"><p className="text-sm text-slate-600">Record the result shown in the actual Razorpay Route dashboard for <strong>{kycTarget?.salonName}</strong>. This does not create or bypass provider KYC.</p><Select value={kycStatus} onChange={(e) => setKycStatus(e.target.value)}><option value="verified">Verified in provider dashboard</option><option value="pending">KYC pending</option><option value="rejected">KYC rejected</option></Select><Textarea value={kycNote} onChange={(e) => setKycNote(e.target.value)} placeholder="Provider dashboard checked on …; KYC status …" /></div></Modal>
  </div>;
};
