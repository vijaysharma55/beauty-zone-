import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { SalonStaff } from '../../types/auth';
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
  Textarea,
  Toggle,
  Switch,
} from '../ui';
import { ImageUploader } from './ImageUploader';

interface Draft {
  name: string;
  roleTitle: string;
  bio: string;
  photoUrl: string;
  specialties: string;
  active: boolean;
  bookingEnabled: boolean;
}

const emptyDraft: Draft = {
  name: '',
  roleTitle: '',
  bio: '',
  photoUrl: '',
  specialties: '',
  active: true,
  bookingEnabled: true,
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const StaffPage: React.FC = () => {
  const [staff, setStaff] = useState<SalonStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalonStaff | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalonStaff | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const res = await api.get<{ staff: SalonStaff[] }>('/salon/staff');
      setStaff(res.staff);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (member: SalonStaff) => {
    setEditing(member);
    setDraft({
      name: member.name,
      roleTitle: member.roleTitle,
      bio: member.bio,
      photoUrl: member.photoUrl,
      specialties: member.specialties.join(', '),
      active: member.active,
      bookingEnabled: member.bookingEnabled !== false,
    });
    setError('');
    setModalOpen(true);
  };

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!draft.name.trim()) return setError('Please enter a name.');
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        roleTitle: draft.roleTitle.trim(),
        bio: draft.bio.trim(),
        photoUrl: draft.photoUrl,
        specialties: draft.specialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20),
        active: draft.active,
        bookingEnabled: draft.bookingEnabled,
      };
      if (editing) {
        const res = await api.patch<{ staff: SalonStaff }>(`/salon/staff/${editing.id}`, payload);
        setStaff((prev) => prev.map((s) => (s.id === editing.id ? res.staff : s)));
        setNotice('Team member updated.');
      } else {
        const res = await api.post<{ staff: SalonStaff }>('/salon/staff', payload);
        setStaff((prev) => [...prev, res.staff]);
        setNotice('Team member added.');
      }
      setModalOpen(false);
      setTimeout(() => setNotice(''), 3500);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member: SalonStaff) => {
    try {
      const res = await api.patch<{ staff: SalonStaff }>(`/salon/staff/${member.id}`, { active: !member.active });
      setStaff((prev) => prev.map((s) => (s.id === member.id ? res.staff : s)));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const toggleBooking = async (member: SalonStaff) => {
    const next = !(member.bookingEnabled !== false);
    // Optimistic update so the switch responds instantly.
    setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, bookingEnabled: next } : s)));
    try {
      const res = await api.patch<{ staff: SalonStaff }>(`/salon/staff/${member.id}`, { bookingEnabled: next });
      setStaff((prev) => prev.map((s) => (s.id === member.id ? res.staff : s)));
    } catch (err) {
      // Roll back on failure.
      setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, bookingEnabled: !next } : s)));
      setError(errorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/salon/staff/${deleteTarget.id}`);
      setStaff((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      setNotice('Team member removed.');
      setTimeout(() => setNotice(''), 3500);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your people"
        title="Team & staff"
        description="Introduce the artists and specialists clients will meet at your salon."
        actions={
          <Button variant="gold" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add team member
          </Button>
        }
      />

      {error && !modalOpen && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {loading ? (
        <Card className="p-10 text-center text-sm text-slate-500">Loading team…</Card>
      ) : staff.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No team members yet"
            description="Add stylists, therapists and artists so clients can choose who they'd like to see."
            action={
              <Button variant="gold" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add your first team member
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <Card key={member.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt={member.name} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D09A40]/15 font-serif text-lg font-bold text-[#8a641f]">
                    {initials(member.name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{member.name}</p>
                      <p className="truncate text-xs text-slate-500">{member.roleTitle || 'Team member'}</p>
                    </div>
                    <Toggle
                      checked={member.active}
                      onChange={() => toggleActive(member)}
                      label={`${member.active ? 'Hide' : 'Show'} ${member.name} on the website`}
                      hideLabel
                    />
                  </div>
                  {!member.active && (
                    <div className="mt-1">
                      <Badge tone="amber">Hidden</Badge>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                <span className="text-[11px] font-semibold text-slate-600">Online booking</span>
                <Switch
                  checked={member.bookingEnabled !== false}
                  onChange={() => toggleBooking(member)}
                  label={`${
                    member.bookingEnabled !== false ? 'Stop' : 'Start'
                  } accepting online bookings for ${member.name}`}
                  hideLabel
                />
              </div>
              {member.bio && <p className="mt-3 line-clamp-3 text-sm text-slate-600">{member.bio}</p>}
              {member.specialties.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {member.specialties.map((s) => (
                    <Badge key={s} tone="gold">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-1.5 border-t border-slate-100 pt-3">
                <Button variant="secondary" size="sm" onClick={() => openEdit(member)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setDeleteTarget(member)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit team member' : 'Add team member'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={() => save()} loading={saving}>
              {editing ? 'Save changes' : 'Add member'}
            </Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="staff-name" required>
              <Input
                id="staff-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ananya Rathore"
                required
              />
            </Field>
            <Field label="Role / title" htmlFor="staff-role">
              <Input
                id="staff-role"
                value={draft.roleTitle}
                onChange={(e) => setDraft({ ...draft, roleTitle: e.target.value })}
                placeholder="Senior Bridal Artist"
              />
            </Field>
          </div>
          <ImageUploader
            label="Photo"
            kind="staff"
            value={draft.photoUrl}
            onChange={(url) => setDraft({ ...draft, photoUrl: url })}
            hint="A friendly square portrait works best."
            previewClassName="h-20 w-20 rounded-full"
          />
          <Field label="Specialities" htmlFor="staff-specialties" hint="Separate with commas (max 20).">
            <Input
              id="staff-specialties"
              value={draft.specialties}
              onChange={(e) => setDraft({ ...draft, specialties: e.target.value })}
              placeholder="HD Bridal, Airbrush, Draping"
            />
          </Field>
          <Field label="Short bio" htmlFor="staff-bio">
            <Textarea
              id="staff-bio"
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              placeholder="Experience, signature style and certifications…"
            />
          </Field>
          <Toggle
            checked={draft.active}
            onChange={(v) => setDraft({ ...draft, active: v })}
            label="Show on public website"
          />
          <Switch
            checked={draft.bookingEnabled}
            onChange={(v) => setDraft({ ...draft, bookingEnabled: v })}
            label="Accepts online bookings"
            description="When off, clients can still see this specialist but cannot pick them for an online appointment."
          />
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove team member?"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          <strong className="text-slate-900">{deleteTarget?.name}</strong> will be removed from your team roster and
          public website.
        </p>
      </Modal>
    </div>
  );
};
