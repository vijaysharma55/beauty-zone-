import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Inbox,
  MessageSquareWarning,
  XCircle,
} from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { AdminApproval, ApprovalSnapshot, ReviewAction } from '../../types/auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Select,
  Textarea,
  formatCurrency,
  formatDate,
} from '../ui';

type Filter = 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'all';

const FILTER_LABELS: Record<Filter, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes requested',
  all: 'All submissions',
};

export const AdminApprovals: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('pending');
  const [approvals, setApprovals] = useState<AdminApproval[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selected, setSelected] = useState<AdminApproval | null>(null);
  const [snapshot, setSnapshot] = useState<ApprovalSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<ReviewAction | null>(null);
  const [reviewError, setReviewError] = useState('');

  const load = useCallback(async (nextFilter: Filter = filter) => {
    setLoading(true);
    try {
      const res = await api.get<{ approvals: AdminApproval[]; pendingCount: number }>(
        `/admin/approvals?status=${nextFilter}`
      );
      setApprovals(res.approvals);
      setPendingCount(res.pendingCount);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openReview = async (approval: AdminApproval) => {
    setSelected(approval);
    setNote(approval.reviewNote || '');
    setReviewError('');
    setSnapshot(null);
    setSnapshotLoading(true);
    try {
      const res = await api.get<{ snapshot: ApprovalSnapshot }>(`/admin/approvals/${approval.id}`);
      setSnapshot(res.snapshot);
    } catch (err) {
      setReviewError(errorMessage(err));
    } finally {
      setSnapshotLoading(false);
    }
  };

  const submitReview = async (action: ReviewAction) => {
    if (!selected) return;
    if ((action === 'reject' || action === 'request_changes') && !note.trim()) {
      setReviewError(
        action === 'reject' ? 'Please provide a reason for rejection.' : 'Please describe the changes required.'
      );
      return;
    }
    setBusy(action);
    setReviewError('');
    try {
      await api.post(`/admin/approvals/${selected.id}/review`, { action, note: note.trim() });
      setNotice(
        action === 'approve'
          ? `${selected.salon.name} approved. The owner can publish it now.`
          : action === 'reject'
            ? `${selected.salon.name} rejected and kept offline.`
            : `Changes requested for ${selected.salon.name}.`
      );
      setTimeout(() => setNotice(''), 5000);
      setSelected(null);
      setSnapshot(null);
      await load();
    } catch (err) {
      setReviewError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const counters = useMemo(
    () => ({
      pending: pendingCount,
      approved: approvals.filter((a) => a.status === 'approved').length,
      problem: approvals.filter((a) => a.status === 'rejected' || a.status === 'changes_requested').length,
    }),
    [approvals, pendingCount]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Moderation"
        title="Website approvals"
        description="Review submitted salon websites. Only approved versions can be published by their owners."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="blue">
              <Clock className="h-3.5 w-3.5" /> {counters.pending} awaiting review
            </Badge>
            <Select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="w-48">
              {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
                <option key={key} value={key}>
                  {FILTER_LABELS[key]}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {loading ? (
        <Card className="p-10 text-center text-sm text-slate-500">Loading submissions…</Card>
      ) : approvals.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title={filter === 'pending' ? 'No submissions waiting' : 'Nothing here yet'}
            description={
              filter === 'pending'
                ? 'Salon owners will appear here when they submit their website for approval.'
                : 'Try a different filter to see past decisions.'
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <Card>
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
              <ClipboardCheck className="h-4 w-4 text-[#D09A40]" /> {approvals.length} submission
              {approvals.length === 1 ? '' : 's'}
            </div>
            <ul className="divide-y divide-slate-100">
              {approvals.map((approval) => (
                <li key={approval.id}>
                  <button
                    type="button"
                    onClick={() => openReview(approval)}
                    className={`flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50 ${
                      selected?.id === approval.id ? 'bg-[#D09A40]/10' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">{approval.salon.name}</span>
                        <Badge tone="slate">v{approval.version}</Badge>
                        <StatusPill status={approval.status} />
                        {approval.salon.published && <Badge tone="green">Live</Badge>}
                        {approval.salon.suspended && <Badge tone="red">Suspended</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {approval.owner.email} · /salon/{approval.salon.slug}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">Submitted {formatDate(approval.submittedAt)}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#8a641f]">Review →</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            {!selected ? (
              <div className="py-10 text-center">
                <ClipboardCheck className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">Select a submission</p>
                <p className="mt-1 text-xs text-slate-500">
                  Inspect the submitted content, then approve, reject or request changes with a note.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{selected.salon.name}</h3>
                    <Badge tone="slate">v{selected.version}</Badge>
                    <StatusPill status={selected.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {selected.owner.name} · {selected.owner.email}{' '}
                    {!selected.owner.emailVerified && <span className="text-amber-600">(email unverified)</span>}
                  </p>
                </div>

                {snapshotLoading ? (
                  <p className="text-sm text-slate-500">Loading submission…</p>
                ) : snapshot ? (
                  <div className="space-y-3">
                    <SnapshotSummary snapshot={snapshot} />
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/admin/salons`} className="text-xs font-semibold text-[#8a641f] hover:underline">
                        Open salon record
                      </Link>
                      {selected.salon.published && (
                        <a
                          href={`/salon/${selected.salon.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#8a641f] hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> View live version
                        </a>
                      )}
                    </div>
                  </div>
                ) : null}

                {selected.status === 'pending' ? (
                  <>
                    <Field
                      label="Reviewer note"
                      htmlFor="review-note"
                      hint="Required when rejecting or requesting changes. Sent to the salon owner."
                    >
                      <Textarea
                        id="review-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Please add a hero image and list at least three services."
                        maxLength={1000}
                      />
                    </Field>

                    {reviewError && <Alert tone="error">{reviewError}</Alert>}

                    <div className="flex flex-wrap gap-2">
                      <Button variant="primary" loading={busy === 'approve'} onClick={() => submitReview('approve')}>
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </Button>
                      <Button
                        variant="secondary"
                        loading={busy === 'request_changes'}
                        onClick={() => submitReview('request_changes')}
                      >
                        <MessageSquareWarning className="h-4 w-4" /> Request changes
                      </Button>
                      <Button variant="danger" loading={busy === 'reject'} onClick={() => submitReview('reject')}>
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      Approving unlocks publishing for the owner. Rejecting or requesting changes keeps the website
                      offline until a new version is approved.
                    </p>
                  </>
                ) : (
                  <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    This submission was already reviewed
                    {selected.reviewedAt ? ` on ${formatDate(selected.reviewedAt)}` : ''}. The owner must submit a new
                    version for another decision.
                    {selected.reviewNote && <p className="mt-1 italic">“{selected.reviewNote}”</p>}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

const StatusPill: React.FC<{ status: AdminApproval['status'] }> = ({ status }) => {
  const map = {
    pending: { tone: 'blue' as const, label: 'Pending' },
    approved: { tone: 'green' as const, label: 'Approved' },
    rejected: { tone: 'red' as const, label: 'Rejected' },
    changes_requested: { tone: 'amber' as const, label: 'Changes requested' },
    superseded: { tone: 'slate' as const, label: 'Superseded' },
  };
  const meta = map[status] || map.superseded;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
};

const SnapshotSummary: React.FC<{ snapshot: ApprovalSnapshot }> = ({ snapshot }) => {
  const salon = snapshot.salon as Record<string, any>;
  const services = (snapshot.services || []).filter((s: any) => s.active);
  const staff = (snapshot.staff || []).filter((s: any) => s.active);
  const timings = Array.isArray(salon.timings) ? salon.timings : [];

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap gap-2">
        <Badge tone="slate">Template: {String(salon.templateId || 'luxe')}</Badge>
        <Badge tone="slate">{services.length} active services</Badge>
        <Badge tone="slate">{staff.length} team members</Badge>
        <Badge tone="slate">{salon.gallery?.length || 0} photos</Badge>
      </div>
      <div className="rounded-lg bg-slate-50 p-3">
        <p className="font-semibold text-slate-800">{salon.name}</p>
        {salon.tagline && <p className="text-slate-600">{salon.tagline}</p>}
        <p className="mt-1 text-slate-500">
          {[salon.addressLine, salon.city, salon.state].filter(Boolean).join(', ') || 'No address'}
        </p>
        <p className="text-slate-500">
          {salon.phone || 'No phone'} · {salon.email || 'No email'}
        </p>
      </div>
      {services.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {services.slice(0, 6).map((service: any) => (
            <li key={service.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
              <span className="truncate text-slate-700">{service.name}</span>
              <span className="shrink-0 font-medium text-slate-800">{formatCurrency(service.pricePaise)}</span>
            </li>
          ))}
        </ul>
      )}
      {timings.length > 0 && (
        <p className="text-slate-500">
          Hours:{' '}
          {timings
            .map((t: any) => `${t.day} ${t.closed ? 'closed' : `${t.open}–${t.close}`}`)
            .join(' · ')}
        </p>
      )}
    </div>
  );
};
