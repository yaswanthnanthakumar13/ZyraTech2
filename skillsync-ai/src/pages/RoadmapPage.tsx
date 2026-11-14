import { useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, RefreshCw, AlertTriangle } from 'lucide-react';
import { apiFetch, type PageRoute } from '../lib/api';
import type { AIAgentDecision, LearnerWorkspaceData, LearningResource } from '../types';

interface RoadmapPageProps {
  workspace: LearnerWorkspaceData;
  resources: LearningResource[];
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
  onNavigate: (route: PageRoute, context?: { skill?: string }) => void;
  onInspectDecision: (decision: AIAgentDecision) => void;
}

export function RoadmapPage({
  workspace,
  resources,
  onWorkspaceUpdate,
  onNavigate,
  onInspectDecision,
}: RoadmapPageProps) {
  const { roadmap, agentDecisions } = workspace;
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMilestoneStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    setError(null);
    try {
      const ws = await apiFetch<LearnerWorkspaceData>(`/api/roadmap/milestone/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      onWorkspaceUpdate(ws);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update milestone');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await apiFetch<{ workspace: LearnerWorkspaceData; decision: AIAgentDecision }>(
        '/api/roadmap/resync',
        { method: 'POST' }
      );
      onWorkspaceUpdate(res.workspace);
      onInspectDecision(res.decision);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resync roadmap');
    } finally {
      setSyncing(false);
    }
  };

  if (!roadmap) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] text-center space-y-4">
        <h2 className="text-lg font-semibold">No active roadmap found</h2>
        <p className="text-sm text-slate-500">Run the AI Roadmap Generator to build your career path.</p>
        <button
          onClick={handleResync}
          className="px-4 py-2 rounded-lg bg-[#2D6A4F] dark:bg-[#3B8263] text-white text-sm font-semibold"
        >
          Generate Roadmap
        </button>
      </div>
    );
  }

  const completedCount = roadmap.milestones.filter((m) => m.status === 'completed').length;
  const pct = Math.round((completedCount / Math.max(1, roadmap.milestones.length)) * 100);

  const courseGroups = new Map<
    string,
    { courseCode: string; courseTitle: string; total: number; completed: number; attendedCount: number; pctSum: number }
  >();
  for (const mod of workspace.moduleProgress || []) {
    const entry = courseGroups.get(mod.courseCode) || {
      courseCode: mod.courseCode,
      courseTitle: mod.courseTitle,
      total: 0,
      completed: 0,
      attendedCount: 0,
      pctSum: 0,
    };
    entry.total += 1;
    if (mod.completionPercent >= 70) entry.completed += 1;
    if (mod.attended) entry.attendedCount += 1;
    entry.pctSum += mod.completionPercent;
    courseGroups.set(mod.courseCode, entry);
  }
  const courseAttendanceList = Array.from(courseGroups.values()).map((c) => ({
    ...c,
    avgPct: Math.round(c.pctSum / Math.max(1, c.total)),
    attended: c.attendedCount > 0 || c.completed > 0,
  }));
  const coursesAttendedCount = courseAttendanceList.filter((c) => c.attended).length;

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#2D6A4F] dark:text-[#74C69D]">
            Target Career · {roadmap.careerTitle}
          </p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Personalized Adaptive Learning Path
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
            {roadmap.adaptationReason}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>Compatibility: {roadmap.compatibilityScore}%</span>
            <span aria-hidden="true">·</span>
            <span>Completion: {completedCount}/{roadmap.milestones.length} stages ({pct}%)</span>
            <span aria-hidden="true">·</span>
            <span>Courses Attended: {coursesAttendedCount}/{courseAttendanceList.length}</span>
            <span aria-hidden="true">·</span>
            <span>Remaining Effort: ~{roadmap.estimatedTotalHours}h</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleResync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#19221D] text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Orchestrating...' : 'Re-sync with AI Agents'}</span>
          </button>
          {agentDecisions[0] && (
            <button
              onClick={() => onInspectDecision(agentDecisions[0])}
              className="px-4 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold"
            >
              View Orchestrator Reasoning
            </button>
          )}
        </div>
      </div>

      {/* Courses Attended & Course Completion Percentages */}
      {courseAttendanceList.length > 0 && (
        <section className="p-6 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#18221D] dark:text-white">
                Courses Attended &amp; Completion Percentage
              </h3>
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                {coursesAttendedCount} of {courseAttendanceList.length} university courses active for {roadmap.careerTitle}
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
              Roadmap {pct}% Completed
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {courseAttendanceList.map((crs) => (
              <div
                key={crs.courseCode}
                className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#24302A] space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                    {crs.courseCode}
                  </span>
                  <span className="font-bold tabular-nums text-[#18221D] dark:text-white">
                    {crs.avgPct}%
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#18221D] dark:text-white line-clamp-2">
                  {crs.courseTitle}
                </p>
                <div className="w-full h-1.5 rounded-full bg-[#DCE5DF] dark:bg-[#24302A] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2D6A4F] dark:bg-[#52B788]"
                    style={{ width: `${crs.avgPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0]">
                  {crs.completed}/{crs.total} modules · {crs.attended ? 'Attended' : 'Not Started'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Sequential Stages */}
      <div className="space-y-4">
        {roadmap.milestones.map((ms) => {
          const matchedRes = resources.filter(
            (r) => r.skillName.toLowerCase() === ms.skillName.toLowerCase()
          );
          const isLocked = ms.status === 'locked';
          const isRevision = ms.status === 'needs_revision';
          const isDone = ms.status === 'completed';

          return (
            <div
              key={ms.id}
              className={`p-6 rounded-2xl border transition-colors ${
                isRevision
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900'
                  : 'bg-white dark:bg-[#151C18] border-[#DCE5DF] dark:border-[#24302A]'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                      Stage 0{ms.stageOrder}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{ms.skillName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ms.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{ms.estimatedHours}h</span>
                    {ms.isReusableTransfer && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Preserved Cross-Career Skill
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                    {isLocked && <Lock className="w-4 h-4 text-slate-400 shrink-0" />}
                    {isRevision && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
                    <span>{ms.title}</span>
                  </h3>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {ms.learningObjective}
                  </p>

                  {ms.adaptedNote && (
                    <p className="text-xs font-medium text-[#2D6A4F] dark:text-[#74C69D]">
                      Agent Note: {ms.adaptedNote}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!isLocked && (
                    <button
                      onClick={() => onNavigate('assessments', { skill: ms.skillName })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold"
                    >
                      <span>Take Assessment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {ms.status === 'available' && (
                    <button
                      onClick={() => handleMilestoneStatus(ms.id, 'in_progress')}
                      disabled={updatingId === ms.id}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Start Stage
                    </button>
                  )}
                  {(ms.status === 'in_progress' || ms.status === 'needs_revision') && (
                    <button
                      onClick={() => handleMilestoneStatus(ms.id, 'completed')}
                      disabled={updatingId === ms.id}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Mark Practice Done
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#DCE5DF] dark:border-[#24302A] grid sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                    Practical Exercise
                  </span>
                  <p className="text-slate-600 dark:text-slate-400">{ms.practicalExercise}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                    Mini-Project &amp; Criteria
                  </span>
                  <p className="text-slate-600 dark:text-slate-400">
                    {ms.miniProject} — {ms.completionCriteria}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                    Matched Resources ({matchedRes.length})
                  </span>
                  {matchedRes.length > 0 ? (
                    <ul className="space-y-1">
                      {matchedRes.slice(0, 2).map((r) => (
                        <li key={r.id}>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
                          >
                            {r.title} ({r.provider})
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <button
                      onClick={() => onNavigate('learning-hub')}
                      className="text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
                    >
                      Browse Learning Hub
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
