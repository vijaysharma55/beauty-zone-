import React, { useEffect, useState } from 'react';
import { Activity, Save, Settings2, ShieldCheck } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { PlatformSettings } from '../../types/auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  Toggle,
} from '../ui';

interface AuditLog {
  id: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
}

const DEFAULTS: PlatformSettings = {
  platformName: 'BeautyZone',
  supportEmail: 'support@beautyzone.app',
  allowRegistrations: true,
  trialDays: 14,
  defaultPlan: 'starter',
  maintenanceMessage: '',
};

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsError, setLogsError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [settingsRes, logsRes] = await Promise.all([
          api.get<{ settings: PlatformSettings }>('/admin/settings'),
          api.get<{ logs: AuditLog[] }>('/admin/audit-logs'),
        ]);
        setSettings({ ...DEFAULTS, ...settingsRes.settings });
        setLogs(logsRes.logs);
      } catch (err) {
        setError(errorMessage(err));
        setLogsError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await api.patch<{ settings: PlatformSettings }>('/admin/settings', settings);
      setSettings({ ...DEFAULTS, ...res.settings });
      setNotice('Platform settings saved.');
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Platform settings"
        description="Control global behaviour for every salon owner on BeautyZone."
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="General" description="Branding, support and registration policy." />
          <form onSubmit={save} className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Platform name" htmlFor="platform-name" required>
                <Input
                  id="platform-name"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                  required
                />
              </Field>
              <Field label="Support email" htmlFor="support-email" required>
                <Input
                  id="support-email"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  required
                />
              </Field>
              <Field label="Default plan for new salons" htmlFor="default-plan">
                <Select
                  id="default-plan"
                  value={settings.defaultPlan}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultPlan: e.target.value as PlatformSettings['defaultPlan'] })
                  }
                >
                  <option value="trial">Trial</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="elite">Elite</option>
                </Select>
              </Field>
              <Field label="Trial length (days)" htmlFor="trial-days" hint="0 disables the trial period.">
                <Input
                  id="trial-days"
                  type="number"
                  min={0}
                  max={365}
                  value={settings.trialDays}
                  onChange={(e) => setSettings({ ...settings, trialDays: Number(e.target.value) })}
                />
              </Field>
            </div>

            <Field label="Maintenance message" htmlFor="maintenance-message" hint="Shown to owners when support needs to announce downtime.">
              <Textarea
                id="maintenance-message"
                value={settings.maintenanceMessage}
                onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                placeholder="e.g. Scheduled maintenance on Sunday 2–4 AM IST."
              />
            </Field>

            <Toggle
              checked={settings.allowRegistrations}
              onChange={(v) => setSettings({ ...settings, allowRegistrations: v })}
              label="Allow new salon owner registrations"
              description="When off, only super admins can create accounts."
            />

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button type="submit" variant="gold" loading={saving || loading}>
                <Save className="h-4 w-4" /> Save settings
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Security posture
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              Passwords hashed with scrypt and per-user salts; never stored in plain text.
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              Sessions use random 256-bit tokens in HttpOnly, SameSite cookies; only hashes stored.
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              Cross-origin write requests rejected; strict security headers on every response.
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              Salon owners are scoped to their own records on every query.
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              Failed sign-ins are rate limited and accounts lock temporarily.
            </li>
          </ul>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500">
            <Settings2 className="mb-1 inline h-3.5 w-3.5" /> Changes to these settings apply to new sign-ups and
            platform messaging immediately.
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent audit log" description="The 200 most recent sensitive actions across the platform." />
        {logsError ? (
          <p className="px-5 py-6 text-sm text-red-600">{logsError}</p>
        ) : logs.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No activity recorded yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Actor</th>
                  <th className="px-5 py-3 font-medium">Target</th>
                  <th className="px-5 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800">
                        <Activity className="h-3.5 w-3.5 text-[#D09A40]" /> {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-slate-600">{log.actorEmail || 'system'}</td>
                    <td className="px-5 py-2.5 text-xs text-slate-500">
                      {log.targetType ? (
                        <Badge tone="slate">
                          {log.targetType}
                          {log.targetId ? ` · ${log.targetId.slice(0, 8)}` : ''}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
