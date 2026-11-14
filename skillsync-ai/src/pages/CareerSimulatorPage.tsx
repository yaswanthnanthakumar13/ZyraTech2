import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch, type PageRoute } from '../lib/api';
import { playPopSound } from '../lib/sound';
import type { CareerCompatibility, LearnerWorkspaceData } from '../types';

interface CareerSimulatorPageProps {
  workspace: LearnerWorkspaceData;
  compatibilities: CareerCompatibility[];
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
  onNavigate: (route: PageRoute, context?: { careerId?: string }) => void;
}

export function CareerSimulatorPage({
  workspace,
  compatibilities,
  onWorkspaceUpdate,
  onNavigate,
}: CareerSimulatorPageProps) {
  const [careerA, setCareerA] = useState<string>(workspace.profile.targetCareerId || 'full-stack-developer');
  const [careerB, setCareerB] = useState<string>(
    workspace.profile.targetCareerId === 'cybersecurity-analyst'
      ? 'full-stack-developer'
      : 'cybersecurity-analyst'
  );
  const [careerC, setCareerC] = useState<string>('data-scientist');
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => {
    const ids = Array.from(new Set([careerA, careerB, careerC].filter(Boolean)));
    return ids
      .map((id) => compatibilities.find((c) => c.career.id === id))
      .filter((c): c is CareerCompatibility => Boolean(c));
  }, [careerA, careerB, careerC, compatibilities]);

  const chartData = selected.map((c) => ({
    name: c.career.title,
    'Skill Match %': c.compatibilityScore,
    'Est. Readiness %': c.indicativeReadinessEstimate,
  }));

  const dailyMinutes = Math.max(15, workspace.profile.dailyLearningMinutes || 60);

  const handleAdopt = async (careerId: string) => {
    playPopSound('action');
    setSwitchingId(careerId);
    setError(null);
    try {
      const res = await apiFetch<{ workspace: LearnerWorkspaceData }>('/api/careers/switch', {
        method: 'POST',
        body: JSON.stringify({ targetCareerId: careerId }),
      });
      onWorkspaceUpdate(res.workspace);
      onNavigate('roadmap');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to adopt career goal');
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#18221D] dark:text-[#ECF2EE]">
          Career What-If Simulator
        </h2>
        <p className="text-sm text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
          Compare roles in plain language to see which verified skills carry over, how many study hours you save, and what topics remain before switching.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Clear Metric Guide */}
      <div className="p-4 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] grid sm:grid-cols-3 gap-4 text-xs">
        <div>
          <p className="font-semibold text-[#1B4332] dark:text-[#95D5B2]">What "Skill Match %" Means</p>
          <p className="text-[#4B5952] dark:text-[#A9B7AF] mt-1 leading-relaxed">
            Percentage of this role&apos;s required competencies you already meet using your current Skill DNA scores.
          </p>
        </div>
        <div>
          <p className="font-semibold text-[#1B4332] dark:text-[#95D5B2]">What "Est. Readiness %" Means</p>
          <p className="text-[#4B5952] dark:text-[#A9B7AF] mt-1 leading-relaxed">
            Your exam-verified readiness factoring in passed assessments, projects, and retention stability.
          </p>
        </div>
        <div>
          <p className="font-semibold text-[#1B4332] dark:text-[#95D5B2]">Zero History Loss Promise</p>
          <p className="text-[#4B5952] dark:text-[#A9B7AF] mt-1 leading-relaxed">
            Adopting a new role keeps 100% of your past grades and verified skills while adapting upcoming milestones.
          </p>
        </div>
      </div>

      {/* Role Selectors */}
      <div className="grid sm:grid-cols-3 gap-4 p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
        {[
          { label: 'Career Path A', value: careerA, setter: setCareerA },
          { label: 'Career Path B', value: careerB, setter: setCareerB },
          { label: 'Career Path C', value: careerC, setter: setCareerC },
        ].map((slot) => (
          <div key={slot.label}>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              {slot.label}
            </label>
            <select
              value={slot.value}
              onChange={(e) => slot.setter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
            >
              {compatibilities.map((c) => (
                <option key={c.career.id} value={c.career.id}>
                  {c.career.title} ({c.compatibilityScore}%)
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Visual Comparison Chart */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
        <h3 className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE] mb-4">
          Skill Match vs. Estimated Readiness
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#6B7A72" opacity={0.2} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6B7A72" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#6B7A72" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#151C18',
                  borderColor: '#2B3932',
                  borderRadius: '8px',
                  color: '#ECF2EE',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Skill Match %" fill="#2D6A4F" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Est. Readiness %" fill="#74C69D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Plain-Language Switch Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {selected.map((item) => {
          const isCurrent = workspace.profile.targetCareerId === item.career.id;
          const totalReqCount = item.career.requirements.length || 1;
          const fullBaselineHours = totalReqCount * 14;
          const hoursSaved = Math.max(0, fullBaselineHours - item.estimatedLearningHours);
          const daysAtCurrentPace = Math.max(
            1,
            Math.ceil((item.estimatedLearningHours * 60) / dailyMinutes)
          );
          const topCourses = item.career.courses?.slice(0, 2) || [];

          return (
            <div
              key={item.career.id}
              className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col justify-between gap-5"
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                    {item.career.category} · {item.career.medianSalaryRange}
                  </p>
                  <h3 className="text-lg font-bold text-[#18221D] dark:text-[#ECF2EE] mt-0.5">
                    {item.career.title}
                  </h3>
                  <div className="mt-3 grid grid-cols-3 gap-2 p-3 rounded-lg bg-[#F6F9F7] dark:bg-[#18211C] border border-[#E4ECE7] dark:border-[#24302A]">
                    <div>
                      <span className="text-lg font-bold font-mono tabular-nums text-[#2D6A4F] dark:text-[#74C69D]">
                        {item.compatibilityScore}%
                      </span>
                      <span className="block text-[11px] text-[#5C6B63] dark:text-[#99A8A0]">Skill Match</span>
                    </div>
                    <div>
                      <span className="text-lg font-bold font-mono tabular-nums text-[#18221D] dark:text-[#ECF2EE]">
                        {hoursSaved}h
                      </span>
                      <span className="block text-[11px] text-[#5C6B63] dark:text-[#99A8A0]">Hours Saved</span>
                    </div>
                    <div>
                      <span className="text-lg font-bold font-mono tabular-nums text-[#18221D] dark:text-[#ECF2EE]">
                        {item.estimatedLearningHours}h
                      </span>
                      <span className="block text-[11px] text-[#5C6B63] dark:text-[#99A8A0]">Left (~{daysAtCurrentPace}d)</span>
                    </div>
                  </div>
                </div>

                {/* Plain-Language Career Switch Summary */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                        Skills You Keep ({item.transferableSkills.length} verified / {item.metSkills.length} met)
                      </p>
                      <p className="text-[#4B5952] dark:text-[#A9B7AF] mt-0.5 leading-relaxed">
                        {item.transferableSkills.length > 0
                          ? item.transferableSkills.join(', ')
                          : item.metSkills.length > 0
                            ? item.metSkills.map((m) => m.skillName).join(', ')
                            : 'Complete a quick assessment to unlock verified skill transfers.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="w-full">
                      <p className="font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                        Top Topics Left to Learn ({item.missingSkills.length})
                      </p>
                      {item.missingSkills.length === 0 ? (
                        <p className="text-[#2D6A4F] dark:text-[#74C69D] mt-0.5">
                          You already meet every core requirement for this role.
                        </p>
                      ) : (
                        <ul className="space-y-1 text-[#4B5952] dark:text-[#A9B7AF] mt-1">
                          {item.missingSkills.slice(0, 4).map((m) => (
                            <li key={m.skillName} className="flex justify-between gap-2">
                              <span>{m.skillName}</span>
                              <span className="font-mono tabular-nums text-amber-700 dark:text-amber-300">
                                {m.currentScore}% → {m.requiredLevel}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {topCourses.length > 0 && (
                    <div className="flex items-start gap-2">
                      <BookOpen className="w-4 h-4 text-[#5C6B63] dark:text-[#99A8A0] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                          First Courses You&apos;ll Study
                        </p>
                        <p className="text-[#4B5952] dark:text-[#A9B7AF] mt-0.5">
                          {topCourses.map((c) => `${c.courseCode}: ${c.title}`).join(' · ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#DCE5DF] dark:border-[#24302A] space-y-2">
                <button
                  type="button"
                  data-sound="dashboard"
                  onClick={() => onNavigate('syllabus', { careerId: item.career.id })}
                  className="w-full py-2 px-3 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] text-xs font-semibold text-[#18221D] dark:text-[#ECF2EE] hover:bg-[#F1F6F3] dark:hover:bg-[#1D2822] transition-colors"
                >
                  Preview {item.career.courses?.length || 0} Role Courses &amp; Tests
                </button>

                {isCurrent ? (
                  <div className="py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Active Career Goal</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-sound="action"
                    onClick={() => handleAdopt(item.career.id)}
                    disabled={switchingId !== null}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold transition-colors disabled:opacity-60"
                  >
                    <span>
                      {switchingId === item.career.id
                        ? 'Switching & Updating Roadmap...'
                        : 'Switch to This Role (Keep Skills)'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
