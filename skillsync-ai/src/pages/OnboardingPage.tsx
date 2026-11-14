import { useState, type ChangeEvent, type FormEvent } from 'react';
import { FileUp, Plus, Sparkles, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { CareerRole, LearningStyle, LearnerWorkspaceData } from '../types';

interface OnboardingPageProps {
  userFullName: string;
  userEmail: string;
  careers: CareerRole[];
  onComplete: (workspace: LearnerWorkspaceData) => void;
}

const SUGGESTED_TECH_SKILLS = [
  'Python',
  'JavaScript',
  'HTML',
  'CSS',
  'SQL',
  'React',
  'Node.js',
  'TypeScript',
  'Docker',
  'Linux & Shell',
  'Networking & TCP/IP',
  'Web Security',
  'Machine Learning',
  'Git & Testing',
];

export function OnboardingPage({
  userFullName,
  userEmail,
  careers,
  onComplete,
}: OnboardingPageProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState(userFullName);
  const [educationLevel, setEducationLevel] = useState('Undergraduate (B.Tech / B.S.)');
  const [institution, setInstitution] = useState('');
  const [workExperience, setWorkExperience] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [parsingResume, setParsingResume] = useState(false);

  const [techSkills, setTechSkills] = useState<Array<{ skillName: string; score: number; category: string }>>([
    { skillName: 'Python', score: 65, category: 'Programming' },
    { skillName: 'HTML', score: 70, category: 'Frontend' },
    { skillName: 'JavaScript', score: 25, category: 'Programming' },
  ]);
  const [newSkillName, setNewSkillName] = useState('SQL');
  const [newSkillScore, setNewSkillScore] = useState(50);

  const [nonTechInput, setNonTechInput] = useState('Problem Solving, Technical Writing, Team Collaboration');
  const [certInput, setCertInput] = useState('');
  const [projects, setProjects] = useState<Array<{ title: string; description: string; technologies: string[] }>>([]);
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projTech, setProjTech] = useState('');

  const [targetCareerId, setTargetCareerId] = useState('full-stack-developer');
  const [careerInterests, setCareerInterests] = useState<string[]>(['Full Stack Development', 'Backend APIs']);
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [learningStyle, setLearningStyle] = useState<LearningStyle>('interactive_coding');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResumeUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setResumeText(text.slice(0, 6000));
  };

  const handleParseResume = async () => {
    if (resumeText.trim().length < 15) {
      setError('Paste or upload at least a short resume summary before extracting.');
      return;
    }
    setError(null);
    setParsingResume(true);
    try {
      const parsed = await apiFetch<{
        fullName?: string;
        educationLevel?: string;
        institution?: string;
        workExperience?: string;
        technicalSkills: Array<{ skillName: string; estimatedScore: number }>;
        nonTechnicalSkills: string[];
        certifications: string[];
        projects: Array<{ title: string; description: string; technologies: string[] }>;
      }>('/api/onboarding/parse-resume', {
        method: 'POST',
        body: JSON.stringify({ resumeText }),
      });

      if (parsed.fullName) setFullName(parsed.fullName);
      if (parsed.educationLevel) setEducationLevel(parsed.educationLevel);
      if (parsed.institution) setInstitution(parsed.institution);
      if (parsed.workExperience) setWorkExperience(parsed.workExperience);
      if (parsed.technicalSkills?.length) {
        setTechSkills(
          parsed.technicalSkills.map((s) => ({
            skillName: s.skillName,
            score: s.estimatedScore,
            category: 'Technical',
          }))
        );
      }
      if (parsed.nonTechnicalSkills?.length) setNonTechInput(parsed.nonTechnicalSkills.join(', '));
      if (parsed.certifications?.length) setCertInput(parsed.certifications.join(', '));
      if (parsed.projects?.length) setProjects(parsed.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to parse resume');
    } finally {
      setParsingResume(false);
    }
  };

  const addSkill = () => {
    const trimmed = newSkillName.trim();
    if (!trimmed) return;
    if (techSkills.some((s) => s.skillName.toLowerCase() === trimmed.toLowerCase())) return;
    setTechSkills([...techSkills, { skillName: trimmed, score: newSkillScore, category: 'Technical' }]);
    setNewSkillName('');
  };

  const addProject = () => {
    if (!projTitle.trim() || !projDesc.trim()) return;
    setProjects([
      ...projects,
      {
        title: projTitle.trim(),
        description: projDesc.trim(),
        technologies: projTech
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      },
    ]);
    setProjTitle('');
    setProjDesc('');
    setProjTech('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ workspace: LearnerWorkspaceData }>('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          educationLevel,
          institution,
          technicalSkills: techSkills,
          nonTechnicalSkills: nonTechInput
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          certifications: certInput
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          previousProjects: projects,
          workExperience,
          careerInterests,
          targetCareerId,
          dailyLearningMinutes: dailyMinutes,
          preferredLearningStyle: learningStyle,
          resumeText,
        }),
      });
      onComplete(res.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9F7] dark:bg-[#0E1311] text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-medium text-[#2D6A4F] dark:text-[#74C69D]">
            ZyraTech · Personalized Onboarding ({step} of 3)
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">
            Calibrate your baseline Skill DNA
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Our six AI agents use your background, projects, and daily capacity to build your initial adaptive roadmap.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { num: 1 as const, label: '01. Profile & Resume' },
            { num: 2 as const, label: '02. Skills & Projects' },
            { num: 3 as const, label: '03. Career & Learning Style' },
          ].map((item) => (
            <button
              key={item.num}
              type="button"
              onClick={() => setStep(item.num)}
              className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-colors text-left ${
                step === item.num
                  ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white border-[#2D6A4F] dark:border-[#3B8263]'
                  : 'bg-white dark:bg-[#151C18] text-slate-600 dark:text-slate-300 border-[#DCE5DF] dark:border-[#24302A]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] rounded-2xl p-6 sm:p-8 space-y-6"
        >
          {step === 1 && (
            <>
              <div className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#24302A] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Import or Paste Resume (Optional)</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Extract skills, education, and projects automatically using AI.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Upload .txt / .md</span>
                    <input type="file" accept=".txt,.md,.json" className="hidden" onChange={handleResumeUpload} />
                  </label>
                </div>
                <textarea
                  rows={4}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste resume summary, coursework, skills, and project experience..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                />
                <button
                  type="button"
                  onClick={handleParseResume}
                  disabled={parsingResume}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold disabled:opacity-60"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{parsingResume ? 'Extracting Competencies...' : 'Extract Profile from Resume'}</span>
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={userEmail}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#24302A] bg-slate-100 dark:bg-slate-900/50 text-sm text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Education Level
                  </label>
                  <select
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option>High School / Self-Taught</option>
                    <option>Undergraduate (B.Tech / B.S.)</option>
                    <option>Graduate (M.S. / M.Tech)</option>
                    <option>Working Professional</option>
                    <option>Career Switcher</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Institution or Organization
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="University or Company"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Work / Internship Experience
                </label>
                <textarea
                  rows={2}
                  value={workExperience}
                  onChange={(e) => setWorkExperience(e.target.value)}
                  placeholder="Describe internships, freelance work, or relevant engineering roles..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-sm font-semibold"
                >
                  Continue to Skills &amp; Projects
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h2 className="text-sm font-semibold">Existing Technical Skills (Self-Declared Baseline)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Self-declared scores provide a starting estimate and will only be marked verified after passing assessments or project reviews.
                </p>

                <div className="mt-4 space-y-2.5">
                  {techSkills.map((sk, idx) => (
                    <div
                      key={sk.skillName}
                      className="flex items-center gap-3 p-3 rounded-lg bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#24302A]"
                    >
                      <span className="text-sm font-medium w-36 truncate">{sk.skillName}</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={sk.score}
                        onChange={(e) => {
                          const next = [...techSkills];
                          next[idx].score = Number(e.target.value);
                          setTechSkills(next);
                        }}
                        className="flex-1 accent-[#2D6A4F]"
                      />
                      <span className="text-xs font-mono tabular-nums w-10 text-right">{sk.score}%</span>
                      <button
                        type="button"
                        onClick={() => setTechSkills(techSkills.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-400 hover:text-red-500"
                        aria-label={`Remove ${sk.skillName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <select
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    {SUGGESTED_TECH_SKILLS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newSkillScore}
                    onChange={(e) => setNewSkillScore(Number(e.target.value))}
                    className="w-20 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Skill</span>
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-[#DCE5DF] dark:border-[#24302A]">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Non-Technical Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={nonTechInput}
                    onChange={(e) => setNonTechInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Certifications (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={certInput}
                    onChange={(e) => setCertInput(e.target.value)}
                    placeholder="e.g. AWS Cloud Practitioner"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#DCE5DF] dark:border-[#24302A] space-y-3">
                <h3 className="text-sm font-semibold">Previous Projects</h3>
                {projects.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#24302A] flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProjects(projects.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="grid sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Project title"
                    value={projTitle}
                    onChange={(e) => setProjTitle(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Short description"
                    value={projDesc}
                    onChange={(e) => setProjDesc(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tech (e.g. Python, SQL)"
                      value={projTech}
                      onChange={(e) => setProjTech(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                    <button
                      type="button"
                      onClick={addProject}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-sm font-semibold"
                >
                  Continue to Career Goal
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Target Career Goal
                </label>
                <select
                  value={targetCareerId}
                  onChange={(e) => setTargetCareerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  {careers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Career Interests (comma-separated)
                </label>
                <input
                  type="text"
                  value={careerInterests.join(', ')}
                  onChange={(e) =>
                    setCareerInterests(
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Daily Available Learning Time (minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={dailyMinutes}
                    onChange={(e) => setDailyMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Preferred Learning Style
                  </label>
                  <select
                    value={learningStyle}
                    onChange={(e) => setLearningStyle(e.target.value as LearningStyle)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="interactive_coding">Interactive Coding Labs</option>
                    <option value="hands_on_projects">Hands-On Projects</option>
                    <option value="video_tutorials">Video Tutorials</option>
                    <option value="documentation_reading">Documentation &amp; Technical Articles</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-sm font-semibold disabled:opacity-60"
                >
                  {submitting ? 'Running 6-Agent Orchestrator...' : 'Generate Skill DNA & Roadmap'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
