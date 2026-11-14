import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  Maximize2,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { apiFetch, type AssessmentLaunchContext, type PageRoute } from '../lib/api';
import { t } from '../lib/i18n';
import type {
  AdminAssessment,
  AIAgentDecision,
  LearnerWorkspaceData,
  SkillAssessment,
} from '../types';

interface AssessmentPageProps {
  workspace: LearnerWorkspaceData;
  launchContext?: AssessmentLaunchContext;
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
  onInspectDecision: (decision: AIAgentDecision) => void;
  onNavigate: (route: PageRoute, context?: AssessmentLaunchContext) => void;
  onProctoringTermination: (warningMessage: string) => void;
}

const SKILL_OPTIONS = [
  'JavaScript',
  'Python',
  'SQL',
  'HTML',
  'CSS',
  'React',
  'Node.js',
  'TypeScript',
  'Web Security',
  'Networking & TCP/IP',
  'Linux & Shell',
  'SIEM & Threat Analysis',
  'Docker',
  'Machine Learning',
];

type PortalTab = 'daily_portal' | 'practice_workplace';
type ExamScreen = 'hub' | 'disclaimer' | 'countdown' | 'exam' | 'results';

interface PendingLaunchConfig {
  kind: 'admin' | 'adaptive';
  adminTest?: AdminAssessment;
  skillName: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  assessmentType: 'mixed' | 'mcq' | 'coding' | 'conceptual' | 'debugging' | 'scenario' | 'project_coding';
  assessmentMode: PortalTab;
  courseCode?: string;
  moduleCode?: string;
  title: string;
}

export function AssessmentPage({
  workspace,
  launchContext,
  onWorkspaceUpdate,
  onInspectDecision,
  onNavigate,
  onProctoringTermination,
}: AssessmentPageProps) {
  const lang = workspace.user.preferredLanguage || 'en';
  const defaultSkill =
    launchContext?.skill ||
    workspace.skills.find((s) => s.verifiedScore < 70)?.skillName ||
    workspace.skills[0]?.skillName ||
    'JavaScript';

  const [portalTab, setPortalTab] = useState<PortalTab>(launchContext?.assessmentMode || 'daily_portal');
  const [screen, setScreen] = useState<ExamScreen>('hub');
  const [skillName, setSkillName] = useState(defaultSkill);
  const [projectSkill, setProjectSkill] = useState(defaultSkill);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>(
    launchContext?.difficulty || 'beginner'
  );
  const [assessmentType, setAssessmentType] = useState<
    'mixed' | 'mcq' | 'coding' | 'conceptual' | 'debugging' | 'scenario' | 'project_coding'
  >(launchContext?.assessmentType || 'mixed');

  const [pendingLaunch, setPendingLaunch] = useState<PendingLaunchConfig | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [countdownValue, setCountdownValue] = useState(5);

  const [activeAssessment, setActiveAssessment] = useState<SkillAssessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lastDecision, setLastDecision] = useState<AIAgentDecision | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);

  // Fullscreen & 3-Switch Proctoring State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));
  const [proctoringBanner, setProctoringBanner] = useState<string | null>(null);
  const [switchCount, setSwitchCount] = useState<number>(0);
  const lastViolationTsRef = useRef<number>(0);
  const activeIdRef = useRef<string | null>(null);
  const activeStatusRef = useRef<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeAssessment?.id || null;
    activeStatusRef.current = activeAssessment?.status || null;
    if (activeAssessment) {
      setSwitchCount(activeAssessment.tabSwitchCount || 0);
    }
  }, [activeAssessment]);

  useEffect(() => {
    if (!launchContext) return;
    if (launchContext.skill) {
      setSkillName(launchContext.skill);
      setProjectSkill(launchContext.skill);
      if (!launchContext.difficulty) {
        const found = workspace.skills.find(
          (s) => s.skillName.toLowerCase() === launchContext.skill!.toLowerCase()
        );
        if (found) {
          setDifficulty(found.verifiedScore < 45 ? 'beginner' : found.verifiedScore < 78 ? 'intermediate' : 'advanced');
        }
      }
    }
    if (launchContext.difficulty) setDifficulty(launchContext.difficulty);
    if (launchContext.assessmentType) setAssessmentType(launchContext.assessmentType);
    if (launchContext.assessmentMode) {
      setPortalTab(launchContext.assessmentMode);
    } else if (launchContext.skill) {
      setPortalTab('practice_workplace');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchContext]);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  }, []);

  const exitFullscreenSafe = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    } finally {
      setIsFullscreen(false);
    }
  }, []);

  const triggerProctoringEvent = useCallback(
    async (eventType: 'tab_switch' | 'fullscreen_exit' | 'window_blur', details: string) => {
      const id = activeIdRef.current;
      if (!id || activeStatusRef.current !== 'in_progress') return;

      const now = Date.now();
      if (now - lastViolationTsRef.current < 900) return;
      lastViolationTsRef.current = now;

      try {
        const res = await apiFetch<{
          switchCount: number;
          maxSwitches: number;
          terminated: boolean;
          message: string;
          assessment: SkillAssessment;
          workspace: LearnerWorkspaceData;
        }>(`/api/assessments/${id}/proctoring-event`, {
          method: 'POST',
          body: JSON.stringify({ eventType, details }),
        });

        setSwitchCount(res.switchCount);
        setProctoringBanner(res.message);
        onWorkspaceUpdate(res.workspace);

        if (res.terminated) {
          activeStatusRef.current = 'terminated_proctoring';
          setActiveAssessment(res.assessment);
          await exitFullscreenSafe();
          onProctoringTermination(res.message);
        }
      } catch {
        // ignore transient blur network hiccup
      }
    },
    [exitFullscreenSafe, onProctoringTermination, onWorkspaceUpdate]
  );

  useEffect(() => {
    if (screen !== 'exam' || !activeAssessment || activeAssessment.status !== 'in_progress') return;

    const handleVisibility = () => {
      if (document.hidden) {
        void triggerProctoringEvent('tab_switch', 'Student switched browser tab or minimized window during exam.');
      }
    };

    const handleBlur = () => {
      void triggerProctoringEvent('window_blur', 'Exam window lost focus during active assessment.');
    };

    const handleFullscreenChange = () => {
      const inFs = Boolean(document.fullscreenElement);
      setIsFullscreen(inFs);
      if (!inFs && activeStatusRef.current === 'in_progress') {
        void triggerProctoringEvent('fullscreen_exit', 'Student exited fullscreen mode during active assessment.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [screen, activeAssessment, triggerProctoringEvent]);

  // Step 1: Open Disclaimer Screen
  const openDisclaimerForAdminTest = (test: AdminAssessment) => {
    setError(null);
    setRulesAccepted(false);
    setPendingLaunch({
      kind: 'admin',
      adminTest: test,
      skillName: test.skillName,
      difficulty: test.difficulty,
      assessmentType: 'mixed',
      assessmentMode: 'daily_portal',
      courseCode: test.courseCode,
      title: test.title,
    });
    setScreen('disclaimer');
  };

  const openDisclaimerForAdaptiveTest = (
    overrideMode?: PortalTab,
    overrideSkill?: string,
    overrideDifficulty?: 'beginner' | 'intermediate' | 'advanced',
    overrideType?: 'mixed' | 'mcq' | 'coding' | 'conceptual' | 'debugging' | 'scenario' | 'project_coding'
  ) => {
    setError(null);
    setClipboardNotice(null);
    setRulesAccepted(false);
    const chosenSkill = overrideSkill || skillName;
    const chosenDiff = overrideDifficulty || difficulty;
    const chosenType = overrideType || assessmentType;
    const chosenMode = overrideMode || portalTab;
    const labelPrefix =
      chosenType === 'project_coding'
        ? 'Daily Project Assessment'
        : chosenMode === 'daily_portal'
          ? 'Daily Portal'
          : 'Practice Workplace';
    setPendingLaunch({
      kind: 'adaptive',
      skillName: chosenSkill,
      difficulty: chosenDiff,
      assessmentType: chosenType,
      assessmentMode: chosenMode,
      courseCode: launchContext?.courseCode,
      moduleCode: launchContext?.moduleCode,
      title: `${labelPrefix}: ${chosenSkill} (${chosenDiff} · ${chosenType.replace('_', ' ')})`,
    });
    setScreen('disclaimer');
  };

  // Step 2 -> 3: Run 5-4-3-2-1 Countdown & Enter Exam Screen
  const beginCountdown = async () => {
    if (!rulesAccepted || !pendingLaunch) return;
    await enterFullscreen();
    setCountdownValue(5);
    setScreen('countdown');
  };

  useEffect(() => {
    if (screen !== 'countdown' || !pendingLaunch) return;

    if (countdownValue > 0) {
      const timer = setTimeout(() => setCountdownValue((v) => v - 1), 1000);
      return () => clearTimeout(timer);
    }

    // Countdown reached 0 -> generate/start test and transition to screen 3 ('exam')
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLastDecision(null);
        setProctoringBanner(null);
        setAnswers({});
        let created: SkillAssessment;
        if (pendingLaunch.kind === 'admin' && pendingLaunch.adminTest) {
          created = await apiFetch<SkillAssessment>(
            `/api/assessments/start-admin/${pendingLaunch.adminTest.id}`,
            { method: 'POST' }
          );
        } else {
          created = await apiFetch<SkillAssessment>('/api/assessments/generate', {
            method: 'POST',
            body: JSON.stringify({
              skillName: pendingLaunch.skillName,
              difficulty: pendingLaunch.difficulty,
              assessmentType: pendingLaunch.assessmentType,
              assessmentMode: pendingLaunch.assessmentMode,
              courseCode: pendingLaunch.courseCode,
              moduleCode: pendingLaunch.moduleCode,
            }),
          });
        }
        if (cancelled) return;
        setActiveAssessment(created);
        setSwitchCount(0);
        setScreen('exam');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to start assessment');
        setScreen('hub');
        await exitFullscreenSafe();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [screen, countdownValue, pendingLaunch, exitFullscreenSafe]);

  const handleSubmit = async () => {
    if (!activeAssessment) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{
        assessment: SkillAssessment;
        decision: AIAgentDecision;
        workspace: LearnerWorkspaceData;
      }>(`/api/assessments/${activeAssessment.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      setActiveAssessment(res.assessment);
      setLastDecision(res.decision);
      onWorkspaceUpdate(res.workspace);
      await exitFullscreenSafe();
      setScreen('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to grade assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewPast = async (id: string) => {
    setLoadingHistoryId(id);
    setError(null);
    setProctoringBanner(null);
    setClipboardNotice(null);
    try {
      const loaded = await apiFetch<SkillAssessment>(`/api/assessments/${id}`);
      setActiveAssessment(loaded);
      setLastDecision(null);
      if (loaded.status === 'in_progress') {
        const restoredAnswers: Record<string, string> = {};
        for (const q of loaded.questions || []) {
          if (q.userAnswer) restoredAnswers[q.id] = q.userAnswer;
        }
        setAnswers(restoredAnswers);
        await enterFullscreen();
        setScreen('exam');
      } else {
        setScreen('results');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load assessment details');
    } finally {
      setLoadingHistoryId(null);
    }
  };

  const questions = activeAssessment?.questions || [];
  const answeredCount = questions.filter((q) => (answers[q.id] || '').trim().length > 0).length;
  const isExamLive = screen === 'exam' && activeAssessment?.status === 'in_progress';
  const isClipboardLocked = isExamLive && activeAssessment?.assessmentMode === 'daily_portal';

  const blockClipboardAction = (e: { preventDefault: () => void }) => {
    if (!isClipboardLocked) return;
    e.preventDefault();
    setClipboardNotice(
      'Copy, Paste, and Cut are strictly disabled during Daily Portal Assessments & University Exams (permitted inside Practice Workplace).'
    );
  };

  const moduleProgress = workspace.moduleProgress || [];
  const totalModules = moduleProgress.length;
  const completedModules = moduleProgress.filter((m) => m.completionPercent >= 70).length;
  const overallModulePct =
    totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const completedTodayCount = workspace.assessments.filter(
    (a) =>
      a.status === 'completed' &&
      (a.completedAt || a.createdAt).slice(0, 10) === todayStr
  ).length;

  // --------------------------------------------------------------------------
  // SCREEN 1: TEST REGULATIONS & DISCLAIMER VERIFICATION
  // --------------------------------------------------------------------------
  if (screen === 'disclaimer' && pendingLaunch) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-6">
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#DCE5DF] dark:border-[#24302A]">
            <div>
              <p className="text-xs font-mono font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                STEP 1 OF 4 · PRE-TEST REGULATIONS &amp; VERIFICATION
              </p>
              <h2 className="text-2xl font-bold text-[#18221D] dark:text-[#ECF2EE] mt-1">
                {pendingLaunch.title}
              </h2>
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
                Mode: {pendingLaunch.assessmentMode === 'daily_portal' ? 'Daily Portal Completion' : 'Practice Workplace'} · Roll No. {workspace.user.rollNumber}
              </p>
            </div>
            <ShieldAlert className="w-6 h-6 text-[#2D6A4F] dark:text-[#74C69D] shrink-0" />
          </div>

          <div className="space-y-3 text-sm text-[#3E4C45] dark:text-[#C4D0C9]">
            <h3 className="font-semibold text-[#18221D] dark:text-white">
              ZyraTech Assessment Regulations &amp; Proctoring Policy
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm bg-[#F6F9F7] dark:bg-[#18211C] p-5 rounded-xl border border-[#DCE5DF] dark:border-[#24302A]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] mt-0.5 shrink-0" />
                <span>
                  <strong>Mandatory Fullscreen Lock:</strong> Clicking start enters fullscreen mode immediately and displays a 5-to-1 preparation countdown.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] mt-0.5 shrink-0" />
                <span>
                  <strong>3-Switch Integrity Rule:</strong> Switching tabs, blurring windows, or exiting fullscreen logs an incident. More than 3 switches automatically terminates your exam and returns you to the Dashboard.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] mt-0.5 shrink-0" />
                <span>
                  <strong>Clipboard &amp; Context Guard:</strong>{' '}
                  {pendingLaunch.assessmentMode === 'daily_portal'
                    ? 'Copy, paste, cut, drag/drop, and right-click are strictly blocked during Daily Portal & Official University Tests.'
                    : 'Practice Workplace enables copy & paste inside your code editor so you can iterate freely while keeping fullscreen proctoring active.'}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] mt-0.5 shrink-0" />
                <span>
                  <strong>AI Result &amp; Career Logic Analysis:</strong> After submission, Gemini AI grades MCQ &amp; Coding responses, updates Skill DNA, and explains the career logic behind every question.
                </span>
              </li>
            </ul>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-xl border border-[#C6DFCE] dark:border-[#2C4738] bg-[#EDF5F0] dark:bg-[#16231C] cursor-pointer">
            <input
              type="checkbox"
              checked={rulesAccepted}
              onChange={(e) => setRulesAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#2D6A4F]"
            />
            <span className="text-xs sm:text-sm font-medium text-[#18221D] dark:text-[#ECF2EE]">
              I verify that I am Roll No. {workspace.user.rollNumber} and agree to complete this assessment in fullscreen under the 3-switch proctoring rules.
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setPendingLaunch(null);
                setScreen('hub');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] text-xs font-semibold text-[#3E4C45] dark:text-[#C4D0C9]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel &amp; Return</span>
            </button>

            <button
              type="button"
              disabled={!rulesAccepted}
              onClick={beginCountdown}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-sm font-semibold transition-colors disabled:opacity-40"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Verify &amp; Start 5-to-1 Countdown</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 2: 5-TO-1 FULLSCREEN PREPARATION COUNTDOWN
  // --------------------------------------------------------------------------
  if (screen === 'countdown' && pendingLaunch) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="max-w-lg w-full p-8 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] text-center space-y-6">
          <p className="text-xs font-mono font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
            STEP 2 OF 4 · INITIALIZING PROCTORED ENVIRONMENT
          </p>
          <div className="w-28 h-28 mx-auto rounded-full bg-[#EDF5F0] dark:bg-[#16231C] border-2 border-[#2D6A4F] dark:border-[#52B788] flex items-center justify-center">
            <span className="text-5xl font-bold font-mono tabular-nums text-[#2D6A4F] dark:text-[#74C69D]">
              {countdownValue > 0 ? countdownValue : 'GO'}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#18221D] dark:text-[#ECF2EE]">
              {countdownValue > 0
                ? 'Preparing Your Proctored Exam...'
                : 'Asking Gemini AI & Opening Test Paper...'}
            </h2>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-2">
              {pendingLaunch.title}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 3 & 4: LIVE PROCTORED EXAM OR POST-TEST AI ANALYSIS RESULTS
  // --------------------------------------------------------------------------
  if ((screen === 'exam' || screen === 'results') && activeAssessment) {
    return (
      <div
        className={`space-y-6 ${isClipboardLocked ? 'select-none' : ''}`}
        onCopy={blockClipboardAction}
        onPaste={blockClipboardAction}
        onCut={blockClipboardAction}
        onDragStart={blockClipboardAction}
        onDrop={blockClipboardAction}
        onContextMenu={(e) => {
          if (isClipboardLocked) {
            e.preventDefault();
            setClipboardNotice('Right-click context menu is disabled during Daily Portal Assessments & Exams.');
          }
        }}
        onKeyDown={(e) => {
          if (!isClipboardLocked) return;
          if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
            if (e.key.toLowerCase() !== 'a') {
              e.preventDefault();
              setClipboardNotice(
                'Ctrl/Cmd+C, V, and X are strictly disabled during Daily Portal Assessments & Official Exams.'
              );
            }
          }
        }}
      >
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-6">
          {isExamLive && (
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs">
                <ShieldAlert className={`w-4 h-4 ${switchCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span>
                  STEP 3 OF 4 · Live Fullscreen {isClipboardLocked ? 'Assessment (Copy/Paste Blocked)' : 'Practice Workplace (Copy/Paste Enabled)'} · Tab Switches:{' '}
                  <strong className="font-mono text-amber-300">{switchCount} / 3</strong>
                </span>
              </div>
              {!isFullscreen && (
                <button
                  type="button"
                  onClick={enterFullscreen}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Re-Enter Fullscreen</span>
                </button>
              )}
            </div>
          )}

          {clipboardNotice && isClipboardLocked && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
              <span>{clipboardNotice}</span>
              <button
                type="button"
                onClick={() => setClipboardNotice(null)}
                className="font-semibold underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {proctoringBanner && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {t(lang, 'tabSwitchWarning')} ({switchCount}/3)
                </p>
                <p className="mt-0.5">{proctoringBanner}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#DCE5DF] dark:border-[#24302A]">
            <div>
              <p className="text-xs font-mono text-[#2D6A4F] dark:text-[#74C69D]">
                {screen === 'results' ? 'STEP 4 OF 4 · AI POST-TEST ANALYSIS' : 'ACTIVE ASSESSMENT'} ·{' '}
                {activeAssessment.skillName} · {activeAssessment.difficulty}
                {activeAssessment.courseCode ? ` · ${activeAssessment.courseCode}` : ''}
              </p>
              <h3 className="text-xl font-bold text-[#18221D] dark:text-white mt-0.5">
                {activeAssessment.status === 'completed'
                  ? `${activeAssessment.title} — ${activeAssessment.score}% (${activeAssessment.correctCount}/${activeAssessment.totalQuestions})`
                  : activeAssessment.status === 'terminated_proctoring'
                    ? `${activeAssessment.title} — TERMINATED (PROCTORING)`
                    : activeAssessment.title}
              </h3>
            </div>

            {isExamLive ? (
              <span className="text-xs font-mono tabular-nums text-[#5C6B63] dark:text-[#99A8A0]">
                Answered {answeredCount}/{questions.length}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveAssessment(null);
                  setScreen('hub');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] text-xs font-semibold hover:bg-[#F6F9F7] dark:hover:bg-[#1A221E]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Assessment Portal</span>
              </button>
            )}
          </div>

          {screen === 'results' && (
            <div className="p-5 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                    AI Grading &amp; Diagnostic Summary
                  </p>
                  <p className="text-sm font-semibold text-[#18221D] dark:text-white mt-0.5">
                    {activeAssessment.feedback}
                  </p>
                </div>
                <span
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    activeAssessment.status === 'terminated_proctoring'
                      ? 'text-rose-600'
                      : (activeAssessment.score ?? 0) >= 75
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {activeAssessment.score ?? 0}%
                </span>
              </div>

              {activeAssessment.weakConcepts.length > 0 && (
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  Weak concepts flagged for remediation: {activeAssessment.weakConcepts.join(' · ')}
                </p>
              )}

              {lastDecision && (
                <div className="pt-3 border-t border-[#CFE2D6] dark:border-[#243B2E] flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#3E4C45] dark:text-[#C4D0C9]">
                    <strong>6-Agent Orchestrator Next Action:</strong> {lastDecision.nextAction}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onInspectDecision(lastDecision)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>6-Agent Trace</span>
                    </button>
                    <button
                      onClick={() => onNavigate('syllabus')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#18221D] dark:text-white hover:underline"
                    >
                      <span>View Recommended Syllabus</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Questions */}
          <div className="space-y-5">
            {questions.map((q, idx) => {
              const isFinished = screen === 'results' || !isExamLive;
              return (
                <div
                  key={q.id}
                  className="p-5 rounded-xl border border-[#DCE5DF] dark:border-[#24302A] bg-[#F8FBF9] dark:bg-[#121916] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                    <span>
                      Question 0{idx + 1} · {q.questionType.toUpperCase()} · Concept: {q.conceptTag}
                    </span>
                    {isFinished && (
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          q.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {q.isCorrect ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Needs Review
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-[#18221D] dark:text-slate-100 leading-relaxed">
                    {q.prompt}
                  </p>

                  {q.codeSnippet && (
                    <pre className="p-3.5 rounded-lg bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-800">
                      <code>{q.codeSnippet}</code>
                    </pre>
                  )}

                  {q.options.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {q.options.map((opt) => {
                        const checked = isFinished ? q.userAnswer === opt : answers[q.id] === opt;
                        const isRightOpt = isFinished && q.correctAnswer === opt;
                        return (
                          <label
                            key={opt}
                            className={`flex items-start gap-3 p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                              isFinished
                                ? isRightOpt
                                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                                  : checked && !q.isCorrect
                                    ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30'
                                    : 'border-[#DCE5DF] dark:border-[#24302A]'
                                : checked
                                  ? 'border-[#2D6A4F] bg-[#EDF5F0] dark:bg-[#16231C]'
                                  : 'border-[#DCE5DF] dark:border-[#24302A] hover:bg-white dark:hover:bg-[#19221D]'
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              disabled={isFinished}
                              checked={checked}
                              onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                              className="mt-1 accent-[#2D6A4F]"
                            />
                            <span className="text-[#18221D] dark:text-slate-200">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea
                      rows={5}
                      disabled={isFinished}
                      value={isFinished ? q.userAnswer || '' : answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      onCopy={blockClipboardAction}
                      onPaste={blockClipboardAction}
                      onCut={blockClipboardAction}
                      spellCheck={false}
                      autoComplete="off"
                      placeholder={
                        isClipboardLocked
                          ? 'Type your own code or solution directly (copy/paste is disabled in Daily Portal & Exams)...'
                          : 'Write or paste your code implementation or debugging solution here (copy/paste enabled in Practice Workplace)...'
                      }
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#101613] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                    />
                  )}

                  {isFinished && (
                    <div className="pt-3 border-t border-[#DCE5DF] dark:border-[#24302A] text-xs space-y-1.5">
                      {q.aiEvaluation && (
                        <p className="text-[#18221D] dark:text-[#ECF2EE]">
                          <strong>AI Evaluation:</strong> {q.aiEvaluation}
                        </p>
                      )}
                      {q.explanation && (
                        <p className="text-[#4B5952] dark:text-[#A9B7AF]">
                          <strong>Technical Answer Logic:</strong> {q.explanation}
                        </p>
                      )}
                      {q.careerLogic && (
                        <p className="text-[#2D6A4F] dark:text-[#74C69D]">
                          <strong>Why This Matters for Your Career &amp; Level:</strong> {q.careerLogic}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isExamLive ? (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#DCE5DF] dark:border-[#24302A]">
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                Submitting exits fullscreen, evaluates with Gemini AI, and opens your AI Results Analysis screen.
              </p>
              <button
                onClick={handleSubmit}
                disabled={submitting || answeredCount === 0}
                className="px-6 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-sm font-semibold disabled:opacity-60"
              >
                {submitting ? 'Analyzing with Gemini AI...' : 'Submit & Analyze Results'}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#DCE5DF] dark:border-[#24302A]">
              <button
                onClick={() => openDisclaimerForAdaptiveTest(activeAssessment.assessmentMode || portalTab)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake / Advance {skillName}</span>
              </button>
              <button
                onClick={() => onNavigate('mentor')}
                className="px-4 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] text-xs font-semibold"
              >
                Ask AI Mentor About Weak Concepts
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // HUB: MODULE-WISE COMPLETION % + DAILY PORTAL VS PRACTICE WORKPLACE
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
            <ShieldCheck className="w-4 h-4" />
            <span>ZyraTech Assessment &amp; Module Verification Portal</span>
          </div>
          <h2 className="text-xl font-bold text-[#18221D] dark:text-white mt-0.5">
            {t(lang, 'assessments')}
          </h2>
          <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
            Disclaimer Verification &rarr; 5-to-1 Countdown &rarr; Fullscreen Proctored Exam &rarr; AI Results Analysis
          </p>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="text-right">
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">Overall Module Completion</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#2D6A4F] dark:text-[#74C69D]">
              {overallModulePct}% ({completedModules}/{totalModules})
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Module-Wise Completion Percentage Grid */}
      {moduleProgress.length > 0 && (
        <section className="p-6 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#18221D] dark:text-white">
                Module-Wise Completion Progress ({workspace.compatibility?.career.title})
              </h3>
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                Identify strong vs unfinished syllabus modules across your active career courses.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
              {overallModulePct}% Overall
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {moduleProgress.map((m) => (
              <div
                key={`${m.courseCode}-${m.moduleCode}`}
                className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs font-mono">
                    <span className="font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                      {m.courseCode} · {m.moduleCode}
                    </span>
                    <span className="tabular-nums font-bold text-[#18221D] dark:text-white">
                      {m.completionPercent}%
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#18221D] dark:text-[#ECF2EE] mt-1">
                    {m.moduleTitle}
                  </p>
                  <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
                    Skill: {m.skillFocus} · {m.completionPercent >= 70 ? 'Completed' : m.attended ? 'Attended' : 'Needs Assessment'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-full h-1.5 rounded-full bg-[#DCE5DF] dark:bg-[#24302A] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.completionPercent >= 70 ? 'bg-[#2D6A4F] dark:bg-[#52B788]' : 'bg-amber-500'}`}
                      style={{ width: `${m.completionPercent}%` }}
                    />
                  </div>
                  <button
                    onClick={() =>
                      openDisclaimerForAdaptiveTest(
                        'practice_workplace',
                        m.skillFocus,
                        m.completionPercent < 45 ? 'beginner' : 'intermediate',
                        'mixed'
                      )
                    }
                    className="text-[11px] font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
                  >
                    {m.completionPercent >= 70 ? 'Practice Advanced Drill →' : 'Take Module Test →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Separated Modes: Daily Portal Completion vs Practice Workplace */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-[#E8EFEA] dark:bg-[#17201C] border border-[#DCE5DF] dark:border-[#24302A] w-fit">
        <button
          type="button"
          onClick={() => setPortalTab('daily_portal')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            portalTab === 'daily_portal'
              ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white'
              : 'text-[#3E4C45] dark:text-[#C4D0C9] hover:bg-white/60 dark:hover:bg-[#1F2B25]'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Daily Portal Completion ({workspace.publishedTests.length} Exams · {completedTodayCount} Today)</span>
        </button>

        <button
          type="button"
          onClick={() => setPortalTab('practice_workplace')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            portalTab === 'practice_workplace'
              ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white'
              : 'text-[#3E4C45] dark:text-[#C4D0C9] hover:bg-white/60 dark:hover:bg-[#1F2B25]'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Practice Workplace (Basic to High MCQ &amp; Coding)</span>
        </button>
      </div>

      {/* TAB 1: DAILY PORTAL COMPLETION */}
      {portalTab === 'daily_portal' && (
        <section className="p-6 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#DCE5DF] dark:border-[#24302A]">
            <div>
              <h3 className="text-base font-bold text-[#18221D] dark:text-white">
                Daily Portal Completion — Official &amp; Daily Scheduled Assessments
              </h3>
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
                Complete faculty-released exams or your daily AI skill check. All exams require rule verification &amp; 5-to-1 countdown.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#2D6A4F] dark:text-[#74C69D]">
              <Clock className="w-3.5 h-3.5" />
              <span>Today&apos;s Completed Assessments: {completedTodayCount}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {workspace.publishedTests.map((test) => (
              <div
                key={test.id}
                className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#2D6A4F] dark:text-[#74C69D] font-mono">
                    <span>{test.courseCode || 'DAILY UNIVERSITY EXAM'}</span>
                    <span>
                      {test.durationMinutes} min · Pass {test.passingScore}%
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#18221D] dark:text-white mt-1">{test.title}</h4>
                  <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
                    Skill: {test.skillName} · {test.difficulty} · {test.questions.length} questions · Max {test.maxTabSwitches} switches
                  </p>
                </div>
                <button
                  onClick={() => openDisclaimerForAdminTest(test)}
                  className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Review Rules &amp; Start Daily Exam</span>
                </button>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] flex flex-col justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#18221D] dark:text-white">
                  Daily AI Benchmark Check ({skillName})
                </p>
                <p className="text-xs text-[#4B5952] dark:text-[#A9B7AF] mt-1">
                  Verify your daily target skill in fullscreen (copy/paste blocked) and update your official Daily Portal streak.
                </p>
              </div>
              <button
                onClick={() => openDisclaimerForAdaptiveTest('daily_portal', skillName, difficulty, 'mixed')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Daily Benchmark Check</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[#18221D] dark:text-white">
                    Daily Assessment of Projects (Coding Lab)
                  </p>
                  <Code2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] shrink-0" />
                </div>
                <p className="text-xs text-[#4B5952] dark:text-[#A9B7AF]">
                  Complete today&apos;s hands-on project coding &amp; debugging assessment in strict exam mode (copy/paste disabled).
                </p>
                <select
                  value={projectSkill}
                  onChange={(e) => setProjectSkill(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#101613] text-xs font-semibold"
                >
                  {Array.from(new Set([...SKILL_OPTIONS, ...workspace.skills.map((s) => s.skillName)])).map((s) => (
                    <option key={s} value={s}>
                      Project Stack: {s}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => openDisclaimerForAdaptiveTest('daily_portal', projectSkill, 'intermediate', 'project_coding')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Start Daily Project Coding Assessment</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: PRACTICE WORKPLACE */}
      {portalTab === 'practice_workplace' && (
        <section className="p-6 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
              <Sparkles className="w-4 h-4" />
              <span>Practice Workplace · Basic to High Level (MCQ &amp; Coding)</span>
            </div>
            <h3 className="text-base font-bold text-[#18221D] dark:text-white mt-0.5">
              Targeted Skill Practice Generator
            </h3>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
              Choose your skill, progression tier (Basic &rarr; Intermediate &rarr; High), and format (MCQ or Coding). Every question includes career logic explanation after submission.
            </p>
          </div>

          <div className="grid sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-[#5C6B63] dark:text-slate-400 mb-1.5">
                Skill to Practice
              </label>
              <select
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-900 text-sm"
              >
                {Array.from(new Set([...SKILL_OPTIONS, ...workspace.skills.map((s) => s.skillName)])).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C6B63] dark:text-slate-400 mb-1.5">
                Difficulty Tier
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-900 text-sm"
              >
                <option value="beginner">Basic (Beginner)</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">High (Advanced)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C6B63] dark:text-slate-400 mb-1.5">
                Test Format
              </label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value as typeof assessmentType)}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-900 text-sm"
              >
                <option value="mixed">Mixed (MCQ &amp; Coding)</option>
                <option value="mcq">Multiple-Choice (MCQ)</option>
                <option value="coding">Hands-On Coding</option>
                <option value="debugging">Debugging</option>
                <option value="conceptual">Conceptual</option>
              </select>
            </div>

            <button
              onClick={() => openDisclaimerForAdaptiveTest('practice_workplace')}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-sm font-semibold transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Proceed to Rules</span>
            </button>
          </div>
        </section>
      )}

      {/* Assessment History */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
        <h3 className="text-sm font-semibold text-[#18221D] dark:text-white mb-4">
          Assessment History &amp; AI Reports
        </h3>
        {workspace.assessments.length === 0 ? (
          <p className="text-sm text-[#5C6B63] dark:text-slate-400">
            No assessments taken yet. Start a Daily Portal exam or Practice Workplace drill above.
          </p>
        ) : (
          <div className="divide-y divide-[#E4ECE7] dark:divide-[#24302A]">
            {workspace.assessments.map((a) => (
              <div key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#18221D] dark:text-slate-100">
                    {a.title} · {a.difficulty}
                  </p>
                  <p className="text-xs text-[#5C6B63] dark:text-slate-400">
                    {new Date(a.createdAt).toLocaleDateString()} ·{' '}
                    {a.assessmentMode === 'daily_portal' ? 'Daily Portal' : 'Practice Workplace'} · Switches:{' '}
                    {a.tabSwitchCount}/3
                    {a.weakConcepts.length > 0 && ` · Weak: ${a.weakConcepts.join(', ')}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-sm font-mono tabular-nums font-semibold ${
                      a.status === 'terminated_proctoring'
                        ? 'text-rose-600 dark:text-rose-400'
                        : a.status !== 'completed'
                          ? 'text-amber-500'
                          : (a.score ?? 0) >= 75
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {a.status === 'completed'
                      ? `${a.score}%`
                      : a.status === 'terminated_proctoring'
                        ? 'Terminated'
                        : 'In Progress'}
                  </span>
                  <button
                    onClick={() => handleViewPast(a.id)}
                    disabled={loadingHistoryId === a.id}
                    className="text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
                  >
                    {loadingHistoryId === a.id ? 'Loading...' : 'View AI Analysis'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
