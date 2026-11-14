import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  GitCompare,
  GraduationCap,
  HeartHandshake,
  Lock,
  Mic,
  MicOff,
  Scale,
  Sparkles,
} from 'lucide-react';
import { apiFetch, type AssessmentLaunchContext, type PageRoute } from '../lib/api';
import { playPopSound } from '../lib/sound';
import type {
  CareerRole,
  CommunityMissionSubmission,
  CommunityMissionTemplate,
  LearnerWorkspaceData,
  ParallelChallengeItem,
  ReverseTeachingItem,
} from '../types';

interface CareerArenaPageProps {
  workspace: LearnerWorkspaceData;
  careers: CareerRole[];
  initialTab?: 'parallel' | 'reverse-teaching' | 'escape-room' | 'community' | 'ethical';
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
  onNavigate: (
    route: PageRoute,
    context?: AssessmentLaunchContext & { careerId?: string }
  ) => void;
}

interface SpeechRecognitionCtor {
  new (): {
    lang: string;
    interimResults: boolean;
    onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  };
}

export function CareerArenaPage({
  workspace,
  careers,
  initialTab,
  onWorkspaceUpdate,
  onNavigate,
}: CareerArenaPageProps) {
  const [activeTab, setActiveTab] = useState<
    'parallel' | 'reverse-teaching' | 'escape-room' | 'community' | 'ethical'
  >(initialTab || 'parallel');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Parallel Challenge state
  const [activeChallenge, setActiveChallenge] = useState<ParallelChallengeItem | null>(
    workspace.parallelChallenges[0] || null
  );
  const [parallelInputs, setParallelInputs] = useState<Record<string, string>>({});
  const [parallelBusy, setParallelBusy] = useState(false);

  // Reverse Teaching state
  const [rtSkill, setRtSkill] = useState(workspace.skills[0]?.skillName || 'JavaScript');
  const [rtConcept, setRtConcept] = useState('Async Promises & Error Handling');
  const [rtExplanation, setRtExplanation] = useState('');
  const [activeRt, setActiveRt] = useState<ReverseTeachingItem | null>(
    workspace.reverseTeaching.find((r) => r.status === 'awaiting_followup') ||
      workspace.reverseTeaching[0] ||
      null
  );
  const [rtFollowUp, setRtFollowUp] = useState('');
  const [rtBusy, setRtBusy] = useState(false);
  const [listeningField, setListeningField] = useState<'rt' | 'followup' | null>(null);

  // Community Missions state
  const [missionsCatalog, setMissionsCatalog] = useState<CommunityMissionTemplate[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string>('');
  const [cmSummary, setCmSummary] = useState('');
  const [cmProof, setCmProof] = useState('');
  const [cmLink, setCmLink] = useState('');
  const [cmImpact, setCmImpact] = useState('');
  const [cmBusy, setCmBusy] = useState(false);
  const [cmSuccess, setCmSuccess] = useState<CommunityMissionSubmission | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ communityMissions: CommunityMissionTemplate[] }>('/api/universe')
      .then((res) => {
        setMissionsCatalog(res.communityMissions || []);
        if (res.communityMissions?.length && !selectedMissionId) {
          setSelectedMissionId(res.communityMissions[0].id);
        }
      })
      .catch(() => {
        // fallback silently if catalog fails
      });
  }, [selectedMissionId]);

  const speechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startVoiceDictation = (target: 'rt' | 'followup') => {
    if (!speechSupported) {
      setError('Speech dictation is unavailable in this browser; please type your explanation.');
      return;
    }
    const Ctor = ((window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition) as SpeechRecognitionCtor;
    const rec = new Ctor();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const spoken = ev.results?.[0]?.[0]?.transcript || '';
      if (!spoken) return;
      if (target === 'rt') setRtExplanation((p) => (p ? `${p} ${spoken}` : spoken));
      else setRtFollowUp((p) => (p ? `${p} ${spoken}` : spoken));
    };
    rec.onerror = () => setListeningField(null);
    rec.onend = () => setListeningField(null);
    setListeningField(target);
    rec.start();
  };

  const handleStartParallel = async () => {
    playPopSound('action');
    setParallelBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{
        challenge: ParallelChallengeItem;
        workspace: LearnerWorkspaceData;
      }>('/api/parallel-challenge/start', { method: 'POST' });
      setActiveChallenge(res.challenge);
      setParallelInputs({});
      onWorkspaceUpdate(res.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start Parallel Challenge.');
    } finally {
      setParallelBusy(false);
    }
  };

  const handleSubmitParallel = async () => {
    if (!activeChallenge) return;
    const hasAll = activeChallenge.tasks.every(
      (t) => (parallelInputs[t.careerId] || '').trim().length >= 10
    );
    if (!hasAll) {
      setError('Complete all 3 role mini-tasks (at least 10 characters each) so Zyra can compare fairly.');
      return;
    }
    playPopSound('action');
    setParallelBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{
        challenge: ParallelChallengeItem;
        workspace: LearnerWorkspaceData;
      }>(`/api/parallel-challenge/${activeChallenge.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ submissions: parallelInputs }),
      });
      setActiveChallenge(res.challenge);
      onWorkspaceUpdate(res.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to score Parallel Challenge.');
    } finally {
      setParallelBusy(false);
    }
  };

  const handleStartReverseTeaching = async () => {
    if (rtExplanation.trim().length < 15) {
      setError('Teach the concept clearly in at least 15 characters before submitting.');
      return;
    }
    playPopSound('action');
    setRtBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{
        session: ReverseTeachingItem;
        workspace: LearnerWorkspaceData;
      }>('/api/reverse-teaching/start', {
        method: 'POST',
        body: JSON.stringify({
          skillName: rtSkill,
          conceptTitle: rtConcept,
          explanation: rtExplanation.trim(),
        }),
      });
      setActiveRt(res.session);
      setRtFollowUp('');
      onWorkspaceUpdate(res.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Reverse Teaching.');
    } finally {
      setRtBusy(false);
    }
  };

  const handleCompleteReverseTeaching = async () => {
    if (!activeRt || rtFollowUp.trim().length < 8) {
      setError('Answer Zyra’s probing question thoroughly (min 8 chars).');
      return;
    }
    playPopSound('action');
    setRtBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{
        session: ReverseTeachingItem;
        workspace: LearnerWorkspaceData;
      }>(`/api/reverse-teaching/${activeRt.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ followUpAnswer: rtFollowUp.trim() }),
      });
      setActiveRt(res.session);
      setRtExplanation('');
      setRtFollowUp('');
      onWorkspaceUpdate(res.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete Reverse Teaching.');
    } finally {
      setRtBusy(false);
    }
  };

  const handleSubmitCommunityMission = async () => {
    if (!selectedMissionId || cmSummary.trim().length < 15) {
      setError('Describe your community solution in at least 15 characters.');
      return;
    }
    playPopSound('action');
    setCmBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{
        submission: CommunityMissionSubmission;
        workspace: LearnerWorkspaceData;
      }>('/api/community-missions/submit', {
        method: 'POST',
        body: JSON.stringify({
          missionId: selectedMissionId,
          solutionSummary: cmSummary.trim(),
          implementationProof: (cmProof || cmSummary).trim(),
          repoOrDemoLink: cmLink.trim(),
          impactNotes: cmImpact.trim(),
        }),
      });
      setCmSuccess(res.submission);
      setCmSummary('');
      setCmProof('');
      setCmLink('');
      setCmImpact('');
      onWorkspaceUpdate(res.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify community mission.');
    } finally {
      setCmBusy(false);
    }
  };

  const selectedMission =
    missionsCatalog.find((m) => m.id === selectedMissionId) || missionsCatalog[0] || null;

  const tabs: Array<{
    id: typeof activeTab;
    label: string;
    icon: typeof GitCompare;
  }> = [
    { id: 'parallel', label: 'Parallel Career Challenge', icon: GitCompare },
    { id: 'reverse-teaching', label: 'Reverse Teaching', icon: GraduationCap },
    { id: 'escape-room', label: 'Career Escape Room', icon: Lock },
    { id: 'community', label: 'Community Missions', icon: HeartHandshake },
    { id: 'ethical', label: 'Ethical Arena', icon: Scale },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#18221D] dark:text-[#ECF2EE]">
          Challenges, Reverse Teaching &amp; Community Missions
        </h2>
        <p className="text-sm text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
          Prove real skills by comparing career tracks head-to-head, teaching concepts back to Zyra, escaping locked technical scenarios, and solving community needs.
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-2 border-b border-[#DCE5DF] dark:border-[#24302A] pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                playPopSound('nav');
                setError(null);
                setActiveTab(tab.id);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white'
                  : 'bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] text-[#3E4C45] dark:text-[#C4D0C9] hover:border-[#2D6A4F]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* TAB 1: PARALLEL CAREER CHALLENGE */}
      {activeTab === 'parallel' && (
        <section className="space-y-5">
          <div className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#18221D] dark:text-[#ECF2EE]">
                Side-by-Side Role Challenge (Software Dev · Cybersecurity · Data Science)
              </h3>
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
                Complete one realistic task per domain evaluated against the exact same criteria so your strongest natural aptitude stands out with evidence.
              </p>
            </div>
            <button
              type="button"
              disabled={parallelBusy}
              onClick={handleStartParallel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <span>{parallelBusy ? 'Preparing Tasks...' : activeChallenge ? 'Start Fresh Challenge' : 'Start 3-Role Challenge'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeChallenge && (
            <div className="space-y-5">
              {activeChallenge.status === 'completed' && (
                <div className="p-6 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                        Highest Demonstrated Affinity
                      </p>
                      <h4 className="text-lg font-bold text-[#18221D] dark:text-[#ECF2EE]">
                        {activeChallenge.recommendedCareerTitle}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('careers', { careerId: activeChallenge.recommendedCareerId })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D6A4F] text-white text-xs font-semibold"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Explore {activeChallenge.recommendedCareerTitle} World</span>
                    </button>
                  </div>
                  <p className="text-sm text-[#18221D] dark:text-[#ECF2EE] leading-relaxed">
                    {activeChallenge.evidenceSummary}
                  </p>
                  <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0]">
                    {activeChallenge.disclaimer}
                  </p>
                </div>
              )}

              <div className="grid lg:grid-cols-3 gap-5">
                {activeChallenge.tasks.map((task) => (
                  <div
                    key={task.careerId}
                    className="p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                          {task.careerTitle}
                        </span>
                        {activeChallenge.status === 'completed' && (
                          <span className="font-mono tabular-nums text-sm font-bold text-[#2D6A4F] dark:text-[#74C69D]">
                            {task.overallScore}%
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-[#18221D] dark:text-[#ECF2EE]">
                        {task.taskTitle}
                      </h4>
                      <p className="text-xs text-[#4B5952] dark:text-[#A9B7AF] leading-relaxed">
                        {task.taskPrompt}
                      </p>
                      <pre className="p-3 rounded-lg bg-[#101613] text-[#D8E7DF] text-[11px] font-mono overflow-x-auto leading-relaxed">
                        {task.codeOrContext}
                      </pre>
                    </div>

                    {activeChallenge.status === 'active' ? (
                      <textarea
                        rows={4}
                        value={parallelInputs[task.careerId] || ''}
                        onChange={(e) =>
                          setParallelInputs((prev) => ({ ...prev, [task.careerId]: e.target.value }))
                        }
                        placeholder={`Your ${task.careerTitle} solution & edge cases...`}
                        className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-xs font-mono"
                      />
                    ) : (
                      <div className="p-3 rounded-lg bg-[#F6F9F7] dark:bg-[#19221D] border border-[#E4ECE7] dark:border-[#24302A] text-xs space-y-1.5">
                        <p className="font-mono tabular-nums text-[#2D6A4F] dark:text-[#74C69D]">
                          Exec {task.technicalExecution}% · Reason {task.analyticalReasoning}% · Edge {task.edgeCaseRigor}% · Clarity {task.clarity}%
                        </p>
                        <p className="text-[#4B5952] dark:text-[#A9B7AF]">{task.evidenceNote}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {activeChallenge.status === 'active' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={parallelBusy}
                    onClick={handleSubmitParallel}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold disabled:opacity-60"
                  >
                    <span>{parallelBusy ? 'Comparing Solutions...' : 'Submit All 3 Roles for Unified Comparison'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: REVERSE TEACHING CHALLENGE */}
      {activeTab === 'reverse-teaching' && (
        <section className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#18221D] dark:text-[#ECF2EE]">
                Teach Zyra a Concept in Your Own Words
              </h3>
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
                Explain a topic simply, defend it against Zyra’s probing follow-up question, expose hidden misconceptions, and clear Failure DNA patterns.
              </p>
            </div>

            {activeRt && activeRt.status === 'awaiting_followup' ? (
              <div className="space-y-4 p-4 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E]">
                <p className="text-xs font-mono text-[#2D6A4F] dark:text-[#74C69D]">
                  ACTIVE SESSION · {activeRt.skillName} · {activeRt.conceptTitle}
                </p>
                <div className="text-xs text-[#4B5952] dark:text-[#A9B7AF]">
                  <span className="font-semibold text-[#18221D] dark:text-[#ECF2EE]">You taught:</span> {activeRt.studentExplanation}
                </div>
                <div className="p-3.5 rounded-lg bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] text-sm text-[#18221D] dark:text-[#ECF2EE]">
                  <span className="font-semibold text-[#2D6A4F] dark:text-[#74C69D] block text-xs mb-1">
                    Zyra’s Probing Follow-Up Question:
                  </span>
                  {activeRt.companionFollowUpQuestion}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                      Your Follow-Up Defense
                    </label>
                    <button
                      type="button"
                      onClick={() => startVoiceDictation('followup')}
                      className="inline-flex items-center gap-1 text-xs text-[#2D6A4F] dark:text-[#74C69D]"
                    >
                      {listeningField === 'followup' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{listeningField === 'followup' ? 'Listening...' : 'Speak Answer'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={rtFollowUp}
                    onChange={(e) => setRtFollowUp(e.target.value)}
                    placeholder="Walk through the edge case or runtime mechanism to prove full mastery..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#101613] text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveRt(null)}
                    className="px-3 py-2 text-xs text-[#5C6B63]"
                  >
                    Start New Topic
                  </button>
                  <button
                    type="button"
                    disabled={rtBusy}
                    onClick={handleCompleteReverseTeaching}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2D6A4F] text-white text-xs font-semibold disabled:opacity-60"
                  >
                    <span>{rtBusy ? 'Grading Mastery...' : 'Submit Defense & Score'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Skill Domain</label>
                    <select
                      value={rtSkill}
                      onChange={(e) => setRtSkill(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
                    >
                      {Array.from(new Set([...workspace.skills.map((s) => s.skillName), 'Python', 'JavaScript', 'SQL', 'Cybersecurity Fundamentals'])).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Concept You Will Teach</label>
                    <input
                      type="text"
                      value={rtConcept}
                      onChange={(e) => setRtConcept(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold">Explain It Simply in Your Own Words</label>
                    <button
                      type="button"
                      onClick={() => startVoiceDictation('rt')}
                      className="inline-flex items-center gap-1 text-xs text-[#2D6A4F] dark:text-[#74C69D]"
                    >
                      {listeningField === 'rt' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{listeningField === 'rt' ? 'Listening...' : 'Dictate Explanation'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={rtExplanation}
                    onChange={(e) => setRtExplanation(e.target.value)}
                    placeholder={`Teach Zyra how ${rtConcept} works, why it matters, and give a real example...`}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={rtBusy}
                    onClick={handleStartReverseTeaching}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold disabled:opacity-60"
                  >
                    <span>{rtBusy ? 'Zyra Reading...' : 'Teach Zyra & Get Probing Question'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-4">
            <h3 className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE]">
              Completed Reverse Teaching Evaluations ({workspace.reverseTeaching.filter((r) => r.status === 'completed').length})
            </h3>
            {workspace.reverseTeaching.filter((r) => r.status === 'completed').length === 0 ? (
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                Finish teaching one concept to view Clarity &amp; Conceptual Depth scores plus detected misconceptions.
              </p>
            ) : (
              <div className="space-y-3">
                {workspace.reverseTeaching
                  .filter((r) => r.status === 'completed')
                  .slice(0, 4)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl bg-[#F6F9F7] dark:bg-[#19221D] border border-[#DCE5DF] dark:border-[#24302A] space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                          {r.skillName}: {r.conceptTitle}
                        </span>
                        <span className="font-mono tabular-nums text-[#2D6A4F] dark:text-[#74C69D] font-bold">
                          Clarity {r.clarityScore}% · Depth {r.conceptualDepthScore}%
                        </span>
                      </div>
                      <p className="text-[#4B5952] dark:text-[#A9B7AF]">{r.feedback}</p>
                      {r.missingConcepts.length > 0 && (
                        <p className="text-amber-700 dark:text-amber-300">
                          Missing: {r.missingConcepts.join(', ')}
                        </p>
                      )}
                      {r.misconceptions.length > 0 && (
                        <p className="text-rose-600 dark:text-rose-400">
                          Misconceptions: {r.misconceptions.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 3: CAREER ESCAPE ROOM */}
      {activeTab === 'escape-room' && (
        <section className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#18221D] dark:text-[#ECF2EE]">
                Adaptive Career Escape Room
              </h3>
              <p className="text-xs sm:text-sm text-[#5C6B63] dark:text-[#99A8A0] mt-1">
                Three progressive technical vault doors — Auth Injection &amp; Token Units, Cyclic Dependency Traps, and SQL Transaction Locks — dynamically scaled to your current Skill DNA.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onNavigate('workplace-sim', {
                  careerId: workspace.profile.targetCareerId,
                  simKind: 'escape_room',
                })
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <Lock className="w-4 h-4" />
              <span>Enter Locked Vault Simulation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {careers.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#19221D] border border-[#DCE5DF] dark:border-[#24302A] space-y-2"
              >
                <p className="text-xs font-mono text-[#2D6A4F] dark:text-[#74C69D]">{c.category}</p>
                <p className="text-sm font-bold text-[#18221D] dark:text-[#ECF2EE]">{c.title} Vault</p>
                <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                  Unlocks {c.requirements[0]?.skillName || 'Core'} problem-solving verification upon escape.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('workplace-sim', { careerId: c.id, simKind: 'escape_room' })
                  }
                  className="text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline inline-flex items-center gap-1 pt-1"
                >
                  <span>Play {c.title} Escape Room</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 4: REAL-WORLD COMMUNITY MISSIONS */}
      {activeTab === 'community' && (
        <section className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            {missionsCatalog.map((m) => {
              const selected = selectedMission?.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    playPopSound('nav');
                    setSelectedMissionId(m.id);
                    setCmSuccess(null);
                  }}
                  className={`w-full p-4 rounded-xl border text-left transition-colors ${
                    selected
                      ? 'bg-[#EDF5F0] dark:bg-[#16231C] border-[#2D6A4F] dark:border-[#52B788]'
                      : 'bg-white dark:bg-[#151C18] border-[#DCE5DF] dark:border-[#24302A]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-[#2D6A4F] dark:text-[#74C69D]">{m.category}</span>
                    <span className="text-[#5C6B63] dark:text-[#99A8A0]">{m.skillFocus} · ~{m.estimatedHours}h</span>
                  </div>
                  <p className="text-sm font-bold text-[#18221D] dark:text-[#ECF2EE] mt-1">{m.title}</p>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-4">
            {selectedMission && (
              <>
                <div>
                  <p className="text-xs font-mono text-[#2D6A4F] dark:text-[#74C69D]">
                    {selectedMission.category} · Target Skill: {selectedMission.skillFocus}
                  </p>
                  <h3 className="text-lg font-bold text-[#18221D] dark:text-[#ECF2EE] mt-0.5">
                    {selectedMission.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4B5952] dark:text-[#A9B7AF] mt-2 leading-relaxed">
                    {selectedMission.problemStatement}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F6F9F7] dark:bg-[#19221D] border border-[#DCE5DF] dark:border-[#24302A] space-y-1 text-xs">
                  <p className="font-semibold text-[#18221D] dark:text-[#ECF2EE]">Required Deliverable Proof:</p>
                  {selectedMission.deliverableChecklist.map((d, i) => (
                    <p key={i} className="text-[#5C6B63] dark:text-[#99A8A0]">• {d}</p>
                  ))}
                </div>

                {cmSuccess && (
                  <div className="p-4 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] text-xs space-y-1">
                    <p className="font-bold text-[#2D6A4F] dark:text-[#74C69D] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Community Mission Verified ({cmSuccess.aiScore}%) &amp; Added to Skill DNA Projects!</span>
                    </p>
                    <p className="text-[#18221D] dark:text-[#ECF2EE]">{cmSuccess.aiFeedback}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={cmSummary}
                    onChange={(e) => setCmSummary(e.target.value)}
                    placeholder="Solution Architecture & Approach (min 15 chars)..."
                    className="w-full px-3.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
                  />
                  <textarea
                    rows={3}
                    value={cmProof}
                    onChange={(e) => setCmProof(e.target.value)}
                    placeholder="Concrete implementation snippet, schema, test cases, or security checklist..."
                    className="w-full px-3.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-xs font-mono"
                  />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={cmLink}
                      onChange={(e) => setCmLink(e.target.value)}
                      placeholder="GitHub / Live Demo URL (optional)"
                      className="px-3.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-xs"
                    />
                    <input
                      type="text"
                      value={cmImpact}
                      onChange={(e) => setCmImpact(e.target.value)}
                      placeholder="Campus / Community impact note"
                      className="px-3.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                      Verified missions automatically create a portfolio project record.
                    </span>
                    <button
                      type="button"
                      disabled={cmBusy}
                      onClick={handleSubmitCommunityMission}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold disabled:opacity-60"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{cmBusy ? 'Verifying Proof...' : 'Submit & Verify Deliverable'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {workspace.communityMissions.length > 0 && (
              <div className="pt-4 border-t border-[#DCE5DF] dark:border-[#24302A] space-y-2">
                <p className="text-xs font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                  Verified Community Deliverables ({workspace.communityMissions.length})
                </p>
                {workspace.communityMissions.slice(0, 3).map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-lg bg-[#F6F9F7] dark:bg-[#19221D] text-xs flex items-center justify-between gap-3"
                  >
                    <span className="font-medium text-[#18221D] dark:text-[#ECF2EE] truncate">
                      {sub.title} ({sub.skillName})
                    </span>
                    <span className="font-mono font-bold text-[#2D6A4F] dark:text-[#74C69D] shrink-0">
                      {sub.aiScore}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 5: ETHICAL DECISION ARENA */}
      {activeTab === 'ethical' && (
        <section className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#18221D] dark:text-[#ECF2EE]">
                Ethical Decision Arena
              </h3>
              <p className="text-xs sm:text-sm text-[#5C6B63] dark:text-[#99A8A0] mt-1">
                Face realistic dilemmas involving leaked student PII, AI Manager deadline shortcuts, and hidden bias heuristics. Scored on Reasoning, Safety Awareness, Fairness, Privacy, and Professional Responsibility.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onNavigate('workplace-sim', {
                  careerId: workspace.profile.targetCareerId,
                  simKind: 'ethical_arena',
                })
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Ethical Dilemma Scenario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
