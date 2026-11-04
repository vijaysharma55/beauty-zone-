import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Eye,
  ImagePlus,
  Images,
  Link2,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { SalonStaff, StaffWorkPhoto } from '../../types/auth';
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
import { ImageUploader, uploadOrInlineImage } from './ImageUploader';
import { StylistProfileModal, staffToProfile } from '../StylistProfileModal';

interface Draft {
  name: string;
  roleTitle: string;
  bio: string;
  photoUrl: string;
  specialties: string;
  qualifications: string;
  workPhotos: StaffWorkPhoto[];
  workPhotosConsent: boolean;
  experience: string;
  rating: string;
  reviewCount: string;
  active: boolean;
  bookingEnabled: boolean;
}

const emptyDraft: Draft = {
  name: '',
  roleTitle: '',
  bio: '',
  photoUrl: '',
  specialties: '',
  qualifications: '',
  workPhotos: [],
  workPhotosConsent: false,
  experience: '',
  rating: '',
  reviewCount: '',
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
  const [uploadingWorkPhotos, setUploadingWorkPhotos] = useState(false);
  const [workPhotoUrlInput, setWorkPhotoUrlInput] = useState('');
  const [showWorkPhotoUrl, setShowWorkPhotoUrl] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalonStaff | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewMember, setPreviewMember] = useState<SalonStaff | null>(null);
  const workPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    try {
      setError('');
      const res = await api.get<{ staff: SalonStaff[] }>('/salon/staff');
      setStaff(res.staff);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setWorkPhotoUrlInput('');
    setShowWorkPhotoUrl(false);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (member: SalonStaff) => {
    setEditing(member);
    setDraft({
      name: member.name,
      roleTitle: member.roleTitle || '',
      bio: member.bio || '',
      photoUrl: member.photoUrl || '',
      specialties: (member.specialties || []).join(', '),
      qualifications: (member.qualifications || []).join('\n'),
      workPhotos: Array.isArray(member.workPhotos) ? member.workPhotos.map((p) => ({ ...p })) : [],
      workPhotosConsent: Boolean(member.workPhotosConsent),
      experience: member.experience || '',
      rating:
        member.rating !== null && member.rating !== undefined && Number(member.rating) > 0
          ? String(member.rating)
          : '',
      reviewCount:
        member.reviewCount !== null && member.reviewCount !== undefined && Number(member.reviewCount) > 0
          ? String(member.reviewCount)
          : '',
      active: member.active,
      bookingEnabled: member.bookingEnabled !== false,
    });
    setWorkPhotoUrlInput('');
    setShowWorkPhotoUrl(false);
    setError('');
    setModalOpen(true);
  };

  const handleWorkPhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingWorkPhotos(true);
    setError('');
    try {
      const remainingSlots = Math.max(0, 20 - draft.workPhotos.length);
      const selectedFiles = Array.from(files).slice(0, remainingSlots);
      const uploaded: StaffWorkPhoto[] = [];
      for (const file of selectedFiles) {
        const url = await uploadOrInlineImage(file, 'staff');
        uploaded.push({ url, caption: '' });
      }
      setDraft((prev) => ({
        ...prev,
        workPhotos: [...prev.workPhotos, ...uploaded],
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploadingWorkPhotos(false);
      if (workPhotoInputRef.current) workPhotoInputRef.current.value = '';
    }
  };

  const addWorkPhotoByUrl = () => {
    const trimmed = workPhotoUrlInput.trim();
    if (!trimmed) return;
    if (draft.workPhotos.length >= 20) {
      setError('A staff member can have at most 20 work photos.');
      return;
    }
    setDraft((prev) => ({
      ...prev,
      workPhotos: [...prev.workPhotos, { url: trimmed, caption: '' }],
    }));
    setWorkPhotoUrlInput('');
    setShowWorkPhotoUrl(false);
  };

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!draft.name.trim()) return setError('Please enter the staff member’s full name.');
    setSaving(true);
    try {
      const parsedRating = draft.rating.trim() === '' ? null : Number(draft.rating);
      const payload = {
        name: draft.name.trim(),
        roleTitle: draft.roleTitle.trim(),
        bio: draft.bio.trim(),
        photoUrl: draft.photoUrl,
        specialties: draft.specialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 25),
        qualifications: draft.qualifications
          .split(/\r?\n/)
          .map((q) => q.trim())
          .filter(Boolean)
          .slice(0, 20),
        workPhotos: draft.workPhotos
          .filter((p) => Boolean(p.url?.trim()))
          .slice(0, 20)
          .map((p) => ({ url: p.url.trim(), caption: (p.caption || '').trim() })),
        workPhotosConsent: draft.workPhotosConsent,
        experience: draft.experience.trim(),
        rating: parsedRating !== null && Number.isFinite(parsedRating) && parsedRating > 0 ? parsedRating : null,
        reviewCount: draft.reviewCount.trim() === '' ? 0 : Math.max(0, Math.round(Number(draft.reviewCount) || 0)),
        active: draft.active,
        bookingEnabled: draft.bookingEnabled,
      };
      if (editing) {
        const res = await api.patch<{ staff: SalonStaff }>(`/salon/staff/${editing.id}`, payload);
        setStaff((prev) => prev.map((s) => (s.id === editing.id ? res.staff : s)));
        setNotice('Team member updated across your website and booking templates.');
      } else {
        const res = await api.post<{ staff: SalonStaff }>('/salon/staff', payload);
        setStaff((prev) => [...prev, res.staff]);
        setNotice('Team member added and synced to your booking templates.');
      }
      setModalOpen(false);
      setTimeout(() => setNotice(''), 4000);
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
    setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, bookingEnabled: next } : s)));
    try {
      const res = await api.patch<{ staff: SalonStaff }>(`/salon/staff/${member.id}`, { bookingEnabled: next });
      setStaff((prev) => prev.map((s) => (s.id === member.id ? res.staff : s)));
    } catch (err) {
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
      setNotice('Team member removed from your salon roster and booking templates.');
      setTimeout(() => setNotice(''), 4000);
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
        description="Manage your salon specialists, credentials and portfolio galleries. Changes sync automatically across all website and booking templates."
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
            description="Add stylists, therapists and artists so clients can view their full profiles and book with them."
            action={
              <Button variant="gold" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add your first team member
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => {
            const hasGenuineRating =
              member.rating !== null && member.rating !== undefined && Number(member.rating) > 0;
            const workPhotoCount = Array.isArray(member.workPhotos) ? member.workPhotos.length : 0;
            const qualificationCount = Array.isArray(member.qualifications) ? member.qualifications.length : 0;

            return (
              <Card key={member.id} className="flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-start gap-3">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="h-14 w-14 shrink-0 rounded-full object-cover object-top border border-[#D09A40]/30"
                      />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#D09A40]/15 font-serif text-lg font-bold text-[#8a641f]">
                        {initials(member.name)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{member.name}</p>
                          {member.roleTitle && (
                            <p className="truncate text-xs text-slate-500">{member.roleTitle}</p>
                          )}
                        </div>
                        <Toggle
                          checked={member.active}
                          onChange={() => toggleActive(member)}
                          label={`${member.active ? 'Hide' : 'Show'} ${member.name} on the website`}
                          hideLabel
                        />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {!member.active && <Badge tone="amber">Hidden</Badge>}
                        {hasGenuineRating && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#D09A40]/15 px-2 py-0.5 text-[11px] font-semibold text-[#6d4f14]">
                            <Star className="h-3 w-3 fill-[#D09A40] text-[#D09A40]" />
                            {Number(member.rating).toFixed(1)}
                            {Number(member.reviewCount) > 0 && <span>({member.reviewCount})</span>}
                          </span>
                        )}
                        {member.experience && (
                          <Badge tone="slate">{member.experience}</Badge>
                        )}
                      </div>
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

                  {member.bio && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{member.bio}</p>}

                  {member.specialties.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {member.specialties.slice(0, 4).map((s) => (
                        <Badge key={s} tone="gold">
                          {s}
                        </Badge>
                      ))}
                      {member.specialties.length > 4 && (
                        <Badge tone="slate">+{member.specialties.length - 4}</Badge>
                      )}
                    </div>
                  )}

                  {(qualificationCount > 0 || workPhotoCount > 0) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      {qualificationCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Award className="h-3.5 w-3.5 text-[#D09A40]" />
                          {qualificationCount} {qualificationCount === 1 ? 'qualification' : 'qualifications'}
                        </span>
                      )}
                      {workPhotoCount > 0 && (
                        <span
                          className={`inline-flex items-center gap-1 ${
                            member.workPhotosConsent ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          <Images className="h-3.5 w-3.5" />
                          {workPhotoCount} work {workPhotoCount === 1 ? 'photo' : 'photos'} (
                          {member.workPhotosConsent ? 'consented' : 'consent pending'})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                  <Button variant="secondary" size="sm" onClick={() => setPreviewMember(member)}>
                    <Eye className="h-3.5 w-3.5" /> View Full Profile
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(member)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setDeleteTarget(member)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit team member' : 'Add team member'}
        maxWidth="max-w-2xl"
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
            <Field label="Designation / job title" htmlFor="staff-role">
              <Input
                id="staff-role"
                value={draft.roleTitle}
                onChange={(e) => setDraft({ ...draft, roleTitle: e.target.value })}
                placeholder="Senior Bridal Artist"
              />
            </Field>
          </div>

          <ImageUploader
            label="Profile photo"
            kind="staff"
            value={draft.photoUrl}
            onChange={(url) => setDraft({ ...draft, photoUrl: url })}
            hint="Clear portrait photo (PNG, JPG, WEBP or GIF)."
            previewClassName="h-20 w-20 rounded-full"
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Professional experience" htmlFor="staff-experience" hint="e.g. 8+ Years">
              <Input
                id="staff-experience"
                value={draft.experience}
                onChange={(e) => setDraft({ ...draft, experience: e.target.value })}
                placeholder="8+ Years"
              />
            </Field>
            <Field label="Rating (optional)" htmlFor="staff-rating" hint="Genuine rating (0.1–5) only.">
              <Input
                id="staff-rating"
                type="number"
                min={0.1}
                max={5}
                step="0.1"
                value={draft.rating}
                onChange={(e) => setDraft({ ...draft, rating: e.target.value })}
                placeholder="Leave blank if unrated"
              />
            </Field>
            <Field label="Client reviews" htmlFor="staff-reviews" hint="Verified review count.">
              <Input
                id="staff-reviews"
                type="number"
                min={0}
                step="1"
                value={draft.reviewCount}
                onChange={(e) => setDraft({ ...draft, reviewCount: e.target.value })}
                placeholder="0"
              />
            </Field>
          </div>

          <Field label="Short bio" htmlFor="staff-bio">
            <Textarea
              id="staff-bio"
              rows={3}
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              placeholder="Background, signature techniques and client approach…"
            />
          </Field>

          <Field
            label="Skills & specialties"
            htmlFor="staff-specialties"
            hint="Separate skills with commas (up to 25)."
          >
            <Input
              id="staff-specialties"
              value={draft.specialties}
              onChange={(e) => setDraft({ ...draft, specialties: e.target.value })}
              placeholder="HD Bridal, Airbrush, Saree Draping, Editorial Styling"
            />
          </Field>

          <Field
            label="Qualifications & certifications"
            htmlFor="staff-qualifications"
            hint="Enter one qualification or certification per line (up to 20)."
          >
            <Textarea
              id="staff-qualifications"
              rows={3}
              value={draft.qualifications}
              onChange={(e) => setDraft({ ...draft, qualifications: e.target.value })}
              placeholder={'CIDESCO Certified Aesthetician\nLondon Academy Bridal Makeup Diploma'}
            />
          </Field>

          {/* Work Photos / Portfolio Gallery + Explicit Consent */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">Work photos / portfolio gallery</p>
                <p className="text-xs text-slate-500">
                  Showcase transformations and portfolio work (up to 20 photos).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={workPhotoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => handleWorkPhotoFiles(e.target.files)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={uploadingWorkPhotos}
                  onClick={() => workPhotoInputRef.current?.click()}
                >
                  {uploadingWorkPhotos ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  Upload work photos
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWorkPhotoUrl((prev) => !prev)}
                >
                  <Link2 className="h-3.5 w-3.5" /> Add URL
                </Button>
              </div>
            </div>

            {showWorkPhotoUrl && (
              <div className="flex gap-2">
                <Input
                  value={workPhotoUrlInput}
                  onChange={(e) => setWorkPhotoUrlInput(e.target.value)}
                  placeholder="https://example.com/portfolio-photo.jpg"
                  aria-label="Work photo URL"
                />
                <Button type="button" variant="secondary" size="sm" onClick={addWorkPhotoByUrl}>
                  Add
                </Button>
              </div>
            )}

            {draft.workPhotos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {draft.workPhotos.map((photo, index) => (
                  <div
                    key={`${photo.url}-${index}`}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || `Work photo ${index + 1}`}
                      className="aspect-[4/5] w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          workPhotos: prev.workPhotos.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="absolute right-1.5 top-1.5 rounded-lg bg-white/95 p-1.5 text-red-600 shadow transition-opacity hover:bg-red-50"
                      aria-label={`Remove work photo ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <input
                      value={photo.caption || ''}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          workPhotos: prev.workPhotos.map((item, idx) =>
                            idx === index ? { ...item, caption: e.target.value } : item
                          ),
                        }))
                      }
                      placeholder="Optional caption…"
                      className="w-full border-t border-slate-100 px-2.5 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <Switch
                checked={draft.workPhotosConsent}
                onChange={(v) => setDraft({ ...draft, workPhotosConsent: v })}
                label="Staff member consents to displaying work photos publicly"
                description="Work photos are only displayed on public staff profiles when this staff member's consent is confirmed."
              />
              {draft.workPhotos.length > 0 && !draft.workPhotosConsent && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  These work photos are saved privately and hidden from public profiles until consent is enabled.
                </p>
              )}
            </div>
          </div>

          <Toggle
            checked={draft.active}
            onChange={(v) => setDraft({ ...draft, active: v })}
            label="Show on public website"
          />
          <Switch
            checked={draft.bookingEnabled}
            onChange={(v) => setDraft({ ...draft, bookingEnabled: v })}
            label="Accepts online bookings"
            description="When off, clients can still view this specialist's profile on the website but cannot select them for online booking."
          />
        </form>
      </Modal>

      {/* Delete confirmation modal */}
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
          all booking templates.
        </p>
      </Modal>

      {/* Client-facing Full Profile preview modal (closed by default) */}
      <StylistProfileModal
        profile={previewMember ? staffToProfile(previewMember) : null}
        onClose={() => setPreviewMember(null)}
      />
    </div>
  );
};
