import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Compass,
  Eye,
  Globe,
  GraduationCap,
  Search,
} from 'lucide-react';
import { apiFetch, type AssessmentLaunchContext, type PageRoute } from '../lib/api';
import { playPopSound } from '../lib/sound';
import type { CareerCompatibility, CareerRole, LearnerWorkspaceData } from '../types';

interface CareerWorldItem {
  careerId: string;
  worldName: string;
  worldSubtitle: string;
  atmosphereTag: string;
  realisticDailyTasks: string[];
  practicalChallenges: string[];
  expectationMyth: string;
  dayToDayReality: string;
  communicationLoad: string;
  learningDifficultyCurve: string;
  expectationVsRealityRows: Array<{
    dimension: string;
    studentExpectation: string;
    industryReality: string;
  }>;
  expectationCheckQuestion: {
    prompt: string;
    options: string[];
    correctAnswer: string;
    insight: string;
  };
  career: CareerRole;
}

interface CareerExplorerPageProps {
  workspace: LearnerWorkspaceData;
  compatibilities: CareerCompatibility[];
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
  onNavigate: (
    route: PageRoute,
    context?: AssessmentLaunchContext & { careerId?: string }
  ) => void;
}

export function CareerExplorerPage({
  workspace,
  compatibilities,
  onWorkspaceUpdate,
  onNavigate,
}: CareerExplorerPageProps) {
  const [query, setQuery] = useState('');
  const [selectedCareerId, setSelectedCareerId] = useState<string>(
    workspace.profile.targetCareerId || compatibilities[0]?.career.id || ''
  );
  const [viewMode, setViewMode] = useState<'universe' | 'guidance' | 'reality'>('universe');
  const [worlds, setWorlds] = useState<CareerWorldItem[]>([]);
  const [quizAnswer, setQuizAnswer] = useState<string>('');
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ worlds: CareerWorldItem[] }>('/api/universe')
      .then((res) => setWorlds(res.worlds || []))
      .catch(() => {
        // tolerate network error; detail panel still uses compatibilities
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return compatibilities;
    return compatibilities.filter(
      (c) =>
        c.career.title.toLowerCase().includes(q) ||
        c.career.category.toLowerCase().includes(q) ||
        c.career.requirements.some((r) => r.skillName.toLowerCase().includes(q))
    );
  }, [compatibilities, query]);

  const activeDetail =
    compatibilities.find((c) => c.career.id === selectedCareerId) || filtered[0] || null;
  const activeWorld =
    worlds.find((w) => w.careerId === activeDetail?.career.id) || null;

  const handleSelectCareer = (careerId: string) => {
    playPopSound('nav');
    setSelectedCareerId(careerId);
    setQuizAnswer('');
  };

  const handleSwitchCareer = async (careerId: string) => {
    setSwitching(true);
    setError(null);
    try {
      const res = await apiFetch<{ workspace: LearnerWorkspaceData }>('/api/careers/switch', {
        method: 'POST',
        body: JSON.stringify({ targetCareerId: careerId }),
      });
      onWorkspaceUpdate(res.workspace);
      onNavigate('syllabus', { careerId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to switch career goal');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Career Universe · Guidance &amp; Reality vs Expectation
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Step inside interactive career worlds, test realistic daily tasks, compare hype vs industry reality, and connect straight into courses &amp; assessments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-[#DCE5DF] dark:border-[#24302A] bg-white dark:bg-[#151C18] p-0.5 text-xs">
            {[
              { id: 'universe', label: 'Career Worlds', icon: Globe },
              { id: 'guidance', label: 'Role Courses & Skills', icon: Compass },
              { id: 'reality', label: 'Reality vs Expectation', icon: Eye },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playPopSound('nav');
                    setViewMode(tab.id as typeof viewMode);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white'
                      : 'text-[#4B5952] dark:text-[#A9B7AF]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search worlds or skills..."
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#151C18] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-2.5">
          {filtered.map((item) => {
            const isCurrentGoal = workspace.profile.targetCareerId === item.career.id;
            const isSelected = activeDetail?.career.id === item.career.id;
            const worldMeta = worlds.find((w) => w.careerId === item.career.id);
            return (
              <button
                key={item.career.id}
                onClick={() => handleSelectCareer(item.career.id)}
                className={`w-full p-4 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? 'bg-[#EDF5F0] dark:bg-[#16231C] border-[#2D6A4F] dark:border-[#52B788]'
                    : 'bg-white dark:bg-[#151C18] border-[#DCE5DF] dark:border-[#24302A] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.career.title}
                  </span>
                  <span className="text-sm font-mono tabular-nums font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                    {item.compatibilityScore}% match
                  </span>
                </div>
                {worldMeta && (
                  <p className="text-[11px] font-medium text-[#2D6A4F] dark:text-[#74C69D] mt-0.5">
                    {worldMeta.worldName} · {worldMeta.atmosphereTag}
                  </p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {item.career.category} · {item.career.courses.length} courses · ~{item.estimatedLearningHours}h effort
                  {isCurrentGoal ? ' · Active Goal' : ''}
                </p>
              </button>
            );
          })}
        </div>

        {activeDetail && (
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-6 h-fit">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[#DCE5DF] dark:border-[#24302A]">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeWorld ? `${activeWorld.worldName} · ` : ''}
                  {activeDetail.career.category} · {activeDetail.career.medianSalaryRange} · {activeDetail.career.demandOutlook}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {activeDetail.career.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {activeWorld ? activeWorld.worldSubtitle : activeDetail.career.description}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">Compatibility</p>
                <p className="text-3xl font-bold font-mono tabular-nums text-[#2D6A4F] dark:text-[#74C69D]">
                  {activeDetail.compatibilityScore}%
                </p>
              </div>
            </div>

            {/* VIEW 1: CAREER UNIVERSE WORLD TASKS & WORKDAY LAUNCHER */}
            {viewMode === 'universe' && (
              <div className="space-y-5">
                {activeWorld ? (
                  <>
                    <div className="p-4 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] space-y-2.5">
                      <p className="text-xs font-semibold text-[#1B4332] dark:text-[#95D5B2]">
                        Realistic Daily Job Tasks in {activeWorld.worldName}
                      </p>
                      <ul className="space-y-1.5 text-xs sm:text-sm text-[#18221D] dark:text-[#ECF2EE]">
                        {activeWorld.realisticDailyTasks.map((task, idx) => (
                          <li key={idx}>• {task}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#24302A] space-y-2">
                      <p className="text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                        Core Workplace Challenges You Will Face
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {activeWorld.practicalChallenges.map((ch, idx) => (
                          <li key={idx}>• {ch}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">{activeDetail.career.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate('workplace-sim', {
                        careerId: activeDetail.career.id,
                        simKind: 'workday',
                      })
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Enter “One Day as a {activeDetail.career.title}”</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate('assessments', {
                        skill: activeDetail.career.requirements[0]?.skillName || 'JavaScript',
                        difficulty: 'beginner',
                        assessmentMode: 'practice_workplace',
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] text-xs font-semibold hover:bg-[#F1F6F3] dark:hover:bg-[#1D2822]"
                  >
                    <span>Try Role Skill Check</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('career-arena', { arenaTab: 'parallel' })}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] text-xs font-semibold hover:bg-[#F1F6F3] dark:hover:bg-[#1D2822]"
                  >
                    <span>Compare 3 Roles Side-by-Side</span>
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 2: FULL GUIDANCE, REQUIRED SKILLS & ROLE COURSES */}
            {viewMode === 'guidance' && (
              <div className="space-y-5">
                {activeDetail.career.careerGuidance && (
                  <div className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#24302A] space-y-1.5">
                    <p className="text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] inline-flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      <span>Full Career Guidance Strategy</span>
                    </p>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {activeDetail.career.careerGuidance}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-3">Required Technical Competencies</h4>
                  <div className="divide-y divide-[#E4ECE7] dark:divide-[#24302A] border border-[#DCE5DF] dark:border-[#24302A] rounded-xl overflow-hidden">
                    {activeDetail.career.requirements.map((req) => {
                      const met = activeDetail.metSkills.find(
                        (m) => m.skillName.toLowerCase() === req.skillName.toLowerCase()
                      );
                      const miss = activeDetail.missingSkills.find(
                        (m) => m.skillName.toLowerCase() === req.skillName.toLowerCase()
                      );
                      const current = met ? met.currentScore : miss?.currentScore || 0;
                      return (
                        <div key={req.skillName} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                          <div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">{req.skillName}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                              {req.importance.replace('_', ' ')} · Target {req.requiredLevel}%
                            </span>
                          </div>
                          <span
                            className={`text-xs font-mono tabular-nums font-semibold ${
                              met ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            You: {current}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {activeDetail.career.courses.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D]" />
                        <span>Role Courses ({activeDetail.career.courses.length})</span>
                      </h4>
                      <button
                        onClick={() => onNavigate('syllabus', { careerId: activeDetail.career.id })}
                        className="text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline inline-flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Open Role Courses &amp; Syllabus</span>
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {activeDetail.career.courses.map((crs) => {
                        const primarySkill = crs.syllabusModules[0]?.skillFocus || activeDetail.career.requirements[0]?.skillName || 'JavaScript';
                        return (
                          <div
                            key={crs.id}
                            className="p-3.5 rounded-xl border border-[#DCE5DF] dark:border-[#24302A] bg-[#F6F9F7] dark:bg-[#18211C] text-xs space-y-2"
                          >
                            <p className="font-mono text-[#2D6A4F] dark:text-[#74C69D] font-semibold">
                              {crs.courseCode} · {crs.level} ({crs.hours}h)
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-white">{crs.title}</p>
                            <p className="text-slate-500 dark:text-slate-400 line-clamp-2">{crs.description}</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                onClick={() =>
                                  onNavigate('assessments', {
                                    skill: primarySkill,
                                    difficulty: 'beginner',
                                    assessmentType: 'mcq',
                                    assessmentMode: 'practice_workplace',
                                    courseCode: crs.courseCode,
                                  })
                                }
                                className="px-2 py-1 rounded border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-[11px] font-semibold hover:border-[#2D6A4F]"
                              >
                                Basic MCQ
                              </button>
                              <button
                                onClick={() =>
                                  onNavigate('assessments', {
                                    skill: primarySkill,
                                    difficulty: 'advanced',
                                    assessmentType: 'coding',
                                    assessmentMode: 'practice_workplace',
                                    courseCode: crs.courseCode,
                                  })
                                }
                                className="px-2 py-1 rounded border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-[11px] font-semibold hover:border-[#2D6A4F]"
                              >
                                High Coding
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: CAREER REALITY VS EXPECTATION */}
            {viewMode === 'reality' && activeWorld && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-1">
                    <p className="font-bold text-amber-800 dark:text-amber-200">Common Student Expectation</p>
                    <p className="text-amber-900 dark:text-amber-100 leading-relaxed">
                      {activeWorld.expectationMyth}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] space-y-1">
                    <p className="font-bold text-[#1B4332] dark:text-[#95D5B2]">Honest Day-to-Day Reality</p>
                    <p className="text-[#18221D] dark:text-[#ECF2EE] leading-relaxed">
                      {activeWorld.dayToDayReality}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-[#E4ECE7] dark:divide-[#24302A] border border-[#DCE5DF] dark:border-[#24302A] rounded-xl overflow-hidden text-xs">
                  {activeWorld.expectationVsRealityRows.map((row) => (
                    <div key={row.dimension} className="p-4 grid sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-3 font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                        {row.dimension}
                      </div>
                      <div className="sm:col-span-4 text-amber-700 dark:text-amber-300">
                        Expectation: {row.studentExpectation}
                      </div>
                      <div className="sm:col-span-5 text-[#2D6A4F] dark:text-[#74C69D]">
                        Reality: {row.industryReality}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#19221D] border border-[#DCE5DF] dark:border-[#24302A] text-xs space-y-1">
                  <p><span className="font-semibold">Communication Load:</span> {activeWorld.communicationLoad}</p>
                  <p><span className="font-semibold">Learning Difficulty Curve:</span> {activeWorld.learningDifficultyCurve}</p>
                </div>

                {/* Quick Expectation-Check Scenario */}
                <div className="p-4 rounded-xl border border-[#DCE5DF] dark:border-[#24302A] space-y-3">
                  <p className="text-xs font-bold text-[#2D6A4F] dark:text-[#74C69D]">
                    Reality Check Question
                  </p>
                  <p className="text-sm font-medium text-[#18221D] dark:text-[#ECF2EE]">
                    {activeWorld.expectationCheckQuestion.prompt}
                  </p>
                  <div className="space-y-2">
                    {activeWorld.expectationCheckQuestion.options.map((opt) => {
                      const picked = quizAnswer === opt;
                      const isRight = opt === activeWorld.expectationCheckQuestion.correctAnswer;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            playPopSound('pop');
                            setQuizAnswer(opt);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs transition-colors ${
                            picked
                              ? isRight
                                ? 'bg-[#EDF5F0] dark:bg-[#16231C] border-[#2D6A4F] text-[#1B4332] dark:text-[#95D5B2] font-semibold'
                                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 text-rose-800 dark:text-rose-200'
                              : 'border-[#DCE5DF] dark:border-[#2B3932] hover:border-[#2D6A4F]'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {quizAnswer && (
                    <p className="text-xs text-[#2D6A4F] dark:text-[#74C69D] font-medium">
                      Insight: {activeWorld.expectationCheckQuestion.insight}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#DCE5DF] dark:border-[#24302A] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Transferable verified skills: {activeDetail.transferableSkills.join(', ') || 'None yet'}
              </div>
              {workspace.profile.targetCareerId === activeDetail.career.id ? (
                <button
                  onClick={() => onNavigate('syllabus', { careerId: activeDetail.career.id })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#EDF5F0] dark:bg-[#16231C] border border-[#2D6A4F]/40 text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Priority Active · Go to Role Courses</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => handleSwitchCareer(activeDetail.career.id)}
                  disabled={switching}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold transition-colors disabled:opacity-60"
                >
                  <span>
                    {switching
                      ? 'Saving Priority & Redirecting...'
                      : `Set Priority & Go to ${activeDetail.career.title} Courses`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
