import React, { useEffect, useState } from 'react';
import { CreditCard, Save, UploadCloud, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { Alert, Button, Card, CardHeader, Field, Input, PageHeader } from '../ui';

type Settings = {
  advanceEnabled: boolean;
  advanceType: 'percent' | 'fixed';
  advancePercent: number;
  advanceFixedPaise: number;
  balancePolicy: 'at_salon' | 'online';
  disabledPolicy: 'pay_at_salon' | 'block_booking';
  gatewayEnabled: boolean;
  manualUpiEnabled: boolean;
  upiId: string;
  paymentDisplayName: string;
  upiQrUrl: string;
  methods: Record<string, boolean>;
  methodLabels?: Record<string, string>;
  channels?: { gateway: boolean; manual: boolean; gatewayMode: string; gatewayReason?: string | null; testMode: boolean };
};

const METHOD_KEYS = ['upi', 'phonepe', 'googlepay', 'paytm', 'other_upi', 'card', 'netbanking', 'wallet'];

const defaultSettings: Settings = {
  advanceEnabled: true, advanceType: 'percent', advancePercent: 25, advanceFixedPaise: 0,
  balancePolicy: 'at_salon', disabledPolicy: 'pay_at_salon', gatewayEnabled: true,
  manualUpiEnabled: false, upiId: '', paymentDisplayName: '', upiQrUrl: '',
  methods: Object.fromEntries(METHOD_KEYS.map((key) => [key, true])),
};

export const PaymentSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    api.get<{ settings: Settings }>('/salon/payment-settings')
      .then((result) => { if (active) setSettings({ ...defaultSettings, ...result.settings, methods: { ...defaultSettings.methods, ...(result.settings?.methods || {}) } }); })
      .catch((err) => { if (active) setError(errorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const patch = (key: keyof Settings, value: any) => setSettings((current) => ({ ...current, [key]: value }));
  const toggleMethod = (key: string) => setSettings((current) => ({ ...current, methods: { ...current.methods, [key]: !current.methods[key] } }));

  const uploadQr = async (file?: File) => {
    if (!file) return;
    setError(''); setNotice('');
    setUploading(true);
    try {
      const result = await api.upload(file, 'payment_qr');
      patch('upiQrUrl', result.url);
      setNotice('Salon UPI QR uploaded. Save settings to publish it to checkout.');
    } catch (err) { setError(errorMessage(err)); }
    finally { setUploading(false); }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setNotice('');
    if (settings.advanceEnabled && settings.advanceType === 'percent' && (Number(settings.advancePercent) <= 0 || Number(settings.advancePercent) > 100)) {
      setError('Advance percentage must be between 1 and 100.'); return;
    }
    if (settings.advanceEnabled && settings.advanceType === 'fixed' && Number(settings.advanceFixedPaise) < 100) {
      setError('Fixed advance must be at least ₹1.'); return;
    }
    if (settings.manualUpiEnabled && (!settings.upiId.trim() || !settings.paymentDisplayName.trim())) {
      setError('Enter the salon UPI ID and payment display name before enabling direct UPI.'); return;
    }
    setSaving(true);
    try {
      const payload = {
        advanceEnabled: settings.advanceEnabled,
        advanceType: settings.advanceType,
        advancePercent: Number(settings.advancePercent),
        advanceFixedPaise: Math.round(Number(settings.advanceFixedPaise)),
        balancePolicy: settings.balancePolicy,
        disabledPolicy: settings.disabledPolicy,
        gatewayEnabled: settings.gatewayEnabled,
        manualUpiEnabled: settings.manualUpiEnabled,
        upiId: settings.upiId.trim(),
        paymentDisplayName: settings.paymentDisplayName.trim(),
        upiQrUrl: settings.upiQrUrl.trim(),
        methods: settings.methods,
      };
      const result = await api.put<{ settings: Settings }>('/salon/payment-settings', payload);
      setSettings((current) => ({ ...current, ...result.settings, methods: { ...current.methods, ...(result.settings?.methods || {}) } }));
      setNotice('Booking and advance payment settings saved.');
    } catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading payment settings…</div>;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Booking payments" title="Advance & payment settings" description="Set the booking advance your salon requires and choose which payment methods customers can use." />
      {error && <Alert tone="error"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</Alert>}
      {notice && <Alert tone="success"><CheckCircle2 className="mr-2 inline h-4 w-4" />{notice}</Alert>}
      <form onSubmit={save} className="space-y-5">
        <Card>
          <CardHeader title="Booking advance" description="Customers must pay the configured advance before their booking is confirmed." />
          <div className="space-y-4 p-5">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
              <input type="checkbox" checked={settings.advanceEnabled} onChange={(e) => patch('advanceEnabled', e.target.checked)} />
              Require advance payment to confirm bookings
            </label>
            {settings.advanceEnabled && <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Advance type">
                  <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={settings.advanceType} onChange={(e) => patch('advanceType', e.target.value)}>
                    <option value="percent">Percentage of booking total</option>
                    <option value="fixed">Fixed amount (₹)</option>
                  </select>
                </Field>
                {settings.advanceType === 'percent'
                  ? <Field label="Advance percentage (1–100%)"><Input type="number" min="1" max="100" step="0.1" value={settings.advancePercent} onChange={(e) => patch('advancePercent', e.target.value)} /></Field>
                  : <Field label="Fixed advance amount (₹)"><Input type="number" min="1" step="1" value={Number(settings.advanceFixedPaise || 0) / 100} onChange={(e) => patch('advanceFixedPaise', Math.round(Number(e.target.value || 0) * 100))} /></Field>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Remaining balance">
                  <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={settings.balancePolicy} onChange={(e) => patch('balancePolicy', e.target.value)}>
                    <option value="at_salon">Pay at salon</option><option value="online">Pay online</option>
                  </select>
                </Field>
                <Field label="If advance is disabled">
                  <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={settings.disabledPolicy} onChange={(e) => patch('disabledPolicy', e.target.value)}>
                    <option value="pay_at_salon">Allow booking — pay at salon</option><option value="block_booking">Block online booking</option>
                  </select>
                </Field>
              </div>
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Example: ₹1,000 booking at 25% requires ₹250 now; ₹750 remains due at salon.</p>
            </>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Payment methods" description="Choose the methods displayed to customers at checkout." />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {METHOD_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                <input type="checkbox" checked={settings.methods?.[key] !== false} onChange={() => toggleMethod(key)} />
                {settings.methodLabels?.[key] || ({upi:'UPI',phonepe:'PhonePe',googlepay:'Google Pay',paytm:'Paytm',other_upi:'Other UPI apps',card:'Debit / Credit Card',netbanking:'Net Banking',wallet:'Wallets'} as Record<string,string>)[key]}
              </label>
            ))}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm sm:col-span-2">
              <input type="checkbox" checked={settings.gatewayEnabled} onChange={(e) => patch('gatewayEnabled', e.target.checked)} />
              Enable secure online gateway checkout (Razorpay when configured)
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader title="Salon UPI ID & QR" description="Direct UPI transfers stay unconfirmed until you verify the transaction in the payment verification queue." />
          <div className="space-y-4 p-5">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" checked={settings.manualUpiEnabled} onChange={(e) => patch('manualUpiEnabled', e.target.checked)} />
              Enable direct UPI / QR payment with owner verification
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="UPI ID"><Input placeholder="salonname@upi" value={settings.upiId} onChange={(e) => patch('upiId', e.target.value)} /></Field>
              <Field label="Payment display name"><Input placeholder="Salon name" value={settings.paymentDisplayName} onChange={(e) => patch('paymentDisplayName', e.target.value)} /></Field>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                <UploadCloud className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload UPI QR'}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={uploading} onChange={(e) => { void uploadQr(e.target.files?.[0]); e.currentTarget.value = ''; }} />
              </label>
              {settings.upiQrUrl && <img src={settings.upiQrUrl} alt="Salon UPI QR preview" className="h-28 w-28 rounded-lg border border-slate-200 bg-white object-contain p-2" />}
            </div>
            <p className="text-xs text-slate-500">Static QR screenshots do not prove payment. Customers submit a UPI reference; you verify it before the booking is confirmed.</p>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="gold" size="lg" loading={saving}><Save className="mr-2 h-4 w-4" /> Save payment settings</Button>
        </div>
      </form>
    </div>
  );
};
