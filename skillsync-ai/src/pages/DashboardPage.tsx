import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Flame,
  GraduationCap,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Target,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LivingCompanionCard } from '../components/LivingCompanionCard';
import { apiFetch, formatVerificationStatus, type AssessmentLaunchContext, type PageRoute } from '../lib/api';
import { t } from '../lib/i18n';
import { playPopSound } from '../lib/sound';
import type { AIAgentDecision, ExpertCouncilReport, LearnerWorkspaceData } from '../types';

interface DashboardPageProps {
  workspace: LearnerWorkspaceData;
  proctoringWarning: string | null;
  onDismissProctoringWarning: () => void;
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
  onNavigate: (route: PageRoute, context?: AssessmentLaunchContext & { careerId?: string }) => void;
  onInspectDecision: (decision: AIAgentDecision) => void;
}

export function DashboardPage({
  workspace,
  proctoringWarning,
  onDismissProctoringWarning,
  onWorkspaceUpdate,
  onNavigate,
  onInspectDecision,
}: DashboardPageProps) {
  const [conveningCouncil, setConveningCouncil] = useState(false);
  const [councilError, setCouncilError] = useState<string | null>(null);

  const {
    user,
    profile,
    skills,
    roadmap,
    assessments,
    publishedTests,
    upcomingSyllabus,
    progressRecords,
    agentDecisions,
    revisions,
    compatibility,
    expertCouncil,
    failureDna,
  } = workspace;

  const lang = user.preferredLanguage || 'en';
  const activeFailureCount = failureDna.filter((f) => f.status !== 'recovered').length;

  const handleConveneCouncil = async () => {
    playPopSound('action');
    setConveningCouncil(true);
    setCouncilError(null);
    try {
      const res = await apiFetch<{ report: ExpertCouncilReport; workspace: LearnerWorkspaceData }>(
        '/api/expert-council/convene',
        { method: 'POST' }
      );
      onWorkspaceUpdate(res.workspace);
    } catch (err) {
      setCouncilError(err instanceof Error ? err.message : 'Unable to convene Expert Council.');
    } finally {
      setConveningCouncil(false);
    }
  };

  const profileCompletion = useMemo(() => {
    let pts = 25;
    if (profile.institution) pts += 15;
    if (profile.workExperience) pts += 15;
    if (profile.previousProjects.length > 0 || workspace.projects.length > 0) pts += 15;
    if (skills.some((s) => s.verificationStatus !== 'self_declared')) pts += 15;
    if (profile.onboardingCompleted) pts += 15;
    return Math.min(100, pts);
  }, [profile, skills, workspace.projects.length]);

  const verifiedSkills = skills.filter((s) => s.verificationStatus !== 'self_declared');
  const skillsNeedingImprovement = skills.filter(
    (s) => s.verifiedScore < 70 || s.verificationStatus === 'self_declared'
  );

  const overallSkillScore = useMemo(() => {
    if (skills.length === 0) return 0;
    const sum = skills.reduce((acc, s) => acc + s.verifiedScore, 0);
    return Math.round(sum / skills.length);
  }, [skills]);

  const weeklyChartData = useMemo(() => {
    const days: Array<{ label: string; minutes: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const mins = progressRecords
        .filter((p) => p.recordedAt.slice(0, 10) === key)
        .reduce((acc, p) => acc + p.minutesSpent, 0);
      days.push({ label, minutes: mins });
    }
    return days;
  }, [progressRecords]);

  const latestDecision = agentDecisions[0] || null;
  const completedMilestones = roadmap?.milestones.filter((m) => m.status === 'completed').length ?? 0;
  const totalMilestones = roadmap?.milestones.length ?? 0;
  const pendingRevisions = revisions.filter((r) => r.status === 'pending');

  const completedAssessments = assessments.filter((a) => a.status === 'completed');
  const terminatedAssessments = assessments.filter((a) => a.status === 'terminated_proctoring');
  const avgAssessmentScore =
    completedAssessments.length > 0
      ? Math.round(
          completedAssessments.reduce((acc, a) => acc + (a.score ?? 0), 0) / completedAssessments.length
        )
      : 0;

  const topSyllabus = upcomingSyllabus[0] || null;

  const jsSkill = skills.find((s) => s.skillName.toLowerCase() === 'javascript');
  const jsAssessments = completedAssessments.filter((a) => a.skillName.toLowerCase() === 'javascript');
  const hasLowJsAttempt = jsAssessments.some((a) => (a.score ?? 100) < 55);
  const hasHighJsVerified = (jsSkill?.verifiedScore ?? 0) >= 75 && jsSkill?.verificationStatus !== 'self_declared';
  const switchedToSecurity = profile.targetCareerId === 'cybersecurity-analyst';

  return (
    <div className="space-y-6">
      {(proctoringWarning || terminatedAssessments.length > 0) && (
        <section
          role="alert"
          className="p-5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-start justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-rose-900 dark:text-rose-100">
                {t(lang, 'proctoringBannerTitle')}
              </h2>
              <p className="text-xs text-rose-800 dark:text-rose-200 mt-1 leading-relaxed">
                {proctoringWarning ||
                  `Your most recent attempt (${terminatedAssessments[0]?.title}) was automatically terminated after ${terminatedAssessments[0]?.tabSwitchCount} tab/window switches (maximum allowed: 3). This incident is logged in the University Admin Portal.`}
              </p>
            </div>
          </div>
          {proctoringWarning && (
            <button
              onClick={onDismissProctoringWarning}
              className="p-1.5 rounded-lg text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 shrink-0"
              aria-label="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </section>
      )}

      {/* Welcome & Career Goal Banner */}
      <section className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C6B63] dark:text-[#99A8A0]">
            <span className="font-mono font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
              Roll No. {user.rollNumber} ({user.email})
            </span>
            <span aria-hidden="true">·</span>
            <span>Target: {compatibility?.career.title || profile.targetCareerId}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Profile {profileCompletion}% complete</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums text-amber-700 dark:text-amber-400 font-medium">
              <Flame className="w-3.5 h-3.5" />
              {profile.streakDays}-day streak
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#18221D] dark:text-[#ECF2EE]">
            {t(lang, 'welcomeBack')}, {user.fullName.split(' ')[0]}
          </h2>
          <p className="text-sm text-[#4B5952] dark:text-[#A9B7AF] max-w-2xl">
            {latestDecision
              ? latestDecision.orchestratorSummary
              : 'Your Skill DNA, upcoming syllabus recommendations, and adaptive roadmap are synchronized.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            data-sound="dashboard"
            onClick={() => onNavigate('assessments', { skill: skillsNeedingImprovement[0]?.skillName || 'JavaScript' })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <Target className="w-4 h-4" />
            <span>{t(lang, 'takeAssessment')} ({publishedTests.length})</span>
          </button>
          <button
            data-sound="dashboard"
            onClick={() => onNavigate('mentor')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#F6F9F7] dark:bg-[#1A221E] text-[#18221D] dark:text-[#ECF2EE] hover:bg-[#EBF3EE] dark:hover:bg-[#222D28] text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D]" />
            <span>{t(lang, 'askMentor')}</span>
          </button>
          <button
            data-sound="profile"
            onClick={() => onNavigate('profile')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-[#18221D] dark:text-[#ECF2EE] hover:bg-[#F1F6F3] dark:hover:bg-[#1D2822] text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <UserCircle className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D]" />
            <span>{t(lang, 'profile')}</span>
          </button>
        </div>
      </section>

      {/* Living AI Career Companion ("Zyra") */}
      <LivingCompanionCard
        workspace={workspace}
        onWorkspaceUpdate={onWorkspaceUpdate}
        onNavigate={onNavigate}
      />

      {/* Primary KPI Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
          <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">Overall Skill Score</p>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1.5 text-[#18221D] dark:text-[#ECF2EE]">
            {overallSkillScore}%
          </p>
          <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1 tabular-nums">
            {verifiedSkills.length} verified · {skills.length - verifiedSkills.length} self-declared
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E]">
          <p className="text-xs text-[#3D5247] dark:text-[#95D5B2]">Career Compatibility</p>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1.5 text-[#2D6A4F] dark:text-[#74C69D]">
            {compatibility?.compatibilityScore ?? 0}%
          </p>
          <p className="text-xs text-[#4B5952] dark:text-[#A9B7AF] mt-1 tabular-nums">
            ~{compatibility?.estimatedLearningHours ?? 0}h remaining gap
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
          <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">Indicative Readiness</p>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1.5 text-[#18221D] dark:text-[#ECF2EE]">
            {compatibility?.indicativeReadinessEstimate ?? 0}%
          </p>
          <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0] mt-1">
            Indicative estimate only
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
          <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">Assessment Avg</p>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1.5 text-[#18221D] dark:text-[#ECF2EE]">
            {avgAssessmentScore}%
          </p>
          <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1 tabular-nums">
            {completedAssessments.length} passed · {pendingRevisions.length} decay · {activeFailureCount} Failure DNA
          </p>
        </div>
      </section>

      {/* AI Expert Council (4 Collaborative Agents + Central Orchestrator) */}
      <section className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>AI Expert Council (4 Collaborative Agents + Central Orchestrator)</span>
            </p>
            <h3 className="text-base font-bold text-[#18221D] dark:text-[#ECF2EE] mt-0.5">
              {expertCouncil
                ? 'Latest Council Synthesis & Adaptive Curriculum Action'
                : 'Evaluate Readiness Across Career, Technical, Learning & Industry Agents'}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('workplace-sim')}
              className="px-3.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] text-xs font-semibold hover:bg-[#F1F6F3] dark:hover:bg-[#1D2822] whitespace-nowrap"
            >
              Workday &amp; Boss Sim
            </button>
            <button
              type="button"
              onClick={() => onNavigate('career-arena')}
              className="px-3.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] text-xs font-semibold hover:bg-[#F1F6F3] dark:hover:bg-[#1D2822] whitespace-nowrap"
            >
              Challenges &amp; Missions
            </button>
            <button
              type="button"
              disabled={conveningCouncil}
              onClick={handleConveneCouncil}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold whitespace-nowrap disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{conveningCouncil ? 'Convening 4 Agents...' : 'Convene AI Expert Council'}</span>
            </button>
          </div>
        </div>

        {councilError && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{councilError}</p>
        )}

        {expertCouncil ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {expertCouncil.members.map((m) => (
                <div
                  key={m.agentRole}
                  className="p-3.5 rounded-xl bg-[#F6F9F7] dark:bg-[#19221D] border border-[#DCE5DF] dark:border-[#24302A] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#18221D] dark:text-[#ECF2EE]">{m.agentRole}</span>
                    <span className="font-mono font-bold text-[#2D6A4F] dark:text-[#74C69D] tabular-nums">
                      {m.score}/100
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-[#5C6B63] dark:text-[#99A8A0]">
                    {m.focusArea} · Stance: {m.stance.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-[#4B5952] dark:text-[#A9B7AF] leading-snug">
                    {m.recommendation}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-lg bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] text-xs space-y-1">
              <p className="font-semibold text-[#1B4332] dark:text-[#95D5B2]">
                Orchestrator Verdict: {expertCouncil.orchestratorVerdict}
              </p>
              {expertCouncil.disagreements.length > 0 && (
                <p className="text-[#4B5952] dark:text-[#A9B7AF]">
                  Resolved Disagreement: {expertCouncil.disagreements[0]}
                </p>
              )}
              {expertCouncil.appliedSystemUpdates.length > 0 && (
                <p className="text-[#2D6A4F] dark:text-[#74C69D]">
                  Applied Updates: {expertCouncil.appliedSystemUpdates.join(' · ')}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
            Click “Convene AI Expert Council” to let the Career Coach, Technical Expert, Learning Observer, and Industry Mentor audit your telemetry and apply live roadmap/revision adjustments.
          </p>
        )}
      </section>

      {/* Recommended Upcoming Syllabus Module + Weekly Activity */}
      <section className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 p-6 rounded-xl bg-[#F2F7F4] dark:bg-[#16211B] border border-[#CFE2D6] dark:border-[#25382E] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                <GraduationCap className="w-4 h-4" />
                <span>{t(lang, 'upcomingSyllabus')}</span>
              </span>
              <button
                data-sound="dashboard"
                onClick={() => onNavigate('syllabus')}
                className="text-xs font-medium text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
              >
                All Courses &amp; Syllabus
              </button>
            </div>

            {topSyllabus ? (
              <div className="space-y-2">
                <p className="text-xs font-mono text-[#5C6B63] dark:text-[#99A8A0]">
                  {topSyllabus.courseCode} · {topSyllabus.moduleCode} · Focus: {topSyllabus.skillFocus} ({topSyllabus.estimatedHours}h)
                </p>
                <h3 className="text-lg font-bold text-[#18221D] dark:text-[#ECF2EE]">
                  {topSyllabus.recommendedModuleTitle}
                </h3>
                <p className="text-sm text-[#4B5952] dark:text-[#A9B7AF] leading-relaxed">
                  {topSyllabus.rationale}
                </p>
                <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] pt-1">
                  Topics: {topSyllabus.topics.join(' · ')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#5C6B63] dark:text-[#99A8A0]">
                Open Courses &amp; Syllabus to generate your personalized upcoming syllabus recommendation.
              </p>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-[#D7E6DC] dark:border-[#25382E] flex flex-wrap gap-4">
            <button
              data-sound="dashboard"
              onClick={() => onNavigate('syllabus')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
            >
              <span>Inspect Upcoming Syllabus ({upcomingSyllabus.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {latestDecision && (
              <button
                data-sound="dashboard"
                onClick={() => onInspectDecision(latestDecision)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4B5952] dark:text-[#A9B7AF] hover:text-[#2D6A4F]"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Inspect 6-Agent Trace</span>
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-6 p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                Weekly Learning Activity (Minutes)
              </h3>
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                Target pace: {profile.dailyLearningMinutes} min/day
              </p>
            </div>
            <button
              data-sound="dashboard"
              onClick={() => onNavigate('analytics')}
              className="text-xs font-medium text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
            >
              Detailed Analytics
            </button>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94A39B" opacity={0.2} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#6B7A72" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6B7A72" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151C18',
                    borderColor: '#2B3932',
                    borderRadius: '8px',
                    color: '#ECF2EE',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="minutes" fill="#2D6A4F" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Skill DNA & Roadmap Preview */}
      <section className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE]">
              Skill Verification &amp; Gaps
            </h3>
            <button
              data-sound="dashboard"
              onClick={() => onNavigate('skill-dna')}
              className="text-xs font-medium text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
            >
              Open Skill DNA
            </button>
          </div>

          <div className="divide-y divide-[#E4ECE7] dark:divide-[#24302A]">
            {skills.slice(0, 6).map((sk) => (
              <div key={sk.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#18221D] dark:text-[#ECF2EE] truncate">
                    {sk.skillName}
                  </p>
                  <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                    {formatVerificationStatus(sk.verificationStatus)}
                    {sk.weakConcepts.length > 0 && ` · Focus: ${sk.weakConcepts[0]}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24 h-2 rounded-full bg-[#E8EFEA] dark:bg-[#222D28] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        sk.verifiedScore >= 75
                          ? 'bg-[#2D6A4F] dark:bg-[#52B788]'
                          : sk.verifiedScore >= 45
                            ? 'bg-amber-500'
                            : 'bg-rose-600'
                      }`}
                      style={{ width: `${sk.verifiedScore}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono tabular-nums w-9 text-right font-semibold">
                    {sk.verifiedScore}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE]">
              Roadmap Stages ({completedMilestones}/{totalMilestones})
            </h3>
            <button
              data-sound="dashboard"
              onClick={() => onNavigate('roadmap')}
              className="text-xs font-medium text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
            >
              Full Roadmap
            </button>
          </div>

          <div className="divide-y divide-[#E4ECE7] dark:divide-[#24302A]">
            {(roadmap?.milestones || []).slice(0, 5).map((ms) => (
              <div key={ms.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#18221D] dark:text-[#ECF2EE] truncate">
                    0{ms.stageOrder}. {ms.title}
                  </p>
                  <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] truncate">
                    {ms.skillName} · {ms.difficulty} · {ms.estimatedHours}h
                    {ms.isReusableTransfer ? ' · Transferred' : ''}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    ms.status === 'completed'
                      ? 'text-[#2D6A4F] dark:text-[#74C69D]'
                      : ms.status === 'needs_revision'
                        ? 'text-rose-600 dark:text-rose-400'
                        : ms.status === 'in_progress'
                          ? 'text-[#1B4332] dark:text-[#95D5B2]'
                          : 'text-[#7B8A82] dark:text-[#6B7A72]'
                  }`}
                >
                  {ms.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>

          {pendingRevisions.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Revision scheduled for {pendingRevisions[0].skillName} ({pendingRevisions[0].urgency} priority)
                </span>
              </div>
              <button
                data-sound="dashboard"
                onClick={() => onNavigate('decay')}
                className="text-xs font-semibold text-amber-900 dark:text-amber-200 hover:underline whitespace-nowrap"
              >
                Review
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Demo Scenario Guided Tracker */}
      {user.isDemo && (
        <section className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-medium text-[#2D6A4F] dark:text-[#74C69D]">
                Roll 2501 Demonstration · Adaptive Journey
              </p>
              <h3 className="text-base font-semibold text-[#18221D] dark:text-[#ECF2EE] mt-0.5">
                Interactive Quick Actions
              </h3>
            </div>
            <span className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
              Live Gemini AI orchestration &amp; SQLite persistence
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              data-sound="dashboard"
              onClick={() => onNavigate('assessments', { skill: 'JavaScript' })}
              className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#25322C] text-left hover:border-[#2D6A4F] dark:hover:border-[#52B788] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#2D6A4F] dark:text-[#74C69D]">Step 1</span>
                {hasLowJsAttempt && <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />}
              </div>
              <p className="text-sm font-semibold mt-1">Take Proctored JS Exam</p>
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
                Fullscreen 3-switch guard + adaptive remediation on low scores.
              </p>
            </button>

            <button
              data-sound="dashboard"
              onClick={() => onNavigate('mentor')}
              className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#25322C] text-left hover:border-[#2D6A4F] dark:hover:border-[#52B788] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#2D6A4F] dark:text-[#74C69D]">Step 2</span>
              </div>
              <p className="text-sm font-semibold mt-1">Ask Multilingual AI Mentor</p>
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
                Switch Indian languages and get hints mapped to Python.
              </p>
            </button>

            <button
              data-sound="dashboard"
              onClick={() => onNavigate('syllabus')}
              className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#25322C] text-left hover:border-[#2D6A4F] dark:hover:border-[#52B788] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#2D6A4F] dark:text-[#74C69D]">Step 3</span>
                {hasHighJsVerified && <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />}
              </div>
              <p className="text-sm font-semibold mt-1">Courses &amp; Next Syllabus</p>
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
                Refresh Gemini upcoming syllabus picks &amp; verify JS &gt;= 75%.
              </p>
            </button>

            <button
              data-sound="dashboard"
              onClick={() => onNavigate('simulator')}
              className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#25322C] text-left hover:border-[#2D6A4F] dark:hover:border-[#52B788] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#2D6A4F] dark:text-[#74C69D]">Step 4</span>
                {switchedToSecurity && <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />}
              </div>
              <p className="text-sm font-semibold mt-1">Switch to Cybersecurity</p>
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
                Simulate &amp; switch role while preserving verified competencies.
              </p>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
