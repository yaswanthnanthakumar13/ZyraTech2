import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, FolderGit2, Plus, ShieldCheck } from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { apiFetch, formatVerificationStatus, type PageRoute } from '../lib/api';
import type { LearnerWorkspaceData } from '../types';

interface SkillDNAPageProps {
  workspace: LearnerWorkspaceData;
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
  onNavigate: (route: PageRoute, context?: { skill?: string }) => void;
}

export function SkillDNAPage({ workspace, onWorkspaceUpdate, onNavigate }: SkillDNAPageProps) {
  const { skills, projects } = workspace;
  const [selectedSkillId, setSelectedSkillId] = useState<string>(skills[0]?.id || '');

  // Add self-declared skill form
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Programming');
  const [newSkillScore, setNewSkillScore] = useState(40);
  const [savingSkill, setSavingSkill] = useState(false);

  // Project verification form (Novelty 5)
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projSkill, setProjSkill] = useState(skills[0]?.skillName || 'JavaScript');
  const [projDesc, setProjDesc] = useState('');
  const [projNotes, setProjNotes] = useState('');
  const [projLink, setProjLink] = useState('');
  const [verifyingProj, setVerifyingProj] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSkill = skills.find((s) => s.id === selectedSkillId) || skills[0] || null;

  const radarData = useMemo(() => {
    if (!selectedSkill) return [];
    return [
      { dimension: 'Theoretical', score: selectedSkill.theoryScore },
      { dimension: 'Practical', score: selectedSkill.practicalScore },
      { dimension: 'Problem Solving', score: selectedSkill.problemSolvingScore },
      { dimension: 'Project Proof', score: selectedSkill.projectScore },
      { dimension: 'Retention', score: selectedSkill.retentionScore },
    ];
  }, [selectedSkill]);

  const handleAddSkill = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    setSavingSkill(true);
    setError(null);
    try {
      const ws = await apiFetch<LearnerWorkspaceData>('/api/skills/upsert', {
        method: 'POST',
        body: JSON.stringify({
          skillName: newSkillName.trim(),
          category: newSkillCategory,
          score: newSkillScore,
        }),
      });
      onWorkspaceUpdate(ws);
      setNewSkillName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save skill');
    } finally {
      setSavingSkill(false);
    }
  };

  const handleVerifyProject = async (e: FormEvent) => {
    e.preventDefault();
    setVerifyingProj(true);
    setError(null);
    try {
      const res = await apiFetch<{ workspace: LearnerWorkspaceData }>('/api/projects/verify', {
        method: 'POST',
        body: JSON.stringify({
          title: projTitle,
          skillName: projSkill,
          description: projDesc,
          submissionNotes: projNotes,
          repoOrDemoLink: projLink,
        }),
      });
      onWorkspaceUpdate(res.workspace);
      setShowProjectForm(false);
      setProjTitle('');
      setProjDesc('');
      setProjNotes('');
      setProjLink('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Project verification failed');
    } finally {
      setVerifyingProj(false);
    }
  };

  const strongest = [...skills].sort((a, b) => b.verifiedScore - a.verifiedScore).slice(0, 3);
  const weakest = [...skills].sort((a, b) => a.verifiedScore - b.verifiedScore).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Skill DNA — 5-Dimension Competency Fingerprint
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Self-declared skills remain unverified until validated through Skill Assessments or Real-World Project Verification.
          </p>
        </div>
        <button
          onClick={() => setShowProjectForm(!showProjectForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <FolderGit2 className="w-4 h-4" />
          <span>{showProjectForm ? 'Close Project Form' : 'Verify Real-World Project'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {showProjectForm && (
        <form
          onSubmit={handleVerifyProject}
          className="p-6 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-4"
        >
          <div>
            <h3 className="text-base font-semibold">Real-World Project Verification (Agent 1)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit architecture notes and implementation proof to upgrade a skill to Project-Verified status.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              type="text"
              required
              placeholder="Project Title"
              value={projTitle}
              onChange={(e) => setProjTitle(e.target.value)}
              className="px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
            <select
              value={projSkill}
              onChange={(e) => setProjSkill(e.target.value)}
              className="px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              {skills.map((s) => (
                <option key={s.id} value={s.skillName}>
                  {s.skillName}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            required
            placeholder="Short summary of what the project builds"
            value={projDesc}
            onChange={(e) => setProjDesc(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
          <textarea
            rows={3}
            required
            placeholder="Technical implementation details, edge cases handled, testing approach, and data flow..."
            value={projNotes}
            onChange={(e) => setProjNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
          <input
            type="url"
            placeholder="Repository or live demo URL (optional)"
            value={projLink}
            onChange={(e) => setProjLink(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
          <button
            type="submit"
            disabled={verifyingProj}
            className="px-5 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold disabled:opacity-60"
          >
            {verifyingProj ? 'Evaluating Project...' : 'Submit for AI Verification'}
          </button>
        </form>
      )}

      {/* Radar Chart + Selected Skill Inspector */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                5-Axis DNA Profile
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select any competency on the right to inspect
              </p>
            </div>
            {selectedSkill && (
              <span className="text-xs font-mono font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                {selectedSkill.skillName} · {selectedSkill.verifiedScore}%
              </span>
            )}
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" opacity={0.35} />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151C18',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Radar
                  name={selectedSkill?.skillName || 'Skill'}
                  dataKey="score"
                  stroke="#40916C"
                  fill="#40916C"
                  fillOpacity={0.28}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {selectedSkill && (
            <div className="mt-4 pt-4 border-t border-[#DCE5DF] dark:border-[#24302A] flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Status: <strong className="text-slate-900 dark:text-white">{formatVerificationStatus(selectedSkill.verificationStatus)}</strong>
              </span>
              <button
                onClick={() => onNavigate('assessments', { skill: selectedSkill.skillName })}
                className="font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
              >
                Verify via Assessment
              </button>
            </div>
          )}
        </div>

        {/* All Skills List */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Competency Matrix
            </h3>
            <div className="divide-y divide-[#E4ECE7] dark:divide-[#24302A]">
              {skills.map((sk) => {
                const isSelected = selectedSkill?.id === sk.id;
                return (
                  <button
                    key={sk.id}
                    type="button"
                    onClick={() => setSelectedSkillId(sk.id)}
                    className={`w-full py-3.5 px-3 text-left flex items-center justify-between gap-4 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-[#EDF5F0] dark:bg-[#16231C]'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {sk.skillName}
                        </span>
                        {sk.verificationStatus !== 'self_declared' && (
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatVerificationStatus(sk.verificationStatus)} · Self-declared {sk.selfDeclaredScore}% · Retention {sk.retentionScore}%
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-28 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            sk.verificationStatus === 'self_declared'
                              ? 'bg-slate-400 dark:bg-slate-500'
                              : sk.verifiedScore >= 75
                                ? 'bg-emerald-600'
                                : 'bg-amber-500'
                          }`}
                          style={{ width: `${sk.verifiedScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono tabular-nums font-semibold w-10 text-right">
                        {sk.verifiedScore}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleAddSkill} className="mt-6 pt-4 border-t border-[#DCE5DF] dark:border-[#24302A] flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Add skill (e.g. Docker, TypeScript)"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
            <select
              value={newSkillCategory}
              onChange={(e) => setNewSkillCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            >
              <option>Programming</option>
              <option>Frontend</option>
              <option>Backend</option>
              <option>Data</option>
              <option>Security</option>
              <option>DevOps</option>
            </select>
            <input
              type="number"
              min={0}
              max={100}
              value={newSkillScore}
              onChange={(e) => setNewSkillScore(Number(e.target.value))}
              className="w-20 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
            />
            <button
              type="submit"
              disabled={savingSkill}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Self-Declared</span>
            </button>
          </form>
        </div>
      </div>

      {/* Strength & Weakness Intelligence Report + Verified Projects */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 p-6 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Skill Strength &amp; Weakness Report
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-2">
                Strongest Competencies
              </p>
              <ul className="space-y-2 text-sm">
                {strongest.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <span>{s.skillName}</span>
                    <span className="font-mono tabular-nums font-semibold">{s.verifiedScore}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-2">
                Priority Gaps
              </p>
              <ul className="space-y-2 text-sm">
                {weakest.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <span>{s.skillName}</span>
                    <span className="font-mono tabular-nums font-semibold">{s.verifiedScore}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 p-6 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Verified Project Proofs ({projects.length})
          </h3>
          {projects.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No projects verified yet. Submit a project above to earn Project-Verified competency status.
            </p>
          ) : (
            <div className="divide-y divide-[#E4ECE7] dark:divide-[#24302A]">
              {projects.map((p) => (
                <div key={p.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{p.title}</span>
                    </p>
                    <span className="text-xs font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {p.skillName} · {p.aiVerificationScore}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{p.aiFeedback}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
