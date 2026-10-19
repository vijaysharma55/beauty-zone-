import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, KeyRound, Plus, Search, ShieldCheck, UserCog, Users } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { AdminUser, Role } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  formatDate,
} from '../ui';

export const AdminUsers: React.FC = () => {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'salon_owner' as Role });
  const [creating, setCreating] = useState(false);

  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ users: AdminUser[] }>('/admin/users');
      setUsers(res.users);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, query, roleFilter]);

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 4000);
  };

  const patchUser = async (user: AdminUser, patch: Record<string, unknown>, successMessage: string) => {
    setBusyId(user.id);
    setError('');
    try {
      const res = await api.patch<{ user: AdminUser }>(`/admin/users/${user.id}`, patch);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...res.user } : u)));
      flash(successMessage);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.post('/admin/users', createForm);
      setCreateOpen(false);
      setCreateForm({ name: '', email: '', password: '', role: 'salon_owner' });
      await load();
      flash('Account created.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    setError('');
    try {
      await api.post(`/admin/users/${resetTarget.id}/reset-password`, { password: resetPassword });
      setResetTarget(null);
      setResetPassword('');
      flash('Password reset. The user has been signed out of all sessions.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="User management"
        title="Users & roles"
        description="Provision salon owner accounts, change roles, reset credentials and disable access."
        actions={
          <Button variant="gold" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New account
          </Button>
        }
      />

      {error && !createOpen && !resetTarget && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="h-4 w-4 text-[#D09A40]" /> {users.length} account{users.length === 1 ? '' : 's'}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email…"
                className="w-56 pl-9"
                aria-label="Search users"
              />
            </div>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | Role)}
              className="w-40"
              aria-label="Filter by role"
            >
              <option value="all">All roles</option>
              <option value="salon_owner">Salon owners</option>
              <option value="super_admin">Super admins</option>
            </Select>
          </div>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Loading accounts…</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title="No accounts match" description="Try a different search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Salon</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => {
                  const isSelf = user.id === me?.id;
                  return (
                    <tr key={user.id} className="align-top hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">
                          {user.name} {isSelf && <span className="text-xs font-normal text-slate-400">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {user.authProvider === 'google' ? 'Google sign-in' : 'Email & password'}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <Select
                          value={user.role}
                          disabled={busyId === user.id || isSelf}
                          onChange={(e) => patchUser(user, { role: e.target.value }, 'Role updated.')}
                          className="w-36 py-1.5 text-xs"
                          aria-label={`Role for ${user.email}`}
                        >
                          <option value="salon_owner">Salon owner</option>
                          <option value="super_admin">Super admin</option>
                        </Select>
                      </td>
                      <td className="px-5 py-3">
                        {user.salon ? (
                          <div>
                            <p className="text-xs font-medium text-slate-800">{user.salon.name}</p>
                            <p className="text-[11px] text-slate-500">/salon/{user.salon.slug}</p>
                            <div className="mt-1 flex items-center gap-1.5">
                              {user.salon.published ? <Badge tone="green">Live</Badge> : <Badge tone="amber">Draft</Badge>}
                              {user.salon.published && (
                                <a
                                  href={`/salon/${user.salon.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#8a641f] hover:underline"
                                  aria-label="Open salon website"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No salon yet</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">{formatDate(user.createdAt)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={user.status === 'active' ? 'green' : 'red'}>
                          {user.status === 'active' ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResetTarget(user)}
                            title="Reset password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant={user.status === 'active' ? 'ghost' : 'secondary'}
                            size="sm"
                            disabled={busyId === user.id || isSelf}
                            onClick={() =>
                              patchUser(
                                user,
                                { status: user.status === 'active' ? 'disabled' : 'active' },
                                user.status === 'active' ? 'Account disabled.' : 'Account re-enabled.'
                              )
                            }
                          >
                            {user.status === 'active' ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create account"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={createUser} loading={creating}>
              Create account
            </Button>
          </>
        }
      >
        <form onSubmit={createUser} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Full name" htmlFor="new-name" required>
            <Input
              id="new-name"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Email" htmlFor="new-email" required>
            <Input
              id="new-email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Temporary password" htmlFor="new-password" required hint="Min 8 chars, letter + number.">
              <Input
                id="new-password"
                type="text"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required
              />
            </Field>
            <Field label="Role" htmlFor="new-role" required>
              <Select
                id="new-role"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })}
              >
                <option value="salon_owner">Salon owner</option>
                <option value="super_admin">Super admin</option>
              </Select>
            </Field>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <UserCog className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            Salon owners will be guided through onboarding on their first sign-in. Super admins get full platform
            access.
          </div>
        </form>
      </Modal>

      {/* Reset password modal */}
      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset password"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitReset} loading={resetting}>
              Reset password
            </Button>
          </>
        }
      >
        <form onSubmit={submitReset} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Resetting <strong>{resetTarget?.email}</strong> will sign them out of all active sessions. Share the new
            password with them securely.
          </div>
          <Field label="New password" htmlFor="reset-password" required>
            <Input
              id="reset-password"
              type="text"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Temporary password"
              required
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
};
