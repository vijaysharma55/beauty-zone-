import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Eye, FileClock, MailWarning, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import type { SalonVersion } from '../../types/auth';
import { Alert, Badge, Button, Card, CardHeader, EmptyState, PageHeader, formatDate } from '../ui';
import { EmailVerificationBanner } from './VerifyEmailPage';
import { STATUS_META, StatusBadge, WorkflowActions, WorkflowStepper } from './WorkflowStatus';

const VERSION_META: Record<
  string,
  { label: string; tone: 'green' | 'amber' | 'red' | 'blue' | 'slate' }
> = {
  pending: { label: 'Pending review', tone: 'blue' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
  changes_requested: { label: 'Changes requested', tone: 'amber' },
  superseded: { label: 'Replaced by newer version', tone: 'slate' },
};

export const ApprovalPage: React.FC = () => {
  const { salon, workflow, refresh } = useAuth();
  const [versions, setVersions] = useState<SalonVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api.get<{ versions: SalonVersion[] }>('/salon/versions');
      setVersions(res.versions);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!salon) return null;
  const status = workflow?.status || salon.status;
  const meta = STATUS_META[status] || STATUS_META.draft;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Approval workflow"
        title="Submit & approval status"
        description="Only approved websites can go live. Track every submission and the reviewer's decision here."
        actions={
          <>
            <Link to="/dashboard/preview">
              <Button variant="secondary">
                <Eye className="h-4 w-4" /> Preview
              </Button>
            </Link>
            <Link to="/dashboard/website">
              <Button variant="ghost">Edit website</Button>
            </Link>
          </>
        }
      />

      <EmailVerificationBanner />
      {error && <Alert tone="error">{error}</Alert>}

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} suspended={workflow?.suspended || salon.suspended} />
              {salon.published ? <Badge tone="green">Live</Badge> : <Badge tone="amber">Not live</Badge>}
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{meta.description}</p>
            {workflow?.hasUnpublishedChanges && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                You have edits that are not in the live website yet. Submit them for approval to publish the update.
              </p>
            )}
          </div>
          <div className="grid gap-1 text-xs text-slate-500">
            <span>Submitted: {formatDate(workflow?.submittedAt)}</span>
            <span>Last decision: {formatDate(workflow?.reviewedAt)}</span>
            <span>Approved: {formatDate(workflow?.approvedAt)}</span>
            <span>Live version: {workflow?.approvedVersion ? `v${workflow.approvedVersion.version}` : '—'}</span>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto pb-1">
          <WorkflowStepper salon={salon} workflow={workflow} />
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <WorkflowActions salon={salon} onDone={load} />
        </div>
      </Card>

      {workflow?.reviewNote && (
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-[#D09A40]" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Latest reviewer note</p>
              <p className="mt-1 text-sm text-slate-600">{workflow.reviewNote}</p>
            </div>
          </div>
        </Card>
      )}

      {workflow && workflow.blockers.length > 0 && (
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-900">Before you can submit</p>
          <ul className="mt-2 space-y-1.5">
            {workflow.blockers.map((blocker) => (
              <li key={blocker.code} className="flex items-start gap-2 text-sm text-amber-800">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                {blocker.message}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Link to="/dashboard/website">
              <Button variant="secondary" size="sm">
                Complete website
              </Button>
            </Link>
            <Link to="/dashboard/services">
              <Button variant="ghost" size="sm">
                Add services
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Submission history"
          description="Every version you submitted, with the platform's decision."
          action={
            <Button variant="ghost" size="sm" onClick={load}>
              Refresh
            </Button>
          }
        />
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Loading submissions…</p>
        ) : versions.length === 0 ? (
          <EmptyState
            icon={<FileClock className="h-6 w-6" />}
            title="No submissions yet"
            description="When your website is ready, submit it for review. A platform admin will approve it or send it back with notes."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {versions.map((version) => {
              const vMeta = VERSION_META[version.status] || VERSION_META.superseded;
              const isLive = workflow?.approvedVersion?.id === version.id;
              return (
                <li key={version.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      v{version.version}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={vMeta.tone}>{vMeta.label}</Badge>
                        {isLive && (
                          <Badge tone="green">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Live now
                          </Badge>
                        )}
                        {version.status === 'pending' && (
                          <Badge tone="blue">
                            <Clock className="h-3.5 w-3.5" /> Waiting
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Submitted {formatDate(version.submittedAt)}
                        {version.reviewedAt ? ` · Reviewed ${formatDate(version.reviewedAt)}` : ''}
                      </p>
                      {version.reviewNote && (
                        <p className="mt-1 max-w-xl rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          {version.reviewNote}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};
