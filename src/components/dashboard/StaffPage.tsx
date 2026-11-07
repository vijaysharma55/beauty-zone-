import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  ImagePlus,
  Images,
  KeyRound,
  Link2,
  Loader2,
  Pencil,
  Percent,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { SalonService, SalonStaff, StaffAppAccessRole, StaffPrimaryRole, StaffWorkPhoto } from '../../types/auth';
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
  Textarea,
  Toggle,
  Switch,
  cn,
} from '../ui';
import { ImageUploader, uploadOrInlineImage } from './ImageUploader';
import { StylistProfileModal, staffToProfile } from '../StylistProfileModal';
import type { StaffAvailability } from '../../types/auth';
import {
  STAFF_APP_ACCESS_ROLES,
  STAFF_PRIMARY_ROLES,
  WEEKDAYS,
  defaultWeeklySchedule,
  describeWeeklySchedule,
  getAppAccessRoleLabel,
  maskMobileNumber,
  normalizeCommissionPercent,
  normalizeIndianMobile,
  normalizeSkillList,
  normalizeWeeklySchedule,
  suggestedAppAccessRole,
  type StaffScheduleDay,
} from '../../lib/staffRoles.js';
import {
  STAFF_AVAILABILITY_OPTIONS,
  getAvailabilityMeta,
  getStaffAvailability,
} from '../../lib/staffAvailability';
import {
  MobileNumberField,
  ServiceAssignmentPicker,
  SkillTagSelector,
  WeeklyScheduleEditor,
} from './StaffFormFields';

interface Draft {
  name: string;
  roleTitle: string;
  primaryRole: StaffPrimaryRole | '';
  appAccessRole: StaffAppAccessRole;
  commissionPercent: string;
  mobileNumber: string;
  hideMobileNumber: boolean;
  bio: string;
  photoUrl: string;
  specialties: string[];
  qualifications: string;
  serviceIds: string[];
  weeklySchedule: StaffScheduleDay[];
  workPhotos: StaffWorkPhoto[];
  workPhotosConsent: boolean;
  experience: string;
  rating: string;
  reviewCount: string;
  active: boolean;
  bookingEnabled: boolean;
  availabilityStatus: StaffAvailability;
}

const emptyDraft = (): Draft => ({
  name: '',
  roleTitle: '',
  primaryRole: '',
  appAccessRole: 'service_provider',
  commissionPercent: '15',
  mobileNumber: '',
  hideMobileNumber: false,
  bio: '',
  photoUrl: '',
  specialties: [],
  qualifications: '',
  serviceIds: [],
  weeklySchedule: defaultWeeklySchedule(),
  workPhotos: [],
  workPhotosConsent: false,
  experience: '',
  rating: '',
  reviewCount: '',
  active: true,
  bookingEnabled: true,
  availabilityStatus: 'available',
});

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** Section header used inside the Add/Edit staff modal. */
const FormSection: React.FC<{
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ step, title, description, icon, children }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="mb-3 flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D09A40]/15 text-[#8a641f]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a641f]">Step {step}</p>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

export const StaffPage: React.FC = () => {
  const [staff, setStaff] = useState<SalonStaff[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
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
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | StaffAvailability>('all');
  const workPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    try {
      setError('');
      const [staffRes, serviceRes] = await Promise.all([
        api.get<{ staff: SalonStaff[] }>('/salon/staff'),
        api.get<{ services: SalonService[] }>('/salon/services').catch(() => ({ services: [] as SalonService[] })),
      ]);
      setStaff(staffRes.staff);
      setServices(serviceRes.services);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const serviceNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const service of services) map.set(service.id, service.name);
    return map;
  }, [services]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setWorkPhotoUrlInput('');
    setShowWorkPhotoUrl(false);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (member: SalonStaff) => {
    setEditing(member);
    setDraft({
      name: member.name,
      roleTitle: member.roleTitle || '',
      primaryRole: (member.primaryRole || '') as StaffPrimaryRole | '',
      appAccessRole: (member.appAccessRole || 'service_provider') as StaffAppAccessRole,
      commissionPercent: String(member.commissionPercent ?? 15),
      mobileNumber: member.mobileNumber || '',
      hideMobileNumber: Boolean(member.hideMobileNumber),
      bio: member.bio || '',
      photoUrl: member.photoUrl || '',
      specialties: normalizeSkillList(member.specialties || []),
      qualifications: (member.qualifications || []).join('\n'),
      serviceIds: Array.isArray(member.serviceIds) ? [...member.serviceIds] : [],
      weeklySchedule: Array.isArray(member.weeklySchedule) && member.weeklySchedule.length
        ? normalizeWeeklySchedule(member.weeklySchedule).schedule
        : defaultWeeklySchedule(),
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
      availabilityStatus: getStaffAvailability(member),
    });
    setWorkPhotoUrlInput('');
    setShowWorkPhotoUrl(false);
    setFormError('');
    setModalOpen(true);
  };

  const handleWorkPhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingWorkPhotos(true);
    setFormError('');
    try {
      const remainingSlots = Math.max(0, 20 - draft.workPhotos.length);
      const selectedFiles = Array.from(files).slice(0, remainingSlots);
      const uploaded: StaffWorkPhoto[] = [];
      for (const file of selectedFiles) {
        const url = await uploadOrInlineImage(file, 'staff');
        uploaded.push({ url, caption: '' });
      }
      setDraft((prev) => ({ ...prev, workPhotos: [...prev.workPhotos, ...uploaded] }));
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setUploadingWorkPhotos(false);
      if (workPhotoInputRef.current) workPhotoInputRef.current.value = '';
    }
  };

  const addWorkPhotoByUrl = () => {
    const trimmed = workPhotoUrlInput.trim();
    if (!trimmed) return;
    if (draft.workPhotos.length >= 20) {
      setFormError('A staff member can have at most 20 work photos.');
      return;
    }
    setDraft((prev) => ({ ...prev, workPhotos: [...prev.workPhotos, { url: trimmed, caption: '' }] }));
    setWorkPhotoUrlInput('');
    setShowWorkPhotoUrl(false);
  };

  /** Client-side mirror of the API rules — fail fast with a clear message. */
  const validateDraft = (): string | null => {
    if (!draft.name.trim()) return 'Please enter the staff member’s full name.';
    if (!draft.primaryRole) return 'Please choose a primary role for this team member.';
    const commission = normalizeCommissionPercent(draft.commissionPercent);
    if (!commission.ok) return commission.error;
    if (draft.mobileNumber.trim()) {
      const mobile = normalizeIndianMobile(draft.mobileNumber);
      if (!mobile.ok) return mobile.error;
    }
    const schedule = normalizeWeeklySchedule(draft.weeklySchedule);
    if (schedule.errors.length > 0) return schedule.errors[0];
    if (schedule.schedule.every((entry) => entry.closed)) {
      return 'Set at least one working day in the weekly schedule.';
    }
    return null;
  };

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError('');
    const validationError = validateDraft();
    if (validationError) return setFormError(validationError);
    setSaving(true);
    try {
      const parsedRating = draft.rating.trim() === '' ? null : Number(draft.rating);
      const commission = normalizeCommissionPercent(draft.commissionPercent);
      const mobile = normalizeIndianMobile(draft.mobileNumber);
      const schedule = normalizeWeeklySchedule(draft.weeklySchedule).schedule;
      const primaryRole = draft.primaryRole as StaffPrimaryRole;
      const selectedRoleLabel = STAFF_PRIMARY_ROLES.find((role) => role.value === primaryRole)?.label || '';
      const payload = {
        name: draft.name.trim(),
        // Free-text title wins when the owner typed a custom designation,
        // otherwise the canonical primary-role label is stored for templates.
        roleTitle: draft.roleTitle.trim() || selectedRoleLabel,
        primaryRole,
        appAccessRole: draft.appAccessRole,
        commissionPercent: commission.value,
        mobileNumber: mobile.value,
        hideMobileNumber: draft.hideMobileNumber,
        bio: draft.bio.trim(),
        photoUrl: draft.photoUrl,
        specialties: normalizeSkillList(draft.specialties),
        qualifications: draft.qualifications
          .split(/\r?\n/)
          .map((q) => q.trim())
          .filter(Boolean)
          .slice(0, 20),
        serviceIds: draft.serviceIds,
        weeklySchedule: schedule,
        workPhotos: draft.workPhotos
          .filter((p) => Boolean(p.url?.trim()))
          .slice(0, 20)
          .map((p) => ({ url: p.url.trim(), caption: (p.caption || '').trim() })),
        workPhotosConsent: draft.workPhotosConsent,
        experience: draft.experience.trim(),
        rating:
          parsedRating !== null && Number.isFinite(parsedRating) && parsedRating > 0 ? parsedRating : null,
        reviewCount:
          draft.reviewCount.trim() === '' ? 0 : Math.max(0, Math.round(Number(draft.reviewCount) || 0)),
        active: draft.active,
        bookingEnabled: draft.bookingEnabled,
        availabilityStatus: draft.availabilityStatus,
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
      setFormError(errorMessage(err));
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

  const changeAvailability = async (member: SalonStaff, next: StaffAvailability) => {
    const previous = getStaffAvailability(member);
    if (next === previous) return;
    setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, availabilityStatus: next } : s)));
    try {
      const res = await api.patch<{ staff: SalonStaff }>(`/salon/staff/${member.id}`, { availabilityStatus: next });
      setStaff((prev) => prev.map((s) => (s.id === member.id ? res.staff : s)));
    } catch (err) {
      setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, availabilityStatus: previous } : s)));
      setError(errorMessage(err));
    }
  };

  const availabilityCounts = STAFF_AVAILABILITY_OPTIONS.map((option) => ({
    ...option,
    count: staff.filter((s) => getStaffAvailability(s) === option.value).length,
  }));
  const visibleStaff =
    availabilityFilter === 'all' ? staff : staff.filter((s) => getStaffAvailability(s) === availabilityFilter);

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

  /* Per-day validation messages for the weekly roster editor. Errors from
     `normalizeWeeklySchedule` start with the human day label, so match on it. */
  const scheduleErrorMap = useMemo(() => {
    const { errors } = normalizeWeeklySchedule(draft.weeklySchedule);
    const map: Record<string, string> = {};
    for (const message of errors) {
      const match = WEEKDAYS.find(({ label }) => message.startsWith(label));
      if (match) map[match.id] = message;
    }
    return map;
  }, [draft.weeklySchedule]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your people"
        title="Staff Management"
        description="Add, edit or remove your salon specialists, map them to services, set their roles, commission, weekly roster and skills. Changes sync automatically across all website and booking templates."
        actions={
          <Button variant="gold" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add New Staff Member
          </Button>
        }
      />

      {error && !modalOpen && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {!loading && staff.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter staff by availability">
          <Button
            variant={availabilityFilter === 'all' ? 'gold' : 'secondary'}
            size="sm"
            onClick={() => setAvailabilityFilter('all')}
          >
            All ({staff.length})
          </Button>
          {availabilityCounts.map((option) => (
            <Button
              key={option.value}
              variant={availabilityFilter === option.value ? 'gold' : 'secondary'}
              size="sm"
              onClick={() => setAvailabilityFilter(option.value)}
            >
              {option.label} ({option.count})
            </Button>
          ))}
        </div>
      )}

      {loading ? (
        <Card className="p-10 text-center text-sm text-slate-500">Loading team…</Card>
      ) : staff.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No team members yet"
            description="Add stylists, therapists and artists with their roles, services, weekly roster and skills so clients can view their full profiles and book with them."
            action={
              <Button variant="gold" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add your first team member
              </Button>
            }
          />
        </Card>
      ) : visibleStaff.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          No team members are marked “
          {getAvailabilityMeta(availabilityFilter === 'all' ? 'available' : availabilityFilter).label}” right now.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleStaff.map((member) => {
            const availability = getStaffAvailability(member);
            const availabilityMeta = getAvailabilityMeta(availability);
            const hasGenuineRating =
              member.rating !== null && member.rating !== undefined && Number(member.rating) > 0;
            const workPhotoCount = Array.isArray(member.workPhotos) ? member.workPhotos.length : 0;
            const qualificationCount = Array.isArray(member.qualifications) ? member.qualifications.length : 0;
            const skillCount = Array.isArray(member.specialties) ? member.specialties.length : 0;
            const mappedServiceCount = Array.isArray(member.serviceIds) ? member.serviceIds.length : 0;
            const primaryRoleLabel =
              STAFF_PRIMARY_ROLES.find((role) => role.value === member.primaryRole)?.label || '';
            const scheduleLabel = describeWeeklySchedule(member.weeklySchedule);
            const mobileHidden = Boolean(member.hideMobileNumber);
            const mobileDisplay = member.mobileNumber
              ? mobileHidden
                ? maskMobileNumber(member.mobileNumber)
                : member.mobileNumber
              : '';

            return (
              <Card key={member.id} className="flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-start gap-3">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="h-14 w-14 shrink-0 rounded-full border border-[#D09A40]/30 object-cover object-top"
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
                          <p className="truncate text-xs text-slate-500">
                            {member.roleTitle || primaryRoleLabel || 'No designation'}
                          </p>
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
                        <Badge tone={availabilityMeta.tone}>{availabilityMeta.label}</Badge>
                        {hasGenuineRating && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#D09A40]/15 px-2 py-0.5 text-[11px] font-semibold text-[#6d4f14]">
                            <Star className="h-3 w-3 fill-[#D09A40] text-[#D09A40]" />
                            {Number(member.rating).toFixed(1)}
                            {Number(member.reviewCount) > 0 && <span>({member.reviewCount})</span>}
                          </span>
                        )}
                        {member.experience && <Badge tone="slate">{member.experience}</Badge>}
                      </div>
                    </div>
                  </div>

                  {/* Roles · app access · commission · contact */}
                  <dl className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-[11px]">
                    <div className="min-w-0">
                      <dt className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-500">
                        <Sparkles className="h-3 w-3" /> Role
                      </dt>
                      <dd className="mt-0.5 truncate font-medium text-slate-800">
                        {primaryRoleLabel || '—'}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-500">
                        <KeyRound className="h-3 w-3" /> App access
                      </dt>
                      <dd className="mt-0.5 truncate font-medium text-slate-800">
                        {getAppAccessRoleLabel(member.appAccessRole || 'service_provider') || '—'}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-500">
                        <Percent className="h-3 w-3" /> Commission
                      </dt>
                      <dd className="mt-0.5 font-medium text-slate-800">
                        {Number(member.commissionPercent ?? 15)}%
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-500">
                        <Phone className="h-3 w-3" /> Mobile
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-1 truncate font-medium text-slate-800">
                        {mobileDisplay || '—'}
                        {mobileHidden && mobileDisplay && (
                          <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-600" aria-label="Hidden from staff list" />
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
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

                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                    <label htmlFor={`availability-${member.id}`} className="text-[11px] font-semibold text-slate-600">
                      Availability
                    </label>
                    <Select
                      id={`availability-${member.id}`}
                      value={availability}
                      onChange={(e) => changeAvailability(member, e.target.value as StaffAvailability)}
                      className="!w-auto !py-1 text-xs"
                      aria-label={`Availability status for ${member.name}`}
                    >
                      {STAFF_AVAILABILITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="mt-2 space-y-1 rounded-lg border border-slate-100 px-2.5 py-2 text-[11px] text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 shrink-0 text-[#D09A40]" />
                      <span className="truncate" title={scheduleLabel}>
                        {scheduleLabel}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Tag className="h-3 w-3 shrink-0 text-[#D09A40]" />
                      {mappedServiceCount === 0
                        ? 'All salon services'
                        : `${mappedServiceCount} assigned ${mappedServiceCount === 1 ? 'service' : 'services'}`}
                      {mappedServiceCount > 0 && member.serviceIds && (
                        <span className="truncate text-slate-400" title={member.serviceIds.map((id) => serviceNameById.get(id) || '').filter(Boolean).join(', ')}>
                          · {member.serviceIds.map((id) => serviceNameById.get(id)).filter(Boolean).slice(0, 2).join(', ')}
                          {mappedServiceCount > 2 ? ` +${mappedServiceCount - 2}` : ''}
                        </span>
                      )}
                    </p>
                  </div>

                  {member.bio && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{member.bio}</p>}

                  {skillCount > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {member.specialties.slice(0, 4).map((s) => (
                        <Badge key={s} tone="gold">
                          {s}
                        </Badge>
                      ))}
                      {skillCount > 4 && <Badge tone="slate">+{skillCount - 4}</Badge>}
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

      {/* ---------------------------------------------------------------- */}
      {/* Add / Edit Staff Modal                                            */}
      {/* ---------------------------------------------------------------- */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit team member' : 'Add New Staff Member'}
        maxWidth="max-w-3xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={() => save()} loading={saving}>
              {editing ? 'Save changes' : 'Add staff member'}
            </Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}

          {/* 1 — Basic information & identity */}
          <FormSection
            step={1}
            title="Basic information & identity"
            description="Name, photo, contact number and compensation for this team member."
            icon={<Users className="h-4 w-4" />}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" htmlFor="staff-name" required>
                <Input
                  id="staff-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Rahul Sharma"
                  required
                  maxLength={120}
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Status"
                htmlFor="staff-availability"
                hint={getAvailabilityMeta(draft.availabilityStatus).hint}
              >
                <Select
                  id="staff-availability"
                  value={draft.availabilityStatus}
                  onChange={(e) =>
                    setDraft({ ...draft, availabilityStatus: e.target.value as StaffAvailability })
                  }
                >
                  {STAFF_AVAILABILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <ImageUploader
              label="Profile photo"
              kind="staff"
              value={draft.photoUrl}
              onChange={(url) => setDraft({ ...draft, photoUrl: url })}
              hint="Clear square portrait (PNG, JPG, WEBP or GIF). Cropped to a circular avatar."
              previewClassName="h-20 w-20 rounded-full"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mobile number" htmlFor="staff-mobile" hint="Indian 10-digit mobile number.">
                <MobileNumberField
                  id="staff-mobile"
                  value={draft.mobileNumber}
                  hideValue={draft.hideMobileNumber}
                  onChange={(value) => setDraft({ ...draft, mobileNumber: value })}
                  onHideChange={(hidden) => setDraft({ ...draft, hideMobileNumber: hidden })}
                />
              </Field>
              <div className="space-y-3">
                <Field
                  label="Commission %"
                  htmlFor="staff-commission"
                  hint="Share of service revenue paid to this staff member. Default 15%."
                >
                  <div className="relative">
                    <Input
                      id="staff-commission"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="0.5"
                      value={draft.commissionPercent}
                      onChange={(e) => setDraft({ ...draft, commissionPercent: e.target.value })}
                      placeholder="15"
                      className="pr-8"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                      %
                    </span>
                  </div>
                </Field>
                <Field label="Professional experience" htmlFor="staff-experience" hint="e.g. 8+ Years">
                  <Input
                    id="staff-experience"
                    value={draft.experience}
                    onChange={(e) => setDraft({ ...draft, experience: e.target.value })}
                    placeholder="8+ Years"
                    maxLength={80}
                  />
                </Field>
              </div>
            </div>
          </FormSection>

          {/* 2 — Roles & permissions */}
          <FormSection
            step={2}
            title="Roles & permissions"
            description="The professional title clients see, and the dashboard access level for this staff member."
            icon={<KeyRound className="h-4 w-4" />}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Primary role"
                htmlFor="staff-primary-role"
                required
                hint="Shown publicly as the specialist's professional title."
              >
                <Select
                  id="staff-primary-role"
                  value={draft.primaryRole}
                  onChange={(e) => {
                    const primaryRole = e.target.value as StaffPrimaryRole | '';
                    const label = STAFF_PRIMARY_ROLES.find((role) => role.value === primaryRole)?.label || '';
                    setDraft({
                      ...draft,
                      primaryRole,
                      roleTitle: label,
                      // Keep the access level sensible unless the owner overrode it.
                      appAccessRole:
                        draft.appAccessRole === suggestedAppAccessRole(draft.primaryRole)
                          ? suggestedAppAccessRole(primaryRole)
                          : draft.appAccessRole,
                    });
                  }}
                  required
                >
                  <option value="">Select a primary role…</option>
                  {STAFF_PRIMARY_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="App access role"
                htmlFor="staff-app-access"
                hint={
                  STAFF_APP_ACCESS_ROLES.find((role) => role.value === draft.appAccessRole)?.summary || ''
                }
              >
                <Select
                  id="staff-app-access"
                  value={draft.appAccessRole}
                  onChange={(e) => setDraft({ ...draft, appAccessRole: e.target.value as StaffAppAccessRole })}
                >
                  {STAFF_APP_ACCESS_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {(() => {
              const accessRole = STAFF_APP_ACCESS_ROLES.find((role) => role.value === draft.appAccessRole);
              if (!accessRole) return null;
              return (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {accessRole.label} can access
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {accessRole.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            <Field
              label="Custom designation (optional)"
              htmlFor="staff-role"
              hint="Overrides the public job title — e.g. “Senior Bridal Artist”."
            >
              <Input
                id="staff-role"
                value={draft.roleTitle}
                onChange={(e) => setDraft({ ...draft, roleTitle: e.target.value })}
                placeholder="Senior Bridal Artist"
                maxLength={120}
              />
            </Field>
          </FormSection>

          {/* 3 — Service assignment */}
          <FormSection
            step={3}
            title="Service assignment & mapping"
            description="Tick the services this team member can deliver. Leave empty to allow every service."
            icon={<Tag className="h-4 w-4" />}
          >
            <ServiceAssignmentPicker
              services={services}
              value={draft.serviceIds}
              onChange={(ids) => setDraft({ ...draft, serviceIds: ids })}
            />
          </FormSection>

          {/* 4 — Weekly schedule */}
          <FormSection
            step={4}
            title="Weekly schedule & timings"
            description="Set the recurring roster. Uncheck a day (or mark Closed) to block it for online booking."
            icon={<CalendarClock className="h-4 w-4" />}
          >
            <WeeklyScheduleEditor
              value={draft.weeklySchedule}
              onChange={(schedule) => setDraft({ ...draft, weeklySchedule: schedule })}
              errors={scheduleErrorMap}
            />
          </FormSection>

          {/* 5 — Specialisations / skills */}
          <FormSection
            step={5}
            title="Specialisations / skills"
            description="Tap skills to add them as pills, or type a custom one. Rendered on the public profile."
            icon={<Sparkles className="h-4 w-4" />}
          >
            <SkillTagSelector
              value={draft.specialties}
              onChange={(skills) => setDraft({ ...draft, specialties: skills })}
            />
          </FormSection>

          {/* 6 — Optional profile enrichment */}
          <FormSection
            step={6}
            title="Profile details (optional)"
            description="Bio, qualifications, verified ratings and portfolio work photos."
            icon={<Award className="h-4 w-4" />}
          >
            <Field label="Short bio" htmlFor="staff-bio">
              <Textarea
                id="staff-bio"
                rows={3}
                value={draft.bio}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                placeholder="Background, signature techniques and client approach…"
                maxLength={2000}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
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

            <Field
              label="Qualifications & certifications"
              htmlFor="staff-qualifications"
              hint="One qualification or certification per line (up to 20)."
            >
              <Textarea
                id="staff-qualifications"
                rows={3}
                value={draft.qualifications}
                onChange={(e) => setDraft({ ...draft, qualifications: e.target.value })}
                placeholder={'CIDESCO Certified Aesthetician\nLondon Academy Bridal Makeup Diploma'}
              />
            </Field>

            {/* Work photos / portfolio gallery + explicit consent */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Work photos / portfolio gallery</p>
                  <p className="text-xs text-slate-500">Showcase transformations and portfolio work (up to 20 photos).</p>
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
          </FormSection>
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
