import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, MapPin, ReceiptText, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api';
import { formatPaise } from '../../lib/payments';
import { Alert, Badge, Button, Card } from '../ui';

type ReceiptPayload = {
  receipt: { id: string; receiptNumber: string; issuedAt: string; totalPaise: number; paidPaise: number; remainingPaise: number; currency: string };
  booking: { reference: string; fullName: string; service: string; stylist: string; date: string; time: string; amountPaise: number; advancePaise: number; paymentMethod: string; confirmedAt: string };
  salon: { name: string; logoUrl: string; phone: string; email: string; addressLine: string; city: string; state: string } | null;
  payment: { provider: string; method: string; transactionId: string; verifiedAt: string; status: string } | null;
};

export const ReceiptPage: React.FC = () => {
  const { bookingId = '' } = useParams();
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('token') || '';
  const [data, setData] = useState<ReceiptPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId || !token) { setError('This receipt link is incomplete. Ask the salon to send it again.'); setLoading(false); return; }
    api.get<ReceiptPayload>(`/public/receipts/${encodeURIComponent(bookingId)}?token=${encodeURIComponent(token)}`)
      .then((result) => {
        if (result.payment?.status !== 'paid') throw new Error('A paid receipt is available only after payment verification.');
        setData(result);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [bookingId, token]);

  const pdfUrl = `/api/public/receipts/${encodeURIComponent(bookingId)}/pdf?token=${encodeURIComponent(token)}`;
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:py-12"><div className="mx-auto max-w-3xl">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link to="/" className="text-sm font-semibold text-[#8a641f]">← BeautyZone</Link>{data && <a href={pdfUrl}><Button><Download className="h-4 w-4" />Download PDF receipt</Button></a>}</div>
    {loading && <Card className="p-12 text-center text-sm text-slate-500">Loading verified receipt…</Card>}
    {error && <Alert tone="error">{error}</Alert>}
    {data && <Card className="overflow-hidden">
      <div className="bg-[#0F172A] p-6 text-white sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div className="flex items-center gap-4">{data.salon?.logoUrl ? <img src={data.salon.logoUrl} alt="" className="h-14 w-14 rounded-xl bg-white object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#D09A40]"><ReceiptText className="h-7 w-7 text-[#0F172A]" /></span>}<div><p className="text-xs uppercase tracking-[.2em] text-[#D09A40]">Verified payment receipt</p><h1 className="mt-1 font-serif text-2xl font-bold">{data.salon?.name || 'Salon'}</h1></div></div><Badge tone="green"><CheckCircle2 className="h-3.5 w-3.5" />Paid & verified</Badge></div>{data.salon && <p className="mt-4 flex items-start gap-2 text-xs text-slate-300"><MapPin className="h-4 w-4 shrink-0" />{[data.salon.addressLine, data.salon.city, data.salon.state].filter(Boolean).join(', ')}</p>}</div>
      <div className="p-6 sm:p-8"><div className="grid gap-5 border-b border-slate-200 pb-6 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-slate-500">Billed to</p><p className="mt-1 font-semibold">{data.booking.fullName}</p><p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Booking reference</p><p className="mt-1 font-mono font-semibold">{data.booking.reference}</p></div><div className="sm:text-right"><p className="text-xs uppercase tracking-wide text-slate-500">Receipt number</p><p className="mt-1 font-mono font-semibold">{data.receipt.receiptNumber}</p><p className="mt-3 text-xs text-slate-500">Verified {new Date(data.payment?.verifiedAt || data.booking.confirmedAt).toLocaleString('en-IN')}</p></div></div>
        <div className="py-6"><p className="font-semibold">{data.booking.service}</p><p className="mt-1 text-sm text-slate-500">{data.booking.date} at {data.booking.time}{data.booking.stylist ? ` · ${data.booking.stylist}` : ''}</p><dl className="mt-5 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Service total</dt><dd>{formatPaise(data.receipt.totalPaise)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Verified payment</dt><dd className="font-semibold text-emerald-700">{formatPaise(data.receipt.paidPaise)}</dd></div><div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Remaining balance</dt><dd>{formatPaise(data.receipt.remainingPaise)}</dd></div></dl></div>
        <div className="rounded-xl bg-slate-50 p-4 text-xs"><div className="flex items-center gap-2 font-semibold text-emerald-700"><ShieldCheck className="h-4 w-4" />Payment verified by the salon/provider</div><dl className="mt-3 grid gap-3 sm:grid-cols-2"><div><dt className="text-slate-500">Transaction reference</dt><dd className="mt-1 break-all font-mono">{data.payment?.transactionId || '—'}</dd></div><div><dt className="text-slate-500">Payment method</dt><dd className="mt-1 capitalize">{data.booking.paymentMethod || data.payment?.provider}</dd></div></dl></div>
        <p className="mt-5 text-center text-xs text-slate-500">This receipt was issued only after actual payment verification. Keep the transaction reference for your records.</p>
      </div>
    </Card>}
  </div></main>;
};
