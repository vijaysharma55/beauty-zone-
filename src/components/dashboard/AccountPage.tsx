import React, { useState } from 'react';
import { CheckCircle2, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import { Alert, Badge, Button, Card, CardHeader, Field, Input, PageHeader, formatDate } from '../ui';

export const AccountPage: React.FC = () => {
  const { user, logoutAll } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('New password must be at least 8 characters and include a letter and a number.');
      return;
    }
    if (newPassword !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/password', {
        currentPassword,
        newPassword,
      });
      setNotice('Password updated. Other devices have been signed out.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    setSigningOut(true);
    try {
      await logoutAll();
      window.location.href = '/login';
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Account & security"
        description="Manage your sign-in credentials and active sessions."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" description="Your account identity on BeautyZone." />
          <div className="space-y-4 p-5">
            <Field label="Full name" htmlFor="account-name">
              <Input id="account-name" value={user?.name || ''} disabled />
            </Field>
            <Field label="Email address" htmlFor="account-email">
              <Input id="account-email" value={user?.email || ''} disabled />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gold">Salon owner</Badge>
              <Badge tone={user?.status === 'active' ? 'green' : 'red'}>{user?.status}</Badge>
              <Badge tone="slate">
                {user?.authProvider === 'google' ? 'Google sign-in' : 'Email & password'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Member since {formatDate(user?.createdAt)} · Last sign-in {formatDate(user?.lastLoginAt)}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={user?.authProvider === 'google' && !currentPassword ? 'Set a password' : 'Change password'}
            description="Use at least 8 characters with a letter and a number."
          />
          <form onSubmit={handlePassword} className="space-y-4 p-5">
            {error && <Alert tone="error">{error}</Alert>}
            {notice && (
              <Alert tone="success">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> {notice}
                </span>
              </Alert>
            )}
            <Field label="Current password" htmlFor="current-password">
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </Field>
            <Field label="New password" htmlFor="new-password">
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm-password">
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            <Button type="submit" variant="gold" loading={saving}>
              <KeyRound className="h-4 w-4" /> Update password
            </Button>
          </form>
        </Card>
      </div>

      <Card>
        <CardHeader title="Sessions" description="Sign out of every browser and device where you're logged in." />
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-slate-800">Sessions are protected with HttpOnly cookies.</p>
              <p className="text-xs text-slate-500">
                If you suspect unusual activity, sign out everywhere and change your password.
              </p>
            </div>
          </div>
          <Button variant="danger" onClick={handleLogoutAll} loading={signingOut}>
            <LogOut className="h-4 w-4" /> Sign out everywhere
          </Button>
        </div>
      </Card>
    </div>
  );
};
