import { useMemo, useState } from 'react';
import { Bookmark, BookOpenCheck, Check, CheckCircle2, ExternalLink, Search, Sparkles } from 'lucide-react';
import { apiFetch, formatLearningStyle } from '../lib/api';
import { playPopSound } from '../lib/sound';
import type { LearnerWorkspaceData, LearningResource } from '../types';

interface LearningHubPageProps {
  workspace: LearnerWorkspaceData;
  resources: LearningResource[];
  onResourcesUpdate: (res: LearningResource[]) => void;
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
}

function buildKeyTakeaways(r: LearningResource): string[] {
  const baseSkill = r.skillName;
  if (r.resourceType === 'practice') {
    return [
      `Hands-on problem solving and debugging patterns in ${baseSkill}`,
      `Verifiable edge-case reasoning ready for MCQ and coding assessments`,
    ];
  }
  if (r.resourceType === 'documentation') {
    return [
      `Authoritative syntax, API contracts, and standard library behavior for ${baseSkill}`,
      `Common pitfalls and performance guarantees used in technical interviews`,
    ];
  }
  if (r.resourceType === 'course') {
    return [
      `Structured end-to-end conceptual progression for ${baseSkill}`,
      `Applied mental models connecting theory to production engineering`,
    ];
  }
  return [
    `Core conceptual intuition and real-world examples for ${baseSkill}`,
    `Actionable recall points to reduce forgetting-curve decay`,
  ];
}

export function LearningHubPage({
  workspace,
  resources,
  onResourcesUpdate,
  onWorkspaceUpdate,
}: LearningHubPageProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const [openCheckpointId, setOpenCheckpointId] = useState<string | null>(null);
  const [takeawayNote, setTakeawayNote] = useState('');
  const [checkpointMinutes, setCheckpointMinutes] = useState<number>(20);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [completedBanner, setCompletedBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weakSkills = useMemo(
    () =>
      workspace.skills
        .filter((s) => s.verifiedScore < 70)
        .map((s) => s.skillName.toLowerCase()),
    [workspace.skills]
  );

  const uniqueSkills = useMemo(
    () => Array.from(new Set(resources.map((r) => r.skillName))).sort(),
    [resources]
  );

  const verifiedStudySessions = useMemo(
    () => workspace.progressRecords.filter((p) => p.activityType === 'resource'),
    [workspace.progressRecords]
  );

  const filtered = useMemo(() => {
    return resources
      .filter((r) => {
        if (onlyBookmarked && !r.bookmarked) return false;
        if (typeFilter !== 'all' && r.resourceType !== typeFilter) return false;
        if (skillFilter !== 'all' && r.skillName !== skillFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            r.title.toLowerCase().includes(q) ||
            r.skillName.toLowerCase().includes(q) ||
            r.provider.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const aScore =
          (weakSkills.includes(a.skillName.toLowerCase()) ? 2 : 0) +
          (a.learningStyle === workspace.profile.preferredLearningStyle ? 1 : 0);
        const bScore =
          (weakSkills.includes(b.skillName.toLowerCase()) ? 2 : 0) +
          (b.learningStyle === workspace.profile.preferredLearningStyle ? 1 : 0);
        return bScore - aScore;
      });
  }, [
    resources,
    onlyBookmarked,
    typeFilter,
    skillFilter,
    search,
    weakSkills,
    workspace.profile.preferredLearningStyle,
  ]);

  const handleToggleBookmark = async (resourceId: string) => {
    playPopSound('pop');
    const res = await apiFetch<{ resources: LearningResource[]; workspace: LearnerWorkspaceData }>(
      `/api/resources/${resourceId}/bookmark`,
      { method: 'POST' }
    );
    onResourcesUpdate(res.resources);
    onWorkspaceUpdate(res.workspace);
  };

  const handleOpenCheckpoint = (resource: LearningResource) => {
    playPopSound('nav');
    setError(null);
    if (openCheckpointId === resource.id) {
      setOpenCheckpointId(null);
      return;
    }
    setOpenCheckpointId(resource.id);
    setCheckpointMinutes(Math.min(60, Math.max(10, resource.estimatedMinutes)));
    setTakeawayNote('');
  };

  const handleVerifyKnowledgeGain = async (resource: LearningResource) => {
    if (takeawayNote.trim().length < 12) {
      setError('Write at least 12 characters summarizing one concept you learned to verify completion.');
      return;
    }
    playPopSound('action');
    setSubmittingId(resource.id);
    setError(null);
    try {
      const res = await apiFetch<{ workspace: LearnerWorkspaceData; message: string }>(
        '/api/learning-hub/checkpoint',
        {
          method: 'POST',
          body: JSON.stringify({
            skillName: resource.skillName,
            title: resource.title,
            minutesSpent: checkpointMinutes,
            takeawayNote: takeawayNote.trim(),
          }),
        }
      );
      onWorkspaceUpdate(res.workspace);
      setCompletedBanner(res.message);
      setOpenCheckpointId(null);
      setTakeawayNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record study checkpoint');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#18221D] dark:text-[#ECF2EE]">
            Learning Hub &amp; Verified Study Checkpoints
          </h2>
          <p className="text-sm text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
            Ranked for your skill gaps and adapted to {formatLearningStyle(workspace.profile.preferredLearningStyle)}. Record a key takeaway after studying to log real minutes and strengthen retention.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] text-xs font-medium text-[#1B4332] dark:text-[#95D5B2] tabular-nums shrink-0">
          {verifiedStudySessions.length} verified checkpoints logged
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {completedBanner && (
        <div className="p-3.5 rounded-lg bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] flex items-center justify-between gap-3 text-xs text-[#2D6A4F] dark:text-[#74C69D]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{completedBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setCompletedBanner(null)}
            className="font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#5C6B63] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tutorials, docs, practice labs..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
          />
        </div>

        <select
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
        >
          <option value="all">All Skills</option>
          {uniqueSkills.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
        >
          <option value="all">All Formats</option>
          <option value="documentation">Documentation</option>
          <option value="practice">Interactive Practice</option>
          <option value="course">Structured Course</option>
          <option value="youtube">YouTube Tutorial</option>
          <option value="article">Technical Article</option>
        </select>

        <button
          type="button"
          onClick={() => setOnlyBookmarked(!onlyBookmarked)}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
            onlyBookmarked
              ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white border-[#2D6A4F] dark:border-[#3B8263]'
              : 'border-[#DCE5DF] dark:border-[#2B3932] text-[#18221D] dark:text-[#ECF2EE]'
          }`}
        >
          Bookmarked ({workspace.bookmarks.length})
        </button>
      </div>

      {/* Resource Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((r) => {
          const isGapMatch = weakSkills.includes(r.skillName.toLowerCase());
          const isStyleMatch = r.learningStyle === workspace.profile.preferredLearningStyle;
          const isAlreadyLogged = verifiedStudySessions.some((p) =>
            p.title.toLowerCase().includes(r.title.toLowerCase())
          );
          const takeaways = buildKeyTakeaways(r);
          const isOpen = openCheckpointId === r.id;

          return (
            <div
              key={r.id}
              className="p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                    {r.skillName} · {r.resourceType} · {r.difficulty}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(r.id)}
                    className={`p-1.5 rounded-md transition-colors ${
                      r.bookmarked
                        ? 'text-[#2D6A4F] dark:text-[#74C69D]'
                        : 'text-[#8C9B93] hover:text-[#18221D] dark:hover:text-[#ECF2EE]'
                    }`}
                    aria-label="Bookmark resource"
                  >
                    <Bookmark className="w-4 h-4" fill={r.bookmarked ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <h3 className="text-base font-semibold text-[#18221D] dark:text-[#ECF2EE] mt-1.5 leading-snug">
                  {r.title}
                </h3>
                <p className="text-xs text-[#2D6A4F] dark:text-[#74C69D] mt-0.5">
                  {r.provider} · ~{r.estimatedMinutes} min
                  {isGapMatch ? ' · Closes Skill Gap' : ''}
                  {isStyleMatch ? ' · Fits Your Style' : ''}
                </p>
                <p className="text-xs text-[#4B5952] dark:text-[#A9B7AF] mt-2.5 leading-relaxed">
                  {r.description}
                </p>

                <div className="mt-3 p-3 rounded-lg bg-[#F6F9F7] dark:bg-[#18211C] border border-[#E4ECE7] dark:border-[#24302A] space-y-1">
                  <p className="text-[11px] font-semibold text-[#18221D] dark:text-[#ECF2EE] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#2D6A4F] dark:text-[#74C69D]" />
                    <span>What You Will Gain</span>
                  </p>
                  {takeaways.map((pt, i) => (
                    <p key={i} className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0] leading-snug">
                      • {pt}
                    </p>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-[#DCE5DF] dark:border-[#24302A]">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
                  >
                    <span>Open Study Material</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    data-sound="action"
                    onClick={() => handleOpenCheckpoint(r)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isAlreadyLogged
                        ? 'bg-[#EDF5F0] dark:bg-[#16231C] text-[#2D6A4F] dark:text-[#74C69D]'
                        : 'border border-[#DCE5DF] dark:border-[#2B3932] text-[#18221D] dark:text-[#ECF2EE] hover:bg-[#F1F6F3] dark:hover:bg-[#1D2822]'
                    }`}
                  >
                    {isAlreadyLogged ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Verified Gain</span>
                      </>
                    ) : (
                      <>
                        <BookOpenCheck className="w-3.5 h-3.5" />
                        <span>Verify Gain</span>
                      </>
                    )}
                  </button>
                </div>

                {isOpen && (
                  <div className="p-3 rounded-lg bg-[#FAFDFB] dark:bg-[#101613] border border-[#DCE5DF] dark:border-[#2B3932] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                        Knowledge Check: Key Takeaway
                      </label>
                      <div className="flex items-center gap-1 text-[11px] text-[#5C6B63]">
                        <span>Mins:</span>
                        <input
                          type="number"
                          min={5}
                          max={180}
                          value={checkpointMinutes}
                          onChange={(e) => setCheckpointMinutes(Number(e.target.value))}
                          className="w-14 px-1.5 py-0.5 rounded border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-xs font-mono"
                        />
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={takeawayNote}
                      onChange={(e) => setTakeawayNote(e.target.value)}
                      placeholder={`Summarize 1 concept you learned about ${r.skillName} (min 12 chars)...`}
                      className="w-full px-2.5 py-1.5 rounded border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenCheckpointId(null)}
                        className="px-2.5 py-1 text-xs text-[#5C6B63] hover:text-[#18221D]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={submittingId === r.id}
                        onClick={() => handleVerifyKnowledgeGain(r)}
                        className="px-3 py-1 rounded bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] text-white text-xs font-semibold disabled:opacity-60"
                      >
                        {submittingId === r.id ? 'Saving...' : 'Confirm & Boost Retention'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
