import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  BookPlus,
  CheckCircle2,
  Eye,
  EyeOff,
  Languages,
  LogOut,
  Moon,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { LANGUAGE_OPTIONS } from '../lib/i18n';
import type { AdminDashboardData, CareerRole, SupportedLanguage } from '../types';

interface AdminPortalPageProps {
  adminData: AdminDashboardData;
  careers: CareerRole[];
  onRefresh: () => Promise<void>;
  onCareersRefresh: () => Promise<void>;
  onLogout: () => void;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

type AdminTab = 'release' | 'tests' | 'students' | 'proctoring' | 'courses';

interface DraftQuestion {
  questionType: 'mcq' | 'coding' | 'conceptual' | 'debugging' | 'scenario';
  prompt: string;
  codeSnippet?: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  conceptTag: string;
}

export function AdminPortalPage({
  adminData,
  careers,
  onRefresh,
  onCareersRefresh,
  onLogout,
  onChangeLanguage,
  darkMode,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
}: AdminPortalPageProps) {
  const [tab, setTab] = useState<AdminTab>('release');
  const [title, setTitle] = useState('ZT-FSD-202 Mid-Term: React Hooks & State Integrity');
  const [careerId, setCareerId] = useState(careers[0]?.id || 'full-stack-developer');
  const [skillName, setSkillName] = useState('React');
  const [courseCode, setCourseCode] = useState('ZT-FSD-301');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [adminExamType, setAdminExamType] = useState<'mixed' | 'mcq' | 'coding'>('mixed');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [passingScore, setPassingScore] = useState(70);
  const [maxTabSwitches, setMaxTabSwitches] = useState(3);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Course creation state
  const [newCourseCode, setNewCourseCode] = useState('ZT-FSD-405');
  const [newCourseTitle, setNewCourseTitle] = useState('Production Testing & Observability');
  const [newCourseCareer, setNewCourseCareer] = useState(careers[0]?.id || 'full-stack-developer');
  const [newCourseSkill, setNewCourseSkill] = useState('Git & Testing');
  const [newModuleTitle, setNewModuleTitle] = useState('Automated Integration Tests & Tracing');
  const [newModuleTopics, setNewModuleTopics] = useState('Vitest unit suites, API contract testing, structured logs');

  const lang = adminData.admin.preferredLanguage || 'en';

  const handleGenerateWithGemini = async () => {
    setGeneratingAI(true);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await apiFetch<{ questions: DraftQuestion[]; usedGemini: boolean }>(
        '/api/admin/assessments/generate-ai',
        {
          method: 'POST',
          body: JSON.stringify({
            title,
            careerId,
            skillName,
            courseCode,
            difficulty,
            questionCount: 5,
            assessmentType: adminExamType,
          }),
        }
      );
      setQuestions(res.questions);
      setStatusMsg(
        res.usedGemini
          ? `Gemini AI generated ${res.questions.length} university exam questions. Review below and click Release Test.`
          : `Generated ${res.questions.length} structured exam questions ready to review and release.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate questions');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleReleaseTest = async (e: FormEvent) => {
    e.preventDefault();
    if (questions.length === 0) {
      setError('Click "Ask Gemini AI to Generate Questions" or add a question first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setStatusMsg(null);
    try {
      await apiFetch('/api/admin/assessments', {
        method: 'POST',
        body: JSON.stringify({
          title,
          careerId,
          skillName,
          courseCode,
          difficulty,
          durationMinutes,
          passingScore,
          maxTabSwitches,
          isPublished: true,
          questions,
        }),
      });
      await onRefresh();
      setQuestions([]);
      setStatusMsg(`Released "${title}" directly to the Student Assessment Portal!`);
      setTab('tests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (id: string, current: boolean) => {
    await apiFetch(`/api/admin/assessments/${id}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ isPublished: !current }),
    });
    await onRefresh();
  };

  const handleDeleteTest = async (id: string) => {
    await apiFetch(`/api/admin/assessments/${id}`, { method: 'DELETE' });
    await onRefresh();
  };

  const handleAddCourse = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setStatusMsg(null);
    try {
      await apiFetch('/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify({
          careerId: newCourseCareer,
          courseCode: newCourseCode,
          title: newCourseTitle,
          level: 'Core',
          credits: 3,
          hours: 20,
          description: `University course covering ${newModuleTitle} for ${newCourseSkill}.`,
          moduleTitle: newModuleTitle,
          skillFocus: newCourseSkill,
          topics: newModuleTopics.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      await onCareersRefresh();
      setStatusMsg(`Added course ${newCourseCode} (${newCourseTitle}) to curriculum!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add course');
    } finally {
      setSubmitting(false);
    }
  };

  const totalTerminated = adminData.students.reduce((acc, s) => acc + s.terminatedTests, 0);

  return (
    <div className="min-h-screen bg-[#F6F9F7] dark:bg-[#0E1311] text-[#18221D] dark:text-[#ECF2EE]">
      {/* Separate Admin Top Header */}
      <header className="sticky top-0 z-30 h-16 px-6 bg-white/95 dark:bg-[#121916]/95 backdrop-blur-sm border-b border-[#DCE5DF] dark:border-[#24302A] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2D6A4F] dark:bg-[#3B8263] flex items-center justify-center text-white text-xs font-bold">
            ADM
          </div>
          <div>
            <p className="text-sm font-bold text-[#18221D] dark:text-[#ECF2EE] leading-none">
              ZyraTech Administrative Portal
            </p>
            <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0] font-mono mt-0.5">
              {adminData.admin.email} · Exam Control Plane
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] bg-[#F8FBF9] dark:bg-[#17201C]">
            <Languages className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D]" />
            <select
              value={lang}
              onChange={(e) => onChangeLanguage(e.target.value as SupportedLanguage)}
              className="bg-transparent text-xs font-medium text-[#2E3A33] dark:text-[#D9E3DD] focus:outline-none"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code} className="bg-white dark:bg-[#151C18]">
                  {opt.nativeLabel}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onToggleSound}
            className="p-2 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] bg-[#F8FBF9] dark:bg-[#17201C] text-[#5C6B63] dark:text-[#99A8A0] hover:bg-[#EDF4EF] dark:hover:bg-[#1B2520]"
            aria-label={soundEnabled ? 'Mute pop sounds' : 'Enable pop sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D]" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] bg-[#F8FBF9] dark:bg-[#17201C] text-[#5C6B63] dark:text-[#99A8A0] hover:bg-[#EDF4EF] dark:hover:bg-[#1B2520]"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] text-xs font-semibold hover:bg-[#EDF4EF] dark:hover:bg-[#1B2520]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">University Tests</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">
              {adminData.assessments.length}
            </p>
            <p className="text-xs text-[#2D6A4F] dark:text-[#74C69D] mt-1">
              {adminData.assessments.filter((a) => a.isPublished).length} published to students
            </p>
          </div>
          <div className="p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">Enrolled Students</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">
              {adminData.students.length}
            </p>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
              Roll-no authenticated (@zyra.in)
            </p>
          </div>
          <div className="p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">Exam Submissions</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">
              {adminData.recentSubmissions.length}
            </p>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
              Live graded &amp; proctored results
            </p>
          </div>
          <div className="p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">Proctoring Incidents</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1 text-rose-600 dark:text-rose-400">
              {adminData.proctoringLogs.length}
            </p>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
              {totalTerminated} exams terminated (&gt;3 switches)
            </p>
          </div>
        </section>

        <div className="flex flex-wrap gap-2 border-b border-[#DCE5DF] dark:border-[#24302A] pb-3">
          {[
            { id: 'release', label: 'Release Test (Gemini AI)', icon: Plus },
            { id: 'tests', label: `Manage Tests (${adminData.assessments.length})`, icon: ShieldCheck },
            { id: 'students', label: `Student Roster (${adminData.students.length})`, icon: Users },
            { id: 'proctoring', label: `Proctoring Logs (${adminData.proctoringLogs.length})`, icon: ShieldAlert },
            { id: 'courses', label: 'Courses & Syllabus Catalog', icon: BookPlus },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id as AdminTab)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  tab === item.id
                    ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white'
                    : 'bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] text-[#3E4C45] dark:text-[#C4D0C9] hover:bg-[#EDF4EF] dark:hover:bg-[#1B2520]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        {statusMsg && (
          <div className="p-3.5 rounded-lg bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] text-xs text-[#2D6A4F] dark:text-[#74C69D]">
            {statusMsg}
          </div>
        )}

        {tab === 'release' && (
          <form
            onSubmit={handleReleaseTest}
            className="p-6 sm:p-8 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#18221D] dark:text-[#ECF2EE]">
                  Author &amp; Release Proctored University Assessment
                </h2>
                <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
                  Ask Gemini AI to generate exam questions, review them, and publish directly to all students.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateWithGemini}
                disabled={generatingAI}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4" />
                <span>{generatingAI ? 'Asking Gemini AI...' : 'Ask Gemini AI to Generate Questions'}</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Test Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Career Track
                </label>
                <select
                  value={careerId}
                  onChange={(e) => setCareerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  {careers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Course Code
                </label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Target Skill
                </label>
                <input
                  type="text"
                  required
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Difficulty · Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <select
                    value={adminExamType}
                    onChange={(e) => setAdminExamType(e.target.value as typeof adminExamType)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="mixed">Mixed (MCQ + Code)</option>
                    <option value="mcq">MCQ Only</option>
                    <option value="coding">Coding Lab</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Passing Score (%) · Duration (min)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={40}
                    max={100}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                  />
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Max Allowed Tab Switches
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={maxTabSwitches}
                  onChange={(e) => setMaxTabSwitches(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                />
              </div>
            </div>

            {questions.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#DCE5DF] dark:border-[#24302A]">
                <h3 className="text-sm font-semibold">Generated Questions Preview ({questions.length})</h3>
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#25322C] space-y-2 text-xs"
                  >
                    <p className="font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                      Q{idx + 1} [{q.questionType.toUpperCase()} · {q.conceptTag}]: {q.prompt}
                    </p>
                    {q.codeSnippet && (
                      <pre className="p-2.5 rounded-lg bg-slate-950 text-slate-100 text-[11px] font-mono overflow-x-auto">
                        <code>{q.codeSnippet}</code>
                      </pre>
                    )}
                    {q.options.length > 0 && (
                      <p className="text-[#5C6B63] dark:text-[#99A8A0]">
                        Options: {q.options.join(' | ')}
                      </p>
                    )}
                    <p className="text-[#2D6A4F] dark:text-[#74C69D] font-medium">
                      Reference Answer: {q.correctAnswer}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#DCE5DF] dark:border-[#24302A]">
              <button
                type="submit"
                disabled={submitting || questions.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Publishing...' : 'Release Assessment to Student Portal'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: MANAGE TESTS */}
        {tab === 'tests' && (
          <div className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-4">
            <h2 className="text-base font-bold">Released &amp; Draft University Assessments</h2>
            <div className="divide-y divide-[#DCE5DF] dark:divide-[#24302A]">
              {adminData.assessments.map((a) => (
                <div key={a.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE]">{a.title}</p>
                    <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
                      {a.courseCode || 'General'} · {a.skillName} · {a.difficulty} · {a.questions.length} Qs · Fullscreen (Max {a.maxTabSwitches} switches)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold ${
                        a.isPublished ? 'text-[#2D6A4F] dark:text-[#74C69D]' : 'text-[#7B8A82]'
                      }`}
                    >
                      {a.isPublished ? 'Published Live' : 'Archived / Draft'}
                    </span>
                    <button
                      onClick={() => handleTogglePublish(a.id, a.isPublished)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] text-xs font-medium hover:bg-[#EDF4EF] dark:hover:bg-[#1B2520]"
                    >
                      {a.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{a.isPublished ? 'Unpublish' : 'Publish'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTest(a.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      title="Delete test"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: STUDENT ROSTER */}
        {tab === 'students' && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] overflow-x-auto">
              <h2 className="text-base font-bold mb-4">Enrolled Students (Roll No. Directory)</h2>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#DCE5DF] dark:border-[#24302A] text-[#5C6B63] dark:text-[#99A8A0]">
                  <tr>
                    <th className="py-2.5 pr-4">Roll No.</th>
                    <th className="py-2.5 pr-4">Student Name</th>
                    <th className="py-2.5 pr-4">Target Career</th>
                    <th className="py-2.5 pr-4">Completed</th>
                    <th className="py-2.5 pr-4">Avg Score</th>
                    <th className="py-2.5 pr-4">Violations / Terminated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE5DF] dark:divide-[#24302A]">
                  {adminData.students.map((st) => (
                    <tr key={st.id}>
                      <td className="py-3 pr-4 font-mono font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                        {st.rollNumber} ({st.email})
                      </td>
                      <td className="py-3 pr-4 font-medium text-[#18221D] dark:text-[#ECF2EE]">{st.fullName}</td>
                      <td className="py-3 pr-4 text-[#5C6B63] dark:text-[#99A8A0]">{st.targetCareerId}</td>
                      <td className="py-3 pr-4 font-mono tabular-nums">{st.completedAssessments}</td>
                      <td className="py-3 pr-4 font-mono tabular-nums font-semibold">{st.avgScore}%</td>
                      <td className="py-3 pr-4 font-mono tabular-nums">
                        <span className={st.terminatedTests > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>
                          {st.proctoringViolations} alerts · {st.terminatedTests} terminated
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
              <h2 className="text-base font-bold mb-4">Recent Student Exam Submissions</h2>
              <div className="divide-y divide-[#DCE5DF] dark:divide-[#24302A]">
                {adminData.recentSubmissions.map((sub) => (
                  <div key={sub.id} className="py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div>
                      <p className="font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                        Roll {sub.rollNumber} ({sub.studentName}) · {sub.title}
                      </p>
                      <p className="text-[#5C6B63] dark:text-[#99A8A0]">
                        Skill: {sub.skillName} · Tab switches: {sub.tabSwitchCount}
                      </p>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        sub.status === 'terminated_proctoring'
                          ? 'text-rose-600 dark:text-rose-400'
                          : (sub.score ?? 0) >= 70
                            ? 'text-[#2D6A4F] dark:text-[#74C69D]'
                            : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {sub.status === 'terminated_proctoring' ? 'TERMINATED (PROCTORING)' : `${sub.score}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PROCTORING AUDIT LOGS */}
        {tab === 'proctoring' && (
          <div className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Fullscreen &amp; Tab-Switch Violation Audit Log</h2>
              <span className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                Policy: &gt;3 switches triggers auto-termination
              </span>
            </div>
            {adminData.proctoringLogs.length === 0 ? (
              <p className="text-sm text-[#5C6B63] dark:text-[#99A8A0]">
                No proctoring violations logged yet.
              </p>
            ) : (
              <div className="divide-y divide-[#DCE5DF] dark:divide-[#24302A]">
                {adminData.proctoringLogs.map((log) => (
                  <div key={log.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          log.eventType === 'terminated' ? 'text-rose-600' : 'text-amber-500'
                        }`}
                      />
                      <div>
                        <p className="font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                          Roll {log.rollNumber} ({log.studentName}) · {log.assessmentTitle}
                        </p>
                        <p className="text-[#5C6B63] dark:text-[#99A8A0]">{log.details}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span
                        className={
                          log.eventType === 'terminated'
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : 'text-amber-600 dark:text-amber-400'
                        }
                      >
                        Switch #{log.switchCount} ({log.eventType})
                      </span>
                      <p className="text-[11px] text-[#7B8A82]">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: COURSES & SYLLABUS CATALOG */}
        {tab === 'courses' && (
          <form
            onSubmit={handleAddCourse}
            className="p-6 sm:p-8 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-5"
          >
            <h2 className="text-base font-bold">Add Role Course &amp; Syllabus Module</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#5C6B63] mb-1">Career Role</label>
                <select
                  value={newCourseCareer}
                  onChange={(e) => setNewCourseCareer(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
                >
                  {careers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6B63] mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6B63] mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6B63] mb-1">Skill Focus</label>
                <input
                  type="text"
                  required
                  value={newCourseSkill}
                  onChange={(e) => setNewCourseSkill(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6B63] mb-1">Syllabus Module Title</label>
                <input
                  type="text"
                  required
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6B63] mb-1">Topics (comma separated)</label>
                <input
                  type="text"
                  required
                  value={newModuleTopics}
                  onChange={(e) => setNewModuleTopics(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold"
            >
              Add Course &amp; Module to Curriculum
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
