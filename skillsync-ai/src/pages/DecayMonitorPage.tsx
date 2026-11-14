import { useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock, Dna, RefreshCw, Target } from 'lucide-react';
import { apiFetch, formatRelativeDays, type AssessmentLaunchContext, type PageRoute } from '../lib/api';
import { playPopSound } from '../lib/sound';
import type { LearnerWorkspaceData } from '../types';

interface DecayMonitorPageProps {
  workspace: LearnerWorkspaceData;
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
  onNavigate: (
    route: PageRoute,
    context?: AssessmentLaunchContext & { careerId?: string }
  ) => void;
}

export function DecayMonitorPage({
  workspace,
  onWorkspaceUpdate,
  onNavigate,
}: DecayMonitorPageProps) {
  const [scanning, setScanning] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    playPopSound('action');
    setScanning(true);
    setError(null);
    setScanMessage(null);
    try {
      const res = await apiFetch<{ workspace: LearnerWorkspaceData; message?: string }>('/api/decay/check', {
        method: 'POST',
      });
      onWorkspaceUpdate(res.workspace);
      setScanMessage(res.message || 'Ebbinghaus forgetting-curve audit recalculated across all skills.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decay scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleCompleteRevision = async (revId: string) => {
    playPopSound('action');
    setCompletingId(revId);
    setError(null);
    try {
      const ws = await apiFetch<LearnerWorkspaceData>(`/api/decay/revision/${revId}/complete`, {
        method: 'POST',
      });
      onWorkspaceUpdate(ws);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete revision');
    } finally {
      setCompletingId(null);
    }
  };

  const pendingRevisions = workspace.revisions.filter((r) => r.status === 'pending');
  const completedRevisionsCount = workspace.revisions.filter((r) => r.status === 'completed').length;

  const avgRetention = useMemo(() => {
    if (workspace.skills.length === 0) return 100;
    return Math.round(
      workspace.skills.reduce((acc, s) => acc + s.retentionScore, 0) / workspace.skills.length
    );
  }, [workspace.skills]);

  const highRiskCount = workspace.skills.filter((s) => s.decayRisk === 'high').length;
  const modRiskCount = workspace.skills.filter((s) => s.decayRisk === 'moderate').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#18221D] dark:text-[#ECF2EE]">
            Student Knowledge Retention &amp; Decay Monitor
          </h2>
          <p className="text-sm text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
            Calculates exact memory decay using an Ebbinghaus forgetting-curve half-life model weighted by assessment scores and spaced repetitions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleScan}
          disabled={scanning}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Recalculating Decay...' : 'Run Accurate Retention Scan'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {scanMessage && (
        <div className="p-3.5 rounded-lg bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] text-xs text-[#2D6A4F] dark:text-[#74C69D]">
          {scanMessage}
        </div>
      )}

      {/* Ebbinghaus Model Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
          <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">Average Memory Retention</p>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1 text-[#2D6A4F] dark:text-[#74C69D]">
            {avgRetention}%
          </p>
          <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0] mt-1">
            Across {workspace.skills.length} tracked skills
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
          <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">Decay Risk Flags</p>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1 text-[#18221D] dark:text-[#ECF2EE]">
            {highRiskCount} high · {modRiskCount} mod
          </p>
          <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0] mt-1">
            Triggered below 78% retention
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
          <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">Pending Spaced Drills</p>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1 text-amber-700 dark:text-amber-300">
            {pendingRevisions.length}
          </p>
          <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0] mt-1">
            {completedRevisionsCount} drills completed
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E]">
          <p className="text-xs font-semibold text-[#1B4332] dark:text-[#95D5B2] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>Retention Formula</span>
          </p>
          <p className="text-[11px] text-[#4B5952] dark:text-[#A9B7AF] mt-1 leading-relaxed">
            Half-life scales from 10–35 days by score verification and prior spaced drills. Practiced skills stay &ge;90%.
          </p>
        </div>
      </div>

      {/* Pending Spaced Revisions */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-4">
        <h3 className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE]">
          Scheduled Revision Drills ({pendingRevisions.length} pending)
        </h3>
        {pendingRevisions.length === 0 ? (
          <p className="text-sm text-[#5C6B63] dark:text-[#99A8A0]">
            All practiced skills have healthy retention. Keep practicing via Assessments or Learning Hub checkpoints to extend your memory half-life.
          </p>
        ) : (
          <div className="divide-y divide-[#E4ECE7] dark:divide-[#24302A]">
            {pendingRevisions.map((rev) => (
              <div key={rev.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                    {rev.skillName} · {rev.urgency.toUpperCase()} urgency
                  </p>
                  <p className="text-xs text-[#4B5952] dark:text-[#A9B7AF] mt-1">{rev.reason}</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onNavigate('assessments', { skill: rev.skillName })}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] text-xs font-semibold hover:bg-[#F1F6F3] dark:hover:bg-[#1D2822]"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Reassess Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCompleteRevision(rev.id)}
                    disabled={completingId === rev.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{completingId === rev.id ? 'Updating...' : 'Complete 15-min Drill'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retention Health Table */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
        <h3 className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE] mb-4">
          Precision Skill Retention &amp; Elapsed Time Audit
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#DCE5DF] dark:border-[#24302A] text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                <th className="py-2.5 pr-4 font-medium">Skill &amp; Weak Concepts</th>
                <th className="py-2.5 pr-4 font-medium">Elapsed Since Practice</th>
                <th className="py-2.5 pr-4 font-medium text-right">Competency</th>
                <th className="py-2.5 pr-4 font-medium">Memory Retention</th>
                <th className="py-2.5 font-medium text-right">Decay Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4ECE7] dark:divide-[#24302A]">
              {workspace.skills
                .slice()
                .sort((a, b) => a.retentionScore - b.retentionScore)
                .map((s) => {
                  const elapsedHours = Math.max(
                    0,
                    Math.round((Date.now() - new Date(s.lastPracticedAt).getTime()) / 3600000)
                  );
                  return (
                    <tr key={s.id} className="hover:bg-[#F6F9F7] dark:hover:bg-[#19221D]">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-[#18221D] dark:text-[#ECF2EE]">{s.skillName}</p>
                        {s.weakConcepts.length > 0 && (
                          <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0]">
                            Refresher cue: {s.weakConcepts.slice(0, 2).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#5C6B63] dark:text-[#99A8A0] tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeDays(s.lastPracticedAt)} ({elapsedHours}h)
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums">{s.verifiedScore}%</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-[#E4ECE7] dark:bg-[#222D28] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                s.retentionScore >= 78
                                  ? 'bg-[#2D6A4F] dark:bg-[#52B788]'
                                  : s.retentionScore >= 60
                                    ? 'bg-amber-500'
                                    : 'bg-rose-600'
                              }`}
                              style={{ width: `${s.retentionScore}%` }}
                            />
                          </div>
                          <span className="font-mono tabular-nums text-xs font-semibold">
                            {s.retentionScore}%
                          </span>
                        </div>
                      </td>
                      <td
                        className={`py-3 text-right text-xs font-semibold uppercase ${
                          s.decayRisk === 'high'
                            ? 'text-rose-600 dark:text-rose-400'
                            : s.decayRisk === 'moderate'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-[#2D6A4F] dark:text-[#74C69D]'
                        }`}
                      >
                        {s.decayRisk}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Failure DNA Post-Revision & Relapse Guard */}
      {workspace.failureDna.filter((f) => f.status !== 'recovered').length > 0 && (
        <div className="p-6 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#1B4332] dark:text-[#95D5B2] flex items-center gap-1.5">
              <Dna className="w-4 h-4" />
              <span>Failure DNA Relapse Alert ({workspace.failureDna.filter((f) => f.status !== 'recovered').length} active concept flags)</span>
            </p>
            <p className="text-xs text-[#4B5952] dark:text-[#A9B7AF]">
              Top flag: {workspace.failureDna.find((f) => f.status !== 'recovered')?.skillName} — {workspace.failureDna.find((f) => f.status !== 'recovered')?.conceptTag}. Explain it in Reverse Teaching or complete the recovery mission in Progress Analytics.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('career-arena', { arenaTab: 'reverse-teaching' })}
              className="px-3.5 py-2 rounded-lg bg-[#2D6A4F] text-white text-xs font-semibold whitespace-nowrap"
            >
              Reverse Teaching Fix
            </button>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="px-3.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-xs font-semibold whitespace-nowrap"
            >
              Open Failure DNA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
