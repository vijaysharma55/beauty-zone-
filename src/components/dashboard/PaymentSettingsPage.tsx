import React, { useEffect, useRef, useState } from 'react';
import { Building2, CheckCircle2, Download, ImagePlus, Landmark, Loader2, QrCode, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { getOwnerPaymentSettings, saveOwnerPaymentSettings, type OwnerPaymentSettings } from '../../lib/ownerPayments';
import { Alert, Badge, Button, Card, CardHeader, Field, Input, Modal, PageHeader, Select, Textarea, Toggle } from '../ui';

const blank: OwnerPaymentSettings = {
  advanceEnabled: true, advanceType: 'percent', advancePercent: 25, advanceFixedPaise: 0,
  balancePolicy: 'at_salon', disabledPolicy: 'pay_at_salon', gatewayEnabled: true,
  manualUpiEnabled: false, upiId: '', paymentDisplayName: '', upiQrUrl: '', bankName: '',
  paymentInstructions: '', verificationMode: 'static_qr', providerAccountId: '',
  providerOnboardingStatus: 'not_started', customized: false, updatedAt: null,
  channels: { gateway: false, manual: false, gatewayMode: 'disabled', gatewayReason: null, testMode: false },
};

export const PaymentSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<OwnerPaymentSettings>(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getOwnerPaymentSettings().then(setSettings).catch((err) => setError(errorMessage(err))).finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof OwnerPaymentSettings>(key: K, value: OwnerPaymentSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const uploadQr = async (file?: File) => {
    if (!file) return;
    setError(''); setMessage('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Choose a PNG, JPG or WEBP QR image.'); return;
    }
    if (file.size > 2 * 1024 * 1024) { setError('QR images must be 2 MB or smaller.'); return; }
    setUploading(true);
    try {
      const result = await api.upload(file, 'payment_qr');
      update('upiQrUrl', result.url);
      setMessage('QR uploaded securely. Review the preview and save your settings.');
    } catch (err) { setError(errorMessage(err)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const save = async (confirmActivation = false) => {
    if (settings.verificationMode === 'static_qr' && settings.manualUpiEnabled && !settings.upiQrUrl) {
      setError('Upload your UPI QR before activating payments.'); return;
    }
    if (settings.manualUpiEnabled && !confirmActivation && !settings.customized) {
      setConfirmOpen(true); return;
    }
    if (settings.manualUpiEnabled && !confirmActivation && !settings.channels.manual && settings.verificationMode === 'static_qr') {
      setConfirmOpen(true); return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      const next = await saveOwnerPaymentSettings({ ...settings, confirmActivation });
      setSettings(next); setConfirmOpen(false);
      setMessage(next.manualUpiEnabled || next.channels.gateway ? 'Payment settings saved and the selected channel is active.' : 'Payment settings saved. Customer online payment is inactive.');
    } catch (err) {
      setError(errorMessage(err));
      if ((err as { code?: string }).code === 'ACTIVATION_CONFIRMATION_REQUIRED') setConfirmOpen(true);
    } finally { setSaving(false); }
  };

  const deleteQr = async () => {
    setSaving(true); setError('');
    try {
      const res = await api.del<{ settings: OwnerPaymentSettings }>('/salon/payment-qr');
      setSettings(res.settings); setDeleteOpen(false); setMessage('QR deleted and static QR payments deactivated.');
    } catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-24 text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Settings" title="Payment Settings" description="Receive customer payments into your salon’s own UPI or verified provider-linked account. BeautyZone never treats a screenshot as bank confirmation."
        actions={<Badge tone={settings.channels.manual || settings.channels.gateway ? 'green' : 'slate'}>{settings.channels.manual || settings.channels.gateway ? 'Payments active' : 'Inactive'}</Badge>} />
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Collection method" description="Choose manual static QR verification or optional automatic provider verification." />
            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => update('verificationMode', 'static_qr')} className={`rounded-xl border p-4 text-left ${settings.verificationMode === 'static_qr' ? 'border-[#D09A40] bg-[#D09A40]/5' : 'border-slate-200'}`}>
                  <QrCode className="h-5 w-5 text-[#8a641f]" /><span className="mt-2 block text-sm font-semibold">Personal static QR</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">Customer pays your VPA directly. You verify each credit in your bank/UPI app.</span>
                </button>
                <button type="button" onClick={() => update('verificationMode', 'provider')} className={`rounded-xl border p-4 text-left ${settings.verificationMode === 'provider' ? 'border-[#D09A40] bg-[#D09A40]/5' : 'border-slate-200'}`}>
                  <Landmark className="h-5 w-5 text-[#8a641f]" /><span className="mt-2 block text-sm font-semibold">Provider linked account</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">Razorpay Route order transfers, server verification and signed webhooks after KYC.</span>
                </button>
              </div>

              {settings.verificationMode === 'static_qr' ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="UPI ID / VPA" required><Input value={settings.upiId} onChange={(e) => update('upiId', e.target.value.toLowerCase())} placeholder="yoursalon@okhdfcbank" autoComplete="off" /></Field>
                    <Field label="Account holder / business name" required><Input value={settings.paymentDisplayName} onChange={(e) => update('paymentDisplayName', e.target.value)} placeholder="Your Salon Pvt Ltd" /></Field>
                  </div>
                  <Field label="Bank name (optional)"><Input value={settings.bankName} onChange={(e) => update('bankName', e.target.value)} placeholder="HDFC Bank" /></Field>
                  <Field label="Payment instructions" hint="Shown at checkout. Ask for the exact amount and UTR; do not promise instant confirmation."><Textarea value={settings.paymentInstructions} onChange={(e) => update('paymentInstructions', e.target.value)} placeholder="Scan and pay the exact amount, then submit your 12-digit UTR." /></Field>
                </>
              ) : (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <Field label="Razorpay linked-account ID" hint="Created through Razorpay Route after merchant onboarding. The account must be KYC-verified before activation."><Input value={settings.providerAccountId} onChange={(e) => update('providerAccountId', e.target.value)} placeholder="acc_xxxxxxxxxxxxxx" /></Field>
                  <div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">Merchant KYC status</span><Badge tone={settings.providerOnboardingStatus === 'verified' ? 'green' : settings.providerOnboardingStatus === 'rejected' ? 'red' : 'amber'}>{settings.providerOnboardingStatus.replace('_', ' ')}</Badge></div>
                  <p className="text-xs leading-relaxed text-slate-500">Save the account ID to request review. An administrator must confirm the provider dashboard/KYC result. Funds settle under Razorpay Route’s settlement rules—not instantly and not through a static QR.</p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 p-4">
                <Toggle checked={settings.manualUpiEnabled} onChange={(checked) => {
                  if (checked && !settings.manualUpiEnabled) { update('manualUpiEnabled', true); setConfirmOpen(true); }
                  else update('manualUpiEnabled', checked);
                }} label="Payment status" description={settings.manualUpiEnabled ? 'Active — eligible customers can start new payments.' : 'Inactive — no new payments can be started on this channel.'} />
              </div>
              {settings.verificationMode === 'provider' && <Toggle checked={settings.gatewayEnabled} onChange={(v) => update('gatewayEnabled', v)} label="Enable provider checkout" description="Creates provider orders and verifies payment signatures/webhooks on the server." />}
            </div>
          </Card>

          <Card>
            <CardHeader title="Advance & balance" description="Amounts are calculated from your published service prices on the server." />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Toggle checked={settings.advanceEnabled} onChange={(v) => update('advanceEnabled', v)} label="Require an advance at booking" /></div>
              <Field label="Advance type"><Select value={settings.advanceType} onChange={(e) => update('advanceType', e.target.value as 'percent' | 'fixed')}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></Select></Field>
              {settings.advanceType === 'percent' ? <Field label="Advance percentage"><Input type="number" min="1" max="100" value={settings.advancePercent} onChange={(e) => update('advancePercent', Number(e.target.value))} /></Field> : <Field label="Fixed advance (₹)"><Input type="number" min="1" value={settings.advanceFixedPaise / 100} onChange={(e) => update('advanceFixedPaise', Math.round(Number(e.target.value) * 100))} /></Field>}
              <Field label="Remaining balance"><Select value={settings.balancePolicy} onChange={(e) => update('balancePolicy', e.target.value as 'at_salon' | 'online')}><option value="at_salon">Collect at salon</option><option value="online">Allow online collection</option></Select></Field>
            </div>
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-24">
          <CardHeader title="Your UPI QR" description="PNG, JPG or WEBP · maximum 2 MB" action={settings.upiQrUrl ? <Badge tone="green">Uploaded</Badge> : <Badge>Not uploaded</Badge>} />
          <div className="space-y-4 p-5">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="group flex min-h-72 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 hover:border-[#D09A40] disabled:opacity-60">
              {uploading ? <Loader2 className="h-8 w-8 animate-spin text-[#8a641f]" /> : settings.upiQrUrl ? <img src={settings.upiQrUrl} alt="Uploaded salon UPI QR preview" className="max-h-80 w-full object-contain" /> : <span className="text-center"><UploadCloud className="mx-auto h-10 w-10 text-slate-400" /><span className="mt-3 block text-sm font-semibold text-slate-700">Upload your existing UPI QR</span><span className="mt-1 block text-xs text-slate-500">Check that the payee name and VPA match.</span></span>}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => uploadQr(e.target.files?.[0])} />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}><ImagePlus className="h-3.5 w-3.5" />{settings.upiQrUrl ? 'Replace QR code' : 'Choose QR code'}</Button>
              {settings.upiQrUrl && <a href={settings.upiQrUrl} download="salon-upi-qr"><Button variant="ghost" size="sm"><Download className="h-3.5 w-3.5" />Download</Button></a>}
              {settings.upiQrUrl && <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteOpen(true)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>}
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><ShieldCheck className="mb-1 h-4 w-4" />Static QR payments stay pending until you match the credit in your own bank/UPI transaction history.</div>
            <Button className="w-full" loading={saving} onClick={() => save(false)}><CheckCircle2 className="h-4 w-4" />Save payment settings</Button>
          </div>
        </Card>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm payment activation" footer={<><Button variant="secondary" onClick={() => setConfirmOpen(false)}>Review again</Button><Button loading={saving} onClick={() => save(true)}>Confirm & activate</Button></>}>
        <div className="space-y-3 text-sm text-slate-600"><p>Confirm that these details belong to <strong>your salon</strong>. Customer payments will be directed to this account.</p><dl className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-4"><dt>Business</dt><dd className="font-semibold text-slate-900">{settings.paymentDisplayName || 'Not provided'}</dd></div><div className="mt-2 flex justify-between gap-4"><dt>UPI ID</dt><dd className="font-mono font-semibold text-slate-900">{settings.upiId || 'Not provided'}</dd></div><div className="mt-2 flex justify-between gap-4"><dt>Mode</dt><dd className="font-semibold capitalize text-slate-900">{settings.verificationMode.replace('_', ' ')}</dd></div></dl><p className="text-xs">Activation does not verify past payments. Every static UPI claim still requires manual bank/UPI verification.</p></div>
      </Modal>
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete UPI QR?" footer={<><Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="danger" loading={saving} onClick={deleteQr}>Delete & deactivate</Button></>}><p className="text-sm text-slate-600">The QR will be removed and static QR payments deactivated. Existing payment and audit records will be preserved.</p></Modal>
    </div>
  );
};
