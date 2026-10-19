import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  FileEdit,
  Globe,
  Info,
  Rocket,
  Send,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import type { Salon, SalonStatus, SalonWorkflow } from '../../types/auth';
import { Alert, Badge, Button, Card, formatDate } from '../ui';

type BadgeTone = 'green' | 'amber' | 'red' | 'slate' | 'blue' | 'gold';

export const STATUS_META: Record<
  SalonStatus,
  { label: string; tone: BadgeTone; description: string; icon: React.ReactNode }
> = {
  draft: {
    label: 'Draft',
    tone: 'slate',
    description: 'Only you can see this website. Submit it for review when it is ready.',
    icon: <FileEdit className="h-3.5 w-3.5" />,
  },
  pending: {
    label: 'Pending approval',
    tone: 'blue',
    description: 'A platform admin is reviewing your submission. You can keep editing; changes will not go live until approved.',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  approved: {
    label: 'Approved',
    tone: 'green',
    description: 'Your website passed review. Publish it to make it live.',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: 'Rejected',
    tone: 'red',
    description: 'A platform admin rejected this submission. Fix the points below and resubmit.',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  changes_requested: {
    label: 'Changes requested',
    tone: 'amber',
    description: 'A platform admin asked for changes. Update your website and resubmit.',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
};

export function StatusBadge({ status, suspended }: { status: SalonStatus; suspended?: boolean }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={meta.tone}>
        {meta.icon}
        {meta.label}
      </Badge>
      {suspended && (
        <Badge tone="red">
          <ShieldAlert className="h-3.5 w-3.5" /> Suspended
        </Badge>
      )}
    </span>
  );
}

const STEPS = [
  { key: 'registered', label: 'Registered' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'published', label: 'Published' },
] as const;

/** Registered → Onboarding → Draft → Pending → Approved → Published */
export function WorkflowStepper({ salon, workflow }: { salon: Salon; workflow: SalonWorkflow | null }) {
  const status = workflow?.status || salon.status || 'draft';
  let current = 2; // draft by default once a salon exists
  if (status === 'pending') current = 3;
  if (status === 'approved') current = 4;
  if (status === 'approved' && salon.published) current = 5;

  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {STEPS.map((step, index) => {
        const done = index < current || (index === current && step.key === 'published' && salon.published);
        const active = index === current;
        return (
          <li key={step.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                  done
                    ? 'bg-emerald-600 text-white'
                    : active
                      ? 'bg-[#D09A40] text-slate-900'
                      : 'bg-slate-200 text-slate-500',
                ].join(' ')}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={[
                  'text-xs font-medium',
                  active ? 'text-slate-900' : done ? 'text-emerald-700' : 'text-slate-400',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <span className={`mx-2 hidden h-px w-6 sm:block ${index < current ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Review outcome (note) shown to the owner after a decision. */
export function ReviewNoteCard({ workflow }: { workflow: SalonWorkflow | null }) {
  if (!workflow?.reviewNote || (workflow.status !== 'rejected' && workflow.status !== 'changes_requested')) {
    return null;
  }
  const rejected = workflow.status === 'rejected';
  return (
    <div
      className={`rounded-xl border p-4 ${
        rejected ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {rejected ? (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        )}
        <div>
          <p className={`text-sm font-semibold ${rejected ? 'text-red-900' : 'text-amber-900'}`}>
            {rejected ? 'Your submission was rejected' : 'The reviewer requested changes'}
          </p>
          <p className={`mt-1 text-sm ${rejected ? 'text-red-800' : 'text-amber-800'}`}>{workflow.reviewNote}</p>
          <p className="mt-1 text-xs text-slate-500">Reviewed {formatDate(workflow.reviewedAt)}</p>
        </div>
      </div>
    </div>
  );
}

/** Submit / resubmit / publish controls with server-enforced gating. */
export const WorkflowActions: React.FC<{
  salon: Salon;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onDone?: () => void;
}> = ({ salon, size = 'md', className, onDone }) => {
  const { workflow, refresh } = useAuth();
  const [busy, setBusy] = useState<'submit' | 'publish' | 'unpublish' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const run = async (kind: 'submit' | 'publish' | 'unpublish') => {
    setBusy(kind);
    setError('');
    setNotice('');
    try {
      if (kind === 'submit') {
        await api.post('/salon/submit');
        setNotice('Submitted for approval. You will see the decision here once reviewed.');
      } else if (kind === 'publish') {
        await api.post('/salon/publish');
        setNotice('Your website is live.');
      } else {
        await api.post('/salon/unpublish');
        setNotice('Your website is offline.');
      }
      await refresh();
      onDone?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const status = workflow?.status || salon.status;
  const blockers = workflow?.blockers || [];
  const isSuspended = workflow?.suspended || salon.suspended;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {(status === 'draft' || status === 'rejected' || status === 'changes_requested') && !isSuspended && (
          <Button
            variant="gold"
            size={size}
            loading={busy === 'submit'}
            disabled={!workflow?.canSubmit}
            onClick={() => run('submit')}
            title={workflow?.canSubmit ? undefined : blockers[0]?.message || 'Complete your website first'}
          >
            <Send className="h-4 w-4" /> {status === 'draft' ? 'Submit for approval' : 'Resubmit for approval'}
          </Button>
        )}

        {status === 'pending' && (
          <Badge tone="blue">
            <Clock className="h-3.5 w-3.5" /> Awaiting review
          </Badge>
        )}

        {status === 'approved' &&
          (salon.published ? (
            <>
              <Badge tone="green">
                <Globe className="h-3.5 w-3.5" /> Live
              </Badge>
              <Button variant="secondary" size={size} loading={busy === 'unpublish'} onClick={() => run('unpublish')}>
                Unpublish
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size={size}
              loading={busy === 'publish'}
              disabled={!workflow?.canPublish}
              onClick={() => run('publish')}
              title={workflow?.canPublish ? undefined : 'Publishing requires approval and a verified email'}
            >
              <Rocket className="h-4 w-4" /> Publish website
            </Button>
          ))}

        <Link to="/dashboard/approval" className="text-xs font-semibold text-[#8a641f] hover:underline">
          Submission history
        </Link>
      </div>

      {isSuspended && (
        <div className="mt-2">
          <Alert tone="error">
            <span className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This salon is suspended by the platform{workflow?.suspendedReason ? `: ${workflow.suspendedReason}` : '.'} Your
                website is offline and cannot be published until it is reinstated.
              </span>
            </span>
          </Alert>
        </div>
      )}
      {notice && (
        <div className="mt-2">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}
      {error && (
        <div className="mt-2">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {!isSuspended && blockers.length > 0 && status !== 'pending' && (
        <ul className="mt-2 space-y-1">
          {blockers.map((blocker) => (
            <li key={blocker.code} className="flex items-start gap-1.5 text-xs text-amber-700">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {blocker.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Compact status card with the stepper, used on the dashboard overview. */
export const WorkflowCard: React.FC<{ salon: Salon; pendingCount?: number }> = ({ salon }) => {
  const { workflow } = useAuth();
  const meta = STATUS_META[workflow?.status || salon.status] || STATUS_META.draft;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website status</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={workflow?.status || salon.status} suspended={workflow?.suspended || salon.suspended} />
            {salon.published && (
              <Badge tone="green">
                <Globe className="h-3.5 w-3.5" /> Live at /salon/{salon.slug}
              </Badge>
            )}
            {workflow?.hasUnpublishedChanges && (
              <Badge tone="amber">Unpublished edits pending review</Badge>
            )}
          </div>
          <p className="mt-2 max-w-xl text-sm text-slate-600">{meta.description}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          {workflow?.submittedAt && <p>Submitted {formatDate(workflow.submittedAt)}</p>}
          {workflow?.approvedAt && <p>Approved {formatDate(workflow.approvedAt)}</p>}
          {workflow?.approvedVersion && <p>Live version v{workflow.approvedVersion.version}</p>}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <WorkflowStepper salon={salon} workflow={workflow} />
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <WorkflowActions salon={salon} />
      </div>
    </Card>
  );
};
