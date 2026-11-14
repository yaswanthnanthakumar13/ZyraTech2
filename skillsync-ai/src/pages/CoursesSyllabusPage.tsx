import { useEffect, useState } from 'react';
import { Clock, Code2, Compass, GraduationCap, RefreshCw, Sparkles, Target } from 'lucide-react';
import { apiFetch, type AssessmentLaunchContext, type PageRoute } from '../lib/api';
import { t } from '../lib/i18n';
import type { CareerRole, LearnerWorkspaceData, SyllabusRecommendation } from '../types';

interface CoursesSyllabusPageProps {
  workspace: LearnerWorkspaceData;
  careers: CareerRole[];
  initialCareerId?: string;
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
  onNavigate: (route: PageRoute, context?: AssessmentLaunchContext) => void;
}

export function CoursesSyllabusPage({
  workspace,
  careers,
  initialCareerId,
  onWorkspaceUpdate,
  onNavigate,
}: CoursesSyllabusPageProps) {
  const lang = workspace.user.preferredLanguage || 'en';
  const [selectedCareerId, setSelectedCareerId] = useState(
    initialCareerId || workspace.profile.targetCareerId || careers[0]?.id || 'full-stack-developer'
  );
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLabKey, setExpandedLabKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCareerId && careers.some((c) => c.id === initialCareerId)) {
      setSelectedCareerId(initialCareerId);
    }
  }, [initialCareerId, careers]);

  const selectedCareer = careers.find((c) => c.id === selectedCareerId) || careers[0];
  const skillScoreMap = new Map(
    workspace.skills.map((s) => [s.skillName.toLowerCase(), s.verifiedScore])
  );

  const handleRefreshSyllabus = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await apiFetch<{
        recommendations: SyllabusRecommendation[];
        workspace: LearnerWorkspaceData;
      }>('/api/syllabus/recommend', { method: 'POST' });
      onWorkspaceUpdate(res.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh syllabus recommendations');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
              <Sparkles className="w-4 h-4" />
              <span>Gemini AI Upcoming Syllabus Recommender</span>
            </div>
            <h2 className="text-xl font-bold text-[#18221D] dark:text-[#ECF2EE] mt-0.5">
              {t(lang, 'upcomingSyllabus')}
            </h2>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
              Calculated from your Skill DNA gaps, recent assessment scores, and target career ({workspace.compatibility?.career.title}).
            </p>
          </div>

          <button
            onClick={handleRefreshSyllabus}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Asking Gemini AI...' : t(lang, 'refreshSyllabus')}</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspace.upcomingSyllabus.map((syl) => (
            <div
              key={syl.id}
              className="p-5 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#25322C] flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-[#2D6A4F] dark:text-[#74C69D] font-semibold">
                    {syl.courseCode} · {syl.moduleCode}
                  </span>
                  <span
                    className={`font-semibold uppercase ${
                      syl.priority === 'critical'
                        ? 'text-rose-600 dark:text-rose-400'
                        : syl.priority === 'recommended'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-[#2D6A4F] dark:text-[#74C69D]'
                    }`}
                  >
                    {syl.priority}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#18221D] dark:text-[#ECF2EE] mt-1.5">
                  {syl.recommendedModuleTitle}
                </h3>
                <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
                  Course: {syl.courseTitle} · Focus: {syl.skillFocus}
                </p>
                <p className="text-xs text-[#3E4C45] dark:text-[#C4D0C9] mt-3 leading-relaxed">
                  {syl.rationale}
                </p>
                <div className="mt-3 pt-3 border-t border-[#DCE5DF] dark:border-[#24302A] text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                  Topics: {syl.topics.join(' · ')}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="inline-flex items-center gap-1 text-xs font-mono text-[#5C6B63] dark:text-[#99A8A0]">
                  <Clock className="w-3.5 h-3.5" />
                  {syl.estimatedHours}h study
                </span>
                <button
                  onClick={() =>
                    onNavigate('assessments', {
                      skill: syl.skillFocus,
                      courseCode: syl.courseCode,
                      moduleCode: syl.moduleCode,
                      assessmentMode: 'practice_workplace',
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Test {syl.skillFocus}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#18221D] dark:text-[#ECF2EE]">
              Role Courses, Completion &amp; Basic-to-High Tests
            </h2>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
              Launch Basic (MCQ), Intermediate (Mixed), or High (Coding) assessments directly from any course module.
            </p>
          </div>
          <select
            value={selectedCareerId}
            onChange={(e) => setSelectedCareerId(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm font-medium"
          >
            {careers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.courses.length} courses)
              </option>
            ))}
          </select>
        </div>

        {selectedCareer && (
          <div className="space-y-5">
            <div className="p-5 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                  <Compass className="w-3.5 h-3.5" />
                  Complete Career Guidance · {selectedCareer.title}
                </span>
                <span className="font-mono">
                  {selectedCareer.medianSalaryRange} · {selectedCareer.demandOutlook}
                </span>
              </div>
              <p className="text-sm text-[#18221D] dark:text-[#D9E3DD] leading-relaxed">
                {selectedCareer.careerGuidance || selectedCareer.description}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {selectedCareer.courses.map((crs) => {
                const modScores = crs.syllabusModules.map(
                  (m) => skillScoreMap.get(m.skillFocus.toLowerCase()) ?? 0
                );
                const courseCompletionPct =
                  modScores.length > 0
                    ? Math.round(modScores.reduce((a, b) => a + Math.min(100, b), 0) / modScores.length)
                    : 0;

                return (
                  <div
                    key={crs.id}
                    className="p-5 rounded-xl border border-[#DCE5DF] dark:border-[#24302A] bg-[#FAFDFB] dark:bg-[#131A16] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                        {crs.courseCode} · {crs.level}
                      </span>
                      <span className="text-[#5C6B63] dark:text-[#99A8A0] tabular-nums">
                        {crs.credits} Credits · {crs.hours}h · {courseCompletionPct}% done
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#18221D] dark:text-[#ECF2EE] flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] shrink-0" />
                      <span>{crs.title}</span>
                    </h3>
                    <p className="text-xs text-[#4B5952] dark:text-[#A9B7AF] leading-relaxed">{crs.description}</p>

                    <div className="w-full h-1.5 rounded-full bg-[#DCE5DF] dark:bg-[#24302A] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#2D6A4F] dark:bg-[#52B788]"
                        style={{ width: `${courseCompletionPct}%` }}
                      />
                    </div>

                    <div className="space-y-3 pt-2 border-t border-[#DCE5DF] dark:border-[#24302A]">
                      {crs.syllabusModules.map((mod) => {
                        const labKey = `${crs.courseCode}-${mod.moduleCode}`;
                        const labOpen = expandedLabKey === labKey;
                        return (
                          <div key={mod.moduleCode} className="text-xs space-y-2 pb-2 border-b last:border-b-0 border-[#E6EEE9] dark:border-[#202B25]">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                                {mod.moduleCode}: {mod.title} ({mod.skillFocus})
                              </p>
                              <span className="font-mono text-[#2D6A4F] dark:text-[#74C69D]">
                                {skillScoreMap.get(mod.skillFocus.toLowerCase()) ?? 0}%
                              </span>
                            </div>
                            <p className="text-[#5C6B63] dark:text-[#99A8A0]">
                              {mod.topics.join(' · ')}
                            </p>

                            {mod.codingExercise && (
                              <div className="p-3 rounded-lg bg-[#F1F6F3] dark:bg-[#17201C] border border-[#DCE5DF] dark:border-[#25322C] space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                                    <Code2 className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D]" />
                                    <span>{mod.codingExercise.title}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedLabKey(labOpen ? null : labKey)}
                                    className="text-[11px] font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
                                  >
                                    {labOpen ? 'Hide Starter Code' : 'Preview Starter Code'}
                                  </button>
                                </div>
                                <p className="text-[11px] text-[#4B5952] dark:text-[#A9B7AF]">
                                  {mod.codingExercise.prompt}
                                </p>
                                {labOpen && (
                                  <pre className="p-2.5 rounded-md bg-slate-950 text-slate-100 text-[11px] font-mono overflow-x-auto border border-slate-800">
                                    <code>{mod.codingExercise.starterCode}</code>
                                  </pre>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <button
                                onClick={() =>
                                  onNavigate('assessments', {
                                    skill: mod.skillFocus,
                                    difficulty: 'beginner',
                                    assessmentType: 'mcq',
                                    assessmentMode: 'practice_workplace',
                                    courseCode: crs.courseCode,
                                    moduleCode: mod.moduleCode,
                                  })
                                }
                                className="px-2 py-1 rounded border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-[11px] font-semibold hover:border-[#2D6A4F]"
                              >
                                Basic (MCQ)
                              </button>
                              <button
                                onClick={() =>
                                  onNavigate('assessments', {
                                    skill: mod.skillFocus,
                                    difficulty: 'intermediate',
                                    assessmentType: 'mixed',
                                    assessmentMode: 'practice_workplace',
                                    courseCode: crs.courseCode,
                                    moduleCode: mod.moduleCode,
                                  })
                                }
                                className="px-2 py-1 rounded border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-[11px] font-semibold hover:border-[#2D6A4F]"
                              >
                                Intermediate (Mixed)
                              </button>
                              <button
                                onClick={() =>
                                  onNavigate('assessments', {
                                    skill: mod.skillFocus,
                                    difficulty: 'advanced',
                                    assessmentType: 'coding',
                                    assessmentMode: 'practice_workplace',
                                    courseCode: crs.courseCode,
                                    moduleCode: mod.moduleCode,
                                  })
                                }
                                className="px-2 py-1 rounded border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-[11px] font-semibold hover:border-[#2D6A4F]"
                              >
                                High (Coding)
                              </button>
                              <button
                                onClick={() =>
                                  onNavigate('assessments', {
                                    skill: mod.skillFocus,
                                    difficulty: mod.codingExercise?.difficulty || 'intermediate',
                                    assessmentType: 'coding',
                                    assessmentMode: 'practice_workplace',
                                    courseCode: crs.courseCode,
                                    moduleCode: mod.moduleCode,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-[11px] font-semibold"
                              >
                                <Code2 className="w-3 h-3" />
                                <span>Open Module Coding Lab</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
