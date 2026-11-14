import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Flame,
  Scale,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { apiFetch, type AssessmentLaunchContext, type PageRoute } from '../lib/api';
import { playPopSound } from '../lib/sound';
import type {
  CareerRole,
  LearnerWorkspaceData,
  WorkplaceSimulationItem,
} from '../types';

interface WorkplaceSimPageProps {
  workspace: LearnerWorkspaceData;
  careers: CareerRole[];
  initialCareerId?: string;
  initialSimKind?: WorkplaceSimulationItem['simKind'];
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
  onNavigate: (
    route: PageRoute,
    context?: AssessmentLaunchContext & { careerId?: string }
  ) => void;
}

const SIM_MODE_CARDS: Array<{
  kind: WorkplaceSimulationItem['simKind'];
  title: string;
  subtitle: string;
  icon: typeof Briefcase;
}> = [
  {
    kind: 'workday',
    title: 'One Day as a Professional',
    subtitle: 'Full morning-to-evening shift: triage incidents, ship code/audits, handle afternoon pivots.',
    icon: Briefcase,
  },
  {
    kind: 'boss_challenge',
    title: 'Unexpected Boss Challenge',
    subtitle: 'AI Manager, Client & Teammate throw live scope changes and blockers under countdown.',
    icon: Flame,
  },
  {
    kind: 'escape_room',
    title: 'Career Escape Room',
    subtitle: 'Solve progressive debugging & system puzzles under pressure to unlock the next room.',
    icon: ShieldAlert,
  },
  {
    kind: 'ethical_arena',
    title: 'Ethical Decision Arena',
    subtitle: 'Handle PII leaks, deadline pressure, and fairness bias across realistic workplace dilemmas.',
    icon: Scale,
  },
];

export function WorkplaceSimPage({
  workspace,
  careers,
  initialCareerId,
  initialSimKind,
  onWorkspaceUpdate,
  onNavigate,
}: WorkplaceSimPageProps) {
  const [selectedKind, setSelectedKind] = useState<WorkplaceSimulationItem['simKind']>(
    initialSimKind || 'workday'
  );
  const [selectedCareerId, setSelectedCareerId] = useState<string>(
    initialCareerId || workspace.profile.targetCareerId || 'full-stack-developer'
  );
  const [activeSim, setActiveSim] = useState<WorkplaceSimulationItem | null>(() => {
    const existingActive = workspace.workplaceSimulations.find((s) => s.status === 'active');
    return existingActive || null;
  });
  const [responseText, setResponseText] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCareerId) setSelectedCareerId(initialCareerId);
  }, [initialCareerId]);

  useEffect(() => {
    if (initialSimKind) setSelectedKind(initialSimKind);
  }, [initialSimKind]);

  useEffect(() => {
    if (!activeSim || activeSim.status !== 'active') return;
    setElapsedSeconds(0);
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeSim?.id, activeSim?.currentStage, activeSim?.status]);

  const handleStartSimulation = async (kindOverride?: WorkplaceSimulationItem['simKind']) => {
    const kind = kindOverride || selectedKind;
    playPopSound('action');
    setStarting(true);
    setError(null);
    setResponseText('');
    try {
      const res = await apiFetch<{
        simulation: WorkplaceSimulationItem;
        workspace: LearnerWorkspaceData;
      }>('/api/simulations/start', {
        method: 'POST',
        body: JSON.stringify({ simKind: kind, careerId: selectedCareerId }),
      });
      setActiveSim(res.simulation);
      onWorkspaceUpdate(res.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start simulation.');
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitStage = async () => {
    if (!activeSim || responseText.trim().length < 10) {
      setError('Write at least 10 characters explaining your technical & professional decision.');
      return;
    }
    playPopSound('action');
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{
        simulation: WorkplaceSimulationItem;
        workspace: LearnerWorkspaceData;
      }>(`/api/simulations/${activeSim.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({
          response: responseText.trim(),
          elapsedSeconds,
        }),
      });
      setActiveSim(res.simulation);
      setResponseText('');
      onWorkspaceUpdate(res.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit stage decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentStage =
    activeSim && activeSim.status === 'active'
      ? activeSim.stages[activeSim.currentStage]
      : null;

  const remainingSeconds = currentStage
    ? Math.max(0, currentStage.deadlineSeconds - elapsedSeconds)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#18221D] dark:text-[#ECF2EE]">
            Workplace Simulation &amp; Unexpected Boss Arena
          </h2>
          <p className="text-sm text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
            Experience realistic workdays, unexpected manager/client twists, timed technical escape locks, and ethical dilemmas wired directly to your Skill DNA.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedCareerId}
            onChange={(e) => setSelectedCareerId(e.target.value)}
            aria-label="Select Career Track"
            className="px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-xs font-medium"
          >
            {careers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Mode Launcher Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SIM_MODE_CARDS.map((card) => {
          const Icon = card.icon;
          const isSelected = selectedKind === card.kind;
          return (
            <div
              key={card.kind}
              className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-colors ${
                isSelected
                  ? 'bg-[#EDF5F0] dark:bg-[#16231C] border-[#2D6A4F] dark:border-[#52B788]'
                  : 'bg-white dark:bg-[#151C18] border-[#DCE5DF] dark:border-[#24302A]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Icon className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D]" />
                  <span className="text-[11px] font-mono text-[#5C6B63] dark:text-[#99A8A0]">
                    3 Stages
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#18221D] dark:text-[#ECF2EE]">{card.title}</h3>
                <p className="text-xs text-[#4B5952] dark:text-[#A9B7AF] mt-1 leading-relaxed">
                  {card.subtitle}
                </p>
              </div>
              <button
                type="button"
                disabled={starting}
                onClick={() => {
                  setSelectedKind(card.kind);
                  handleStartSimulation(card.kind);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold whitespace-nowrap disabled:opacity-60"
              >
                <span>{starting && selectedKind === card.kind ? 'Starting...' : 'Launch Simulation'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Active Simulation Desk */}
      {activeSim && currentStage && (
        <section className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#DCE5DF] dark:border-[#24302A]">
            <div>
              <p className="text-xs font-mono text-[#2D6A4F] dark:text-[#74C69D]">
                {activeSim.simKind.replace('_', ' ').toUpperCase()} · {activeSim.difficulty.toUpperCase()} · Skill: {activeSim.skillApplied}
              </p>
              <h3 className="text-lg font-bold text-[#18221D] dark:text-[#ECF2EE] mt-0.5">
                {activeSim.title}
              </h3>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <span className="text-[#5C6B63] dark:text-[#99A8A0]">
                Stage {currentStage.stageNumber} / {activeSim.totalStages}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  remainingSeconds <= 30
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-[#2D6A4F] dark:text-[#74C69D]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {Math.floor(remainingSeconds / 60)}:
                  {String(remainingSeconds % 60).padStart(2, '0')} target
                </span>
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-base font-semibold text-[#18221D] dark:text-[#ECF2EE]">
              {currentStage.title}
            </h4>
            <p className="text-sm text-[#4B5952] dark:text-[#A9B7AF] leading-relaxed">
              {currentStage.briefing}
            </p>

            {currentStage.twist && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-1.5">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    LIVE DISRUPTION · {currentStage.twist.speaker} ({currentStage.twist.roleLabel})
                  </span>
                </p>
                <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-100">
                  “{currentStage.twist.message}”
                </p>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  Updated Constraint: {currentStage.twist.requirementChange}
                </p>
              </div>
            )}

            <pre className="p-4 rounded-xl bg-[#101613] text-[#D8E7DF] text-xs font-mono overflow-x-auto leading-relaxed border border-[#24302A]">
              {currentStage.artifactSnippet}
            </pre>

            <div className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#19221D] border border-[#DCE5DF] dark:border-[#24302A] space-y-3">
              <p className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                Your Action &amp; Decision: {currentStage.promptQuestion}
              </p>
              <textarea
                rows={5}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your technical fix, reasoning, security/edge-case checks, and stakeholder response..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#101613] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                  Evaluated on Problem-Solving, Technical Accuracy, Decision-Making, Communication &amp; Time Management.
                </span>
                <button
                  type="button"
                  onClick={handleSubmitStage}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold whitespace-nowrap disabled:opacity-60"
                >
                  <span>
                    {submitting
                      ? 'Evaluating Stage...'
                      : currentStage.stageNumber === activeSim.totalStages
                        ? 'Complete Shift & Update Skill DNA'
                        : 'Submit & Advance Stage'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Completed Simulation Result & Multi-Axis Rubric */}
      {activeSim && activeSim.status === 'completed' && activeSim.rubric && (
        <section className="p-6 sm:p-7 rounded-2xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#CFE2D6] dark:border-[#243B2E]">
            <div>
              <p className="text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulation Completed · Skill DNA &amp; Progress Updated</span>
              </p>
              <h3 className="text-lg font-bold text-[#18221D] dark:text-[#ECF2EE] mt-1">
                {activeSim.title}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">Overall Readiness</p>
              <p className="text-3xl font-bold font-mono tabular-nums text-[#2D6A4F] dark:text-[#74C69D]">
                {activeSim.overallScore}%
              </p>
            </div>
          </div>

          <p className="text-sm text-[#18221D] dark:text-[#ECF2EE] leading-relaxed">
            {activeSim.summaryFeedback}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Problem Solving', val: activeSim.rubric.problemSolving },
              { label: 'Technical Accuracy', val: activeSim.rubric.technicalAccuracy },
              { label: 'Decision Making', val: activeSim.rubric.decisionMaking },
              { label: 'Communication', val: activeSim.rubric.communication },
              { label: 'Time Management', val: activeSim.rubric.timeManagement },
              ...(activeSim.rubric.privacyAwareness !== undefined
                ? [
                    { label: 'Privacy Awareness', val: activeSim.rubric.privacyAwareness },
                    { label: 'Fairness', val: activeSim.rubric.fairness ?? 0 },
                    { label: 'Safety Awareness', val: activeSim.rubric.safetyAwareness ?? 0 },
                    { label: 'Responsibility', val: activeSim.rubric.professionalResponsibility ?? 0 },
                  ]
                : []),
            ].map((axis) => (
              <div
                key={axis.label}
                className="p-3.5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]"
              >
                <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0]">{axis.label}</p>
                <p className="text-xl font-bold font-mono tabular-nums text-[#2D6A4F] dark:text-[#74C69D] mt-1">
                  {axis.val}%
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('skill-dna')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2D6A4F] text-white text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Inspect Updated Skill DNA</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('career-arena', { arenaTab: 'reverse-teaching' })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-xs font-semibold"
            >
              <span>Reinforce via Reverse Teaching</span>
            </button>
          </div>
        </section>
      )}

      {/* Past Simulations History */}
      <section className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
        <h3 className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE] mb-4">
          Your Simulation History ({workspace.workplaceSimulations.length})
        </h3>
        {workspace.workplaceSimulations.length === 0 ? (
          <p className="text-sm text-[#5C6B63] dark:text-[#99A8A0]">
            Launch a Workday, Boss Challenge, Escape Room, or Ethical Arena above to experience real workplace pressure.
          </p>
        ) : (
          <div className="divide-y divide-[#E4ECE7] dark:divide-[#24302A]">
            {workspace.workplaceSimulations.map((sim) => (
              <div
                key={sim.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE]">{sim.title}</p>
                  <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                    {sim.simKind.replace('_', ' ')} · Skill: {sim.skillApplied} · Stage {sim.currentStage}/{sim.totalStages}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono tabular-nums text-sm font-bold text-[#2D6A4F] dark:text-[#74C69D]">
                    {sim.overallScore !== null ? `${sim.overallScore}%` : 'In Progress'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSim(sim)}
                    className="px-3 py-1.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] text-xs font-semibold hover:bg-[#F1F6F3] dark:hover:bg-[#1D2822] whitespace-nowrap"
                  >
                    {sim.status === 'active' ? 'Resume' : 'Inspect Rubric'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
