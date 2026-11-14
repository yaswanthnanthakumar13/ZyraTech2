import { db } from './db';
import { getUserById } from './auth';
import type {
  AdminAssessment,
  AdminDashboardData,
  AIAgentDecision,
  CareerCompatibility,
  CareerGoalHistoryItem,
  CareerRole,
  CommunityMissionSubmission,
  CompanionBriefing,
  DecayRisk,
  ExpertCouncilReport,
  FailureDNAItem,
  LearnerProfile,
  LearnerProject,
  LearnerWorkspaceData,
  LearningResource,
  LearningRoadmap,
  MentorMessage,
  MockInterview,
  ModuleProgressItem,
  ParallelChallengeItem,
  ProctoringLog,
  ProgressRecord,
  ReverseTeachingItem,
  RevisionScheduleItem,
  RoadmapMilestone,
  RoleCourse,
  SkillAssessment,
  SkillDNA,
  SyllabusRecommendation,
  VerificationStatus,
  WorkplaceSimulationItem,
} from '../src/types';

function buildModuleCodingExercise(
  skillFocus: string,
  moduleTitle: string,
  courseLevel: string
): {
  title: string;
  prompt: string;
  starterCode: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
} {
  const s = skillFocus.toLowerCase();
  const difficulty: 'beginner' | 'intermediate' | 'advanced' =
    courseLevel === 'Foundation' ? 'beginner' : courseLevel === 'Capstone' ? 'advanced' : 'intermediate';

  if (s.includes('sql') || s.includes('database')) {
    return {
      title: `${skillFocus} Coding Lab: ${moduleTitle}`,
      prompt: `Write a parameterized SQL query and indexing note for "${moduleTitle}" that aggregates active student records without N+1 queries.`,
      starterCode: `-- Module Lab: ${moduleTitle}\nSELECT s.id, s.full_name, COUNT(a.id) AS completed_count\nFROM students s\nLEFT JOIN assessments a ON a.user_id = s.id AND a.status = 'completed'\nGROUP BY s.id\nORDER BY completed_count DESC;`,
      difficulty,
    };
  }
  if (s.includes('python') || s.includes('machine learning') || s.includes('data')) {
    return {
      title: `${skillFocus} Coding Lab: ${moduleTitle}`,
      prompt: `Implement a pure, validated Python helper for "${moduleTitle}" handling empty/malformed inputs cleanly with type hints.`,
      starterCode: `# Module Lab: ${moduleTitle}\nfrom typing import List, Dict\n\ndef process_records(items: List[Dict[str, object]]) -> List[Dict[str, object]]:\n    if not items:\n        return []\n    # TODO: transform & validate records for ${skillFocus}\n    return [item for item in items if item.get("active")]`,
      difficulty,
    };
  }
  if (s.includes('react')) {
    return {
      title: `${skillFocus} Coding Lab: ${moduleTitle}`,
      prompt: `Build a controlled React component with proper dependency-safe state updates and loading/error handling for "${moduleTitle}".`,
      starterCode: `// Module Lab: ${moduleTitle}\nimport { useState } from 'react';\n\nexport function ModuleWidget({ initialItems = [] }: { initialItems?: string[] }) {\n  const [filter, setFilter] = useState('');\n  const visible = initialItems.filter((item) => item.toLowerCase().includes(filter.toLowerCase()));\n  return <div>{/* TODO: render controlled input and visible list */}</div>;\n}`,
      difficulty,
    };
  }
  if (s.includes('node') || s.includes('api') || s.includes('security')) {
    return {
      title: `${skillFocus} Coding Lab: ${moduleTitle}`,
      prompt: `Implement an input-validated Express handler / security guard for "${moduleTitle}" returning explicit 400 errors on invalid payloads.`,
      starterCode: `// Module Lab: ${moduleTitle}\nexport function validateAndHandle(payload: Record<string, unknown>) {\n  if (!payload || typeof payload.id !== 'string' || payload.id.trim().length < 2) {\n    return { status: 400, error: 'Valid id is required' };\n  }\n  // TODO: implement ${skillFocus} business logic safely\n  return { status: 200, ok: true };\n}`,
      difficulty,
    };
  }
  if (s.includes('html') || s.includes('css')) {
    return {
      title: `${skillFocus} Coding Lab: ${moduleTitle}`,
      prompt: `Write semantic, accessible markup and responsive layout rules for "${moduleTitle}" using clean landmark tags and flex/grid.`,
      starterCode: `<!-- Module Lab: ${moduleTitle} -->\n<section aria-label="${moduleTitle}" class="grid gap-4 md:grid-cols-2">\n  <article class="p-4 border rounded-lg">\n    <h2>Module Deliverable</h2>\n  </article>\n</section>`,
      difficulty,
    };
  }
  if (s.includes('linux') || s.includes('docker') || s.includes('cloud') || s.includes('network') || s.includes('siem')) {
    return {
      title: `${skillFocus} Coding Lab: ${moduleTitle}`,
      prompt: `Write a production-safe shell/configuration script for "${moduleTitle}" with explicit non-zero exit handling and read-only verification.`,
      starterCode: `#!/usr/bin/env bash\nset -euo pipefail\n# Module Lab: ${moduleTitle} (${skillFocus})\necho "Verifying ${skillFocus} checks..."`,
      difficulty,
    };
  }

  return {
    title: `${skillFocus} Coding Lab: ${moduleTitle}`,
    prompt: `Write a clean, modular ${skillFocus} implementation for "${moduleTitle}" that validates inputs and avoids mutating shared state.`,
    starterCode: `// Module Lab: ${moduleTitle} (${skillFocus})\nfunction solveModuleTask(input: unknown) {\n  if (input === null || input === undefined) {\n    throw new Error('Invalid input');\n  }\n  // TODO: implement ${moduleTitle}\n  return input;\n}`,
    difficulty,
  };
}

export function getAllCareers(): CareerRole[] {
  const roles = db.prepare('SELECT * FROM career_roles ORDER BY title ASC').all() as Array<Record<string, string>>;
  const reqs = db.prepare('SELECT * FROM career_skill_requirements').all() as Array<{
    career_id: string;
    skill_name: string;
    required_level: number;
    importance: 'core' | 'important' | 'nice_to_have';
    category: string;
  }>;
  const coursesRows = db.prepare('SELECT * FROM role_courses ORDER BY course_code ASC').all() as Array<
    Record<string, unknown>
  >;

  return roles.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    description: r.description,
    medianSalaryRange: r.median_salary_range,
    demandOutlook: r.demand_outlook,
    careerGuidance: r.career_guidance || '',
    requiredSoftSkills: JSON.parse(r.required_soft_skills || '[]'),
    recommendedTools: JSON.parse(r.recommended_tools || '[]'),
    relevantCertifications: JSON.parse(r.relevant_certifications || '[]'),
    projectExpectations: JSON.parse(r.project_expectations || '[]'),
    requirements: reqs
      .filter((q) => q.career_id === r.id)
      .map((q) => ({
        skillName: q.skill_name,
        requiredLevel: q.required_level,
        importance: q.importance,
        category: q.category,
      })),
    courses: coursesRows
      .filter((c) => String(c.career_id) === r.id)
      .map((c): RoleCourse => {
        const level = c.level as RoleCourse['level'];
        const rawModules = JSON.parse(String(c.syllabus_modules || '[]')) as RoleCourse['syllabusModules'];
        const enrichedModules = rawModules.map((mod) => ({
          ...mod,
          codingExercise:
            mod.codingExercise || buildModuleCodingExercise(mod.skillFocus, mod.title, String(level)),
        }));
        return {
          id: String(c.id),
          careerId: String(c.career_id),
          courseCode: String(c.course_code),
          title: String(c.title),
          level,
          credits: Number(c.credits),
          hours: Number(c.hours),
          description: String(c.description),
          syllabusModules: enrichedModules,
          prerequisites: JSON.parse(String(c.prerequisites || '[]')),
        };
      }),
  }));
}

export function getCareerById(careerId: string): CareerRole | null {
  return getAllCareers().find((c) => c.id === careerId) || null;
}

/**
 * Ebbinghaus exponential forgetting curve calibrated for student retention:
 * R(t) = base * e^(-ln(2) * elapsedDays / halfLifeDays)
 * Higher verified mastery + prior spaced revisions extend memory half-life.
 */
export function getLearnerSkills(userId: string): SkillDNA[] {
  const rows = db
    .prepare('SELECT * FROM learner_skills WHERE user_id = ? ORDER BY verified_score DESC, self_declared_score DESC')
    .all(userId) as Array<Record<string, unknown>>;

  const revisionCountsRows = db
    .prepare("SELECT LOWER(skill_name) as sk, COUNT(*) as cnt FROM progress_records WHERE user_id = ? AND activity_type IN ('revision', 'assessment') GROUP BY LOWER(skill_name)")
    .all(userId) as Array<{ sk: string; cnt: number }>;
  const repMap = new Map(revisionCountsRows.map((r) => [r.sk, Number(r.cnt)]));

  const now = Date.now();
  return rows.map((row) => {
    const lastPracticed = new Date(String(row.last_practiced_at)).getTime();
    const elapsedDays = Math.max(0, (now - lastPracticed) / 86400000);
    const verifiedScore = Number(row.verified_score);
    const selfScore = Number(row.self_declared_score);
    const currentScore = verifiedScore || selfScore;
    const storedRetention = Number(row.retention_score);
    const repetitions = repMap.get(String(row.skill_name).toLowerCase()) || 0;

    let retentionScore = storedRetention;
    let computedDecay: DecayRisk = (row.decay_risk as DecayRisk) || 'low';

    if (currentScore > 0) {
      const halfLifeDays = Math.max(7, 10 + (currentScore / 100) * 16 + repetitions * 5);
      const baseAnchor = Math.max(storedRetention, Math.min(98, Math.round(currentScore * 0.92 + 12)));
      const curveRetention = Math.round(baseAnchor * Math.exp((-Math.LN2 * elapsedDays) / halfLifeDays));
      retentionScore = Math.max(15, Math.min(99, Math.round((storedRetention * 0.35 + curveRetention * 0.65))));

      if (elapsedDays < 0.25 && storedRetention >= 75) {
        retentionScore = Math.max(retentionScore, storedRetention);
      }

      if (retentionScore < 55 || (currentScore >= 50 && elapsedDays >= 14)) {
        computedDecay = 'high';
      } else if (retentionScore < 75 || (currentScore >= 50 && elapsedDays >= 7)) {
        computedDecay = 'moderate';
      } else {
        computedDecay = 'low';
      }
    } else {
      retentionScore = 0;
      computedDecay = 'low';
    }

    return {
      id: String(row.id),
      userId: String(row.user_id),
      skillName: String(row.skill_name),
      category: String(row.category),
      selfDeclaredScore: selfScore,
      verifiedScore,
      verificationStatus: row.verification_status as VerificationStatus,
      theoryScore: Number(row.theory_score),
      practicalScore: Number(row.practical_score),
      problemSolvingScore: Number(row.problem_solving_score),
      projectScore: Number(row.project_score),
      retentionScore,
      lastPracticedAt: String(row.last_practiced_at),
      decayRisk: computedDecay,
      weakConcepts: JSON.parse(String(row.weak_concepts || '[]')),
      updatedAt: String(row.updated_at),
    };
  });
}

export function computeCareerCompatibility(userId: string, careerId: string): CareerCompatibility | null {
  const career = getCareerById(careerId);
  if (!career) return null;

  const skills = getLearnerSkills(userId);
  const projects = db
    .prepare("SELECT COUNT(*) as cnt FROM learner_projects WHERE user_id = ? AND status = 'verified'")
    .get(userId) as { cnt: number };

  const skillMap = new Map<string, SkillDNA>();
  for (const s of skills) {
    skillMap.set(s.skillName.toLowerCase(), s);
  }

  let weightedScoreSum = 0;
  let totalWeight = 0;
  const metSkills: CareerCompatibility['metSkills'] = [];
  const missingSkills: CareerCompatibility['missingSkills'] = [];
  const transferableSkills: string[] = [];
  let estimatedLearningHours = 0;

  for (const req of career.requirements) {
    const weight = req.importance === 'core' ? 1.5 : req.importance === 'important' ? 1.0 : 0.6;
    totalWeight += weight;

    const learnerSkill = skillMap.get(req.skillName.toLowerCase());
    const rawScore = learnerSkill ? learnerSkill.verifiedScore : 0;
    const effectiveScore =
      learnerSkill && learnerSkill.verificationStatus === 'self_declared'
        ? Math.round(rawScore * 0.65)
        : rawScore;

    const ratio = Math.min(1, effectiveScore / req.requiredLevel);
    weightedScoreSum += ratio * weight;

    if (rawScore >= req.requiredLevel * 0.8) {
      metSkills.push({
        skillName: req.skillName,
        currentScore: rawScore,
        requiredLevel: req.requiredLevel,
        verificationStatus: learnerSkill ? learnerSkill.verificationStatus : 'self_declared',
      });
      if (learnerSkill && learnerSkill.verificationStatus !== 'self_declared') {
        transferableSkills.push(req.skillName);
      }
    } else {
      const gap = Math.max(0, req.requiredLevel - rawScore);
      missingSkills.push({
        skillName: req.skillName,
        currentScore: rawScore,
        requiredLevel: req.requiredLevel,
        gap,
        importance: req.importance,
      });
      estimatedLearningHours += Math.max(4, Math.round(gap * 0.28));
    }
  }

  const compatibilityScore = totalWeight > 0 ? Math.round((weightedScoreSum / totalWeight) * 100) : 0;
  const verifiedRatio =
    career.requirements.length > 0
      ? metSkills.filter((m) => m.verificationStatus !== 'self_declared').length / career.requirements.length
      : 0;
  const projectBonus = Math.min(12, projects.cnt * 6);
  const indicativeReadinessEstimate = Math.min(
    98,
    Math.round(compatibilityScore * 0.78 + verifiedRatio * 18 + projectBonus)
  );

  return {
    career,
    compatibilityScore,
    indicativeReadinessEstimate,
    metSkills,
    missingSkills: missingSkills.sort((a, b) => b.gap - a.gap),
    transferableSkills,
    estimatedLearningHours,
  };
}

export function getLearnerProfile(userId: string): LearnerProfile | null {
  const row = db.prepare('SELECT * FROM learner_profiles WHERE user_id = ?').get(userId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return {
    userId: String(row.user_id),
    educationLevel: String(row.education_level),
    institution: String(row.institution),
    university: String(row.university || row.institution || 'ZyraTech University'),
    githubUrl: String(row.github_url || ''),
    linkedinUrl: String(row.linkedin_url || ''),
    nonTechnicalSkills: JSON.parse(String(row.non_technical_skills || '[]')),
    certifications: JSON.parse(String(row.certifications || '[]')),
    previousProjects: JSON.parse(String(row.previous_projects || '[]')),
    workExperience: String(row.work_experience),
    careerInterests: JSON.parse(String(row.career_interests || '[]')),
    targetCareerId: String(row.target_career_id),
    dailyLearningMinutes: Number(row.daily_learning_minutes),
    preferredLearningStyle: row.preferred_learning_style as LearnerProfile['preferredLearningStyle'],
    resumeText: String(row.resume_text),
    streakDays: Number(row.streak_days),
    onboardingCompleted: Number(row.onboarding_completed) === 1,
    updatedAt: String(row.updated_at),
  };
}

export function getActiveRoadmap(userId: string): LearningRoadmap | null {
  const r = db
    .prepare("SELECT * FROM learning_roadmaps WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1")
    .get(userId) as Record<string, unknown> | undefined;
  if (!r) return null;

  const msRows = db
    .prepare('SELECT * FROM roadmap_milestones WHERE roadmap_id = ? ORDER BY stage_order ASC')
    .all(String(r.id)) as Array<Record<string, unknown>>;

  const milestones: RoadmapMilestone[] = msRows.map((m) => ({
    id: String(m.id),
    roadmapId: String(m.roadmap_id),
    stageOrder: Number(m.stage_order),
    skillName: String(m.skill_name),
    title: String(m.title),
    learningObjective: String(m.learning_objective),
    difficulty: m.difficulty as RoadmapMilestone['difficulty'],
    estimatedHours: Number(m.estimated_hours),
    status: m.status as RoadmapMilestone['status'],
    completionCriteria: String(m.completion_criteria),
    practicalExercise: String(m.practical_exercise),
    miniProject: String(m.mini_project),
    isReusableTransfer: Number(m.is_reusable_transfer) === 1,
    assessmentRequired: Number(m.assessment_required) === 1,
    lastAssessmentScore: m.last_assessment_score !== null ? Number(m.last_assessment_score) : null,
    adaptedNote: m.adapted_note ? String(m.adapted_note) : null,
  }));

  return {
    id: String(r.id),
    userId: String(r.user_id),
    careerId: String(r.career_id),
    careerTitle: String(r.career_title),
    status: String(r.status),
    compatibilityScore: Number(r.compatibility_score),
    readinessEstimate: Number(r.readiness_estimate),
    estimatedTotalHours: Number(r.estimated_total_hours),
    adaptationReason: String(r.adaptation_reason),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    milestones,
  };
}

export function getAllResources(userId?: string): LearningResource[] {
  const rows = db.prepare('SELECT * FROM learning_resources ORDER BY skill_name ASC, difficulty ASC').all() as Array<
    Record<string, unknown>
  >;
  const bookmarkSet = new Set<string>();
  if (userId) {
    const bms = db
      .prepare('SELECT resource_id FROM user_resource_bookmarks WHERE user_id = ?')
      .all(userId) as Array<{ resource_id: string }>;
    bms.forEach((b) => bookmarkSet.add(b.resource_id));
  }

  return rows.map((r) => ({
    id: String(r.id),
    skillName: String(r.skill_name),
    title: String(r.title),
    provider: String(r.provider),
    resourceType: r.resource_type as LearningResource['resourceType'],
    difficulty: r.difficulty as LearningResource['difficulty'],
    learningStyle: r.learning_style as LearningResource['learningStyle'],
    url: String(r.url),
    description: String(r.description),
    estimatedMinutes: Number(r.estimated_minutes),
    isVerifiedUrl: Number(r.is_verified_url) === 1,
    bookmarked: bookmarkSet.has(String(r.id)),
  }));
}

export function mapAdminAssessmentRow(a: Record<string, unknown>): AdminAssessment {
  return {
    id: String(a.id),
    title: String(a.title),
    careerId: String(a.career_id),
    skillName: String(a.skill_name),
    courseCode: String(a.course_code || ''),
    difficulty: a.difficulty as AdminAssessment['difficulty'],
    durationMinutes: Number(a.duration_minutes),
    passingScore: Number(a.passing_score),
    maxTabSwitches: Number(a.max_tab_switches),
    isPublished: Number(a.is_published) === 1,
    createdBy: String(a.created_by),
    questions: JSON.parse(String(a.questions || '[]')),
    createdAt: String(a.created_at),
  };
}

export function getPublishedAdminAssessments(): AdminAssessment[] {
  const rows = db
    .prepare('SELECT * FROM admin_assessments WHERE is_published = 1 ORDER BY created_at DESC')
    .all() as Array<Record<string, unknown>>;
  return rows.map(mapAdminAssessmentRow);
}

export function getUpcomingSyllabusRecommendations(userId: string): SyllabusRecommendation[] {
  const rows = db
    .prepare('SELECT * FROM syllabus_recommendations WHERE user_id = ? ORDER BY created_at DESC LIMIT 8')
    .all(userId) as Array<Record<string, unknown>>;
  return rows.map((s) => ({
    id: String(s.id),
    userId: String(s.user_id),
    careerId: String(s.career_id),
    courseCode: String(s.course_code),
    courseTitle: String(s.course_title),
    moduleCode: String(s.module_code),
    recommendedModuleTitle: String(s.recommended_module_title),
    skillFocus: String(s.skill_focus),
    rationale: String(s.rationale),
    topics: JSON.parse(String(s.topics || '[]')),
    estimatedHours: Number(s.estimated_hours),
    priority: s.priority as SyllabusRecommendation['priority'],
    createdAt: String(s.created_at),
  }));
}

export function computeModuleProgress(
  career: CareerRole | null,
  skills: SkillDNA[],
  assessments: SkillAssessment[],
  progressRecords: ProgressRecord[]
): ModuleProgressItem[] {
  if (!career) return [];
  const skillMap = new Map(skills.map((s) => [s.skillName.toLowerCase(), s]));
  const items: ModuleProgressItem[] = [];

  for (const crs of career.courses) {
    for (const mod of crs.syllabusModules) {
      const sk = skillMap.get(mod.skillFocus.toLowerCase());
      const matchingAssessments = assessments.filter(
        (a) =>
          a.status === 'completed' &&
          a.score !== null &&
          ((a.courseCode && a.courseCode === crs.courseCode && (!a.moduleCode || a.moduleCode === mod.moduleCode)) ||
            a.skillName.toLowerCase() === mod.skillFocus.toLowerCase())
      );
      const latestScore = matchingAssessments[0]?.score ?? null;
      const studiedModule = progressRecords.some(
        (p) =>
          p.skillName.toLowerCase() === mod.skillFocus.toLowerCase() ||
          p.title.toLowerCase().includes(crs.courseCode.toLowerCase())
      );

      let pct = 0;
      if (latestScore !== null) {
        pct = Math.min(100, Math.max(latestScore, sk?.verifiedScore ?? latestScore));
      } else if (sk) {
        pct =
          sk.verificationStatus !== 'self_declared'
            ? sk.verifiedScore
            : Math.round(sk.verifiedScore * 0.5);
      } else if (studiedModule) {
        pct = 35;
      }

      const attended =
        studiedModule ||
        matchingAssessments.length > 0 ||
        (sk ? sk.verificationStatus !== 'self_declared' || sk.verifiedScore >= 40 : false);

      items.push({
        courseCode: crs.courseCode,
        courseTitle: crs.title,
        moduleCode: mod.moduleCode,
        moduleTitle: mod.title,
        skillFocus: mod.skillFocus,
        completionPercent: Math.max(0, Math.min(100, pct)),
        attended,
        latestScore,
      });
    }
  }
  return items;
}

export function getLearnerWorkspace(userId: string): LearnerWorkspaceData | null {
  const user = getUserById(userId);
  const profile = getLearnerProfile(userId);
  if (!user || !profile) return null;

  const skills = getLearnerSkills(userId);
  const roadmap = getActiveRoadmap(userId);
  const compatibility = computeCareerCompatibility(userId, profile.targetCareerId);

  const assessmentRows = db
    .prepare('SELECT * FROM skill_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 30')
    .all(userId) as Array<Record<string, unknown>>;

  const assessments: SkillAssessment[] = assessmentRows.map((a) => ({
    id: String(a.id),
    userId: String(a.user_id),
    adminAssessmentId: a.admin_assessment_id ? String(a.admin_assessment_id) : null,
    title: String(a.title || `${String(a.skill_name)} Assessment`),
    skillName: String(a.skill_name),
    careerId: String(a.career_id),
    courseCode: String(a.course_code || ''),
    moduleCode: String(a.module_code || ''),
    assessmentMode: (a.assessment_mode === 'daily_portal' ? 'daily_portal' : 'practice_workplace'),
    difficulty: a.difficulty as SkillAssessment['difficulty'],
    assessmentType: a.assessment_type as SkillAssessment['assessmentType'],
    status: a.status as SkillAssessment['status'],
    score: a.score !== null ? Number(a.score) : null,
    totalQuestions: Number(a.total_questions),
    correctCount: a.correct_count !== null ? Number(a.correct_count) : null,
    tabSwitchCount: Number(a.tab_switch_count || 0),
    weakConcepts: JSON.parse(String(a.weak_concepts || '[]')),
    feedback: a.feedback ? String(a.feedback) : null,
    createdAt: String(a.created_at),
    completedAt: a.completed_at ? String(a.completed_at) : null,
  }));

  const publishedTests = getPublishedAdminAssessments();
  const upcomingSyllabus = getUpcomingSyllabusRecommendations(userId);

  const procRows = db
    .prepare('SELECT * FROM proctoring_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 25')
    .all(userId) as Array<Record<string, unknown>>;
  const proctoringLogs: ProctoringLog[] = procRows.map((p) => ({
    id: String(p.id),
    userId: String(p.user_id),
    assessmentId: String(p.assessment_id),
    assessmentTitle: String(p.assessment_title),
    switchCount: Number(p.switch_count),
    eventType: p.event_type as ProctoringLog['eventType'],
    details: String(p.details),
    createdAt: String(p.created_at),
  }));

  const progressRows = db
    .prepare('SELECT * FROM progress_records WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 60')
    .all(userId) as Array<Record<string, unknown>>;

  const progressRecords: ProgressRecord[] = progressRows.map((p) => ({
    id: String(p.id),
    userId: String(p.user_id),
    activityType: p.activity_type as ProgressRecord['activityType'],
    skillName: String(p.skill_name),
    title: String(p.title),
    minutesSpent: Number(p.minutes_spent),
    score: p.score !== null ? Number(p.score) : null,
    recordedAt: String(p.recorded_at),
  }));

  const decisionRows = db
    .prepare('SELECT * FROM ai_agent_decisions WHERE user_id = ? ORDER BY created_at DESC LIMIT 15')
    .all(userId) as Array<Record<string, unknown>>;

  const agentDecisions: AIAgentDecision[] = decisionRows.map((d) => ({
    id: String(d.id),
    userId: String(d.user_id),
    triggerEvent: String(d.trigger_event),
    orchestratorSummary: String(d.orchestrator_summary),
    agentOutputs: JSON.parse(String(d.agent_outputs || '[]')),
    nextAction: String(d.next_action),
    explanation: String(d.explanation),
    createdAt: String(d.created_at),
  }));

  const historyRows = db
    .prepare('SELECT * FROM career_goal_history WHERE user_id = ? ORDER BY changed_at DESC')
    .all(userId) as Array<Record<string, unknown>>;

  const careerHistory: CareerGoalHistoryItem[] = historyRows.map((h) => ({
    id: String(h.id),
    userId: String(h.user_id),
    fromCareerId: h.from_career_id ? String(h.from_career_id) : null,
    toCareerId: String(h.to_career_id),
    compatibilityBefore: Number(h.compatibility_before),
    compatibilityAfter: Number(h.compatibility_after),
    preservedSkills: JSON.parse(String(h.preserved_skills || '[]')),
    changedAt: String(h.changed_at),
  }));

  const revisionRows = db
    .prepare('SELECT * FROM revision_schedules WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Array<Record<string, unknown>>;

  const revisions: RevisionScheduleItem[] = revisionRows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    skillName: String(r.skill_name),
    reason: String(r.reason),
    urgency: r.urgency as RevisionScheduleItem['urgency'],
    dueDate: String(r.due_date),
    status: r.status as RevisionScheduleItem['status'],
    createdAt: String(r.created_at),
  }));

  const projectRows = db
    .prepare('SELECT * FROM learner_projects WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Array<Record<string, unknown>>;

  const projects: LearnerProject[] = projectRows.map((p) => ({
    id: String(p.id),
    userId: String(p.user_id),
    title: String(p.title),
    skillName: String(p.skill_name),
    careerId: String(p.career_id),
    description: String(p.description),
    submissionNotes: String(p.submission_notes),
    repoOrDemoLink: String(p.repo_or_demo_link),
    aiVerificationScore: p.ai_verification_score !== null ? Number(p.ai_verification_score) : null,
    aiFeedback: p.ai_feedback ? String(p.ai_feedback) : null,
    status: p.status as LearnerProject['status'],
    createdAt: String(p.created_at),
  }));

  const bookmarks = (
    db.prepare('SELECT resource_id FROM user_resource_bookmarks WHERE user_id = ?').all(userId) as Array<{
      resource_id: string;
    }>
  ).map((b) => b.resource_id);

  const interviewRows = db
    .prepare('SELECT * FROM mock_interviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 10')
    .all(userId) as Array<Record<string, unknown>>;

  const interviews: MockInterview[] = interviewRows.map((i) => ({
    id: String(i.id),
    userId: String(i.user_id),
    careerId: String(i.career_id),
    interviewType: i.interview_type as MockInterview['interviewType'],
    messages: JSON.parse(String(i.messages || '[]')),
    evaluation: i.evaluation ? JSON.parse(String(i.evaluation)) : null,
    readinessScore: i.readiness_score !== null ? Number(i.readiness_score) : null,
    status: i.status as MockInterview['status'],
    createdAt: String(i.created_at),
  }));

  const moduleProgress = computeModuleProgress(
    compatibility?.career || null,
    skills,
    assessments,
    progressRecords
  );

  const simRows = db
    .prepare('SELECT * FROM workplace_simulations WHERE user_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(userId) as Array<Record<string, unknown>>;

  const workplaceSimulations: WorkplaceSimulationItem[] = simRows.map((s) => ({
    id: String(s.id),
    userId: String(s.user_id),
    simKind: s.sim_kind as WorkplaceSimulationItem['simKind'],
    careerId: String(s.career_id),
    title: String(s.title),
    difficulty: s.difficulty as WorkplaceSimulationItem['difficulty'],
    currentStage: Number(s.current_stage),
    totalStages: Number(s.total_stages),
    stages: JSON.parse(String(s.stages || '[]')),
    rubric: s.rubric ? JSON.parse(String(s.rubric)) : null,
    overallScore: s.overall_score !== null ? Number(s.overall_score) : null,
    summaryFeedback: s.summary_feedback ? String(s.summary_feedback) : null,
    skillApplied: String(s.skill_applied),
    status: s.status as WorkplaceSimulationItem['status'],
    createdAt: String(s.created_at),
    completedAt: s.completed_at ? String(s.completed_at) : null,
  }));

  const parallelRows = db
    .prepare('SELECT * FROM parallel_career_challenges WHERE user_id = ? ORDER BY created_at DESC LIMIT 10')
    .all(userId) as Array<Record<string, unknown>>;

  const parallelChallenges: ParallelChallengeItem[] = parallelRows.map((p) => ({
    id: String(p.id),
    userId: String(p.user_id),
    tasks: JSON.parse(String(p.tasks || '[]')),
    recommendedCareerId: String(p.recommended_career_id),
    recommendedCareerTitle: String(p.recommended_career_title),
    evidenceSummary: String(p.evidence_summary),
    disclaimer: String(p.disclaimer),
    status: p.status as ParallelChallengeItem['status'],
    createdAt: String(p.created_at),
    completedAt: p.completed_at ? String(p.completed_at) : null,
  }));

  const failureRows = db
    .prepare('SELECT * FROM failure_dna_records WHERE user_id = ? ORDER BY occurrence_count DESC, last_detected_at DESC LIMIT 20')
    .all(userId) as Array<Record<string, unknown>>;

  const failureDna: FailureDNAItem[] = failureRows.map((f) => ({
    id: String(f.id),
    userId: String(f.user_id),
    skillName: String(f.skill_name),
    conceptTag: String(f.concept_tag),
    failurePattern: f.failure_pattern as FailureDNAItem['failurePattern'],
    occurrenceCount: Number(f.occurrence_count),
    repeatedAfterRevision: Number(f.repeated_after_revision) === 1,
    diagnosticNote: String(f.diagnostic_note),
    recoveryMissionTitle: String(f.recovery_mission_title),
    recoveryMissionTask: String(f.recovery_mission_task),
    status: f.status as FailureDNAItem['status'],
    lastDetectedAt: String(f.last_detected_at),
    resolvedAt: f.resolved_at ? String(f.resolved_at) : null,
  }));

  const councilRow = db
    .prepare('SELECT * FROM expert_council_reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(userId) as Record<string, unknown> | undefined;

  const expertCouncil: ExpertCouncilReport | null = councilRow
    ? {
        id: String(councilRow.id),
        userId: String(councilRow.user_id),
        members: JSON.parse(String(councilRow.members || '[]')),
        agreements: JSON.parse(String(councilRow.agreements || '[]')),
        disagreements: JSON.parse(String(councilRow.disagreements || '[]')),
        orchestratorVerdict: String(councilRow.orchestrator_verdict),
        appliedSystemUpdates: JSON.parse(String(councilRow.applied_system_updates || '[]')),
        createdAt: String(councilRow.created_at),
      }
    : null;

  const rtRows = db
    .prepare('SELECT * FROM reverse_teaching_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 15')
    .all(userId) as Array<Record<string, unknown>>;

  const reverseTeaching: ReverseTeachingItem[] = rtRows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    skillName: String(r.skill_name),
    conceptTitle: String(r.concept_title),
    studentExplanation: String(r.student_explanation),
    companionFollowUpQuestion: String(r.companion_followup_question),
    studentFollowUpAnswer: r.student_followup_answer ? String(r.student_followup_answer) : null,
    clarityScore: r.clarity_score !== null ? Number(r.clarity_score) : null,
    conceptualDepthScore: r.conceptual_depth_score !== null ? Number(r.conceptual_depth_score) : null,
    missingConcepts: JSON.parse(String(r.missing_concepts || '[]')),
    misconceptions: JSON.parse(String(r.misconceptions || '[]')),
    feedback: r.feedback ? String(r.feedback) : null,
    status: r.status as ReverseTeachingItem['status'],
    createdAt: String(r.created_at),
  }));

  const cmRows = db
    .prepare('SELECT * FROM community_missions WHERE user_id = ? ORDER BY created_at DESC LIMIT 15')
    .all(userId) as Array<Record<string, unknown>>;

  const communityMissions: CommunityMissionSubmission[] = cmRows.map((c) => ({
    id: String(c.id),
    userId: String(c.user_id),
    missionId: String(c.mission_id),
    title: String(c.title),
    skillName: String(c.skill_name),
    careerId: String(c.career_id),
    solutionSummary: String(c.solution_summary),
    implementationProof: String(c.implementation_proof),
    repoOrDemoLink: String(c.repo_or_demo_link || ''),
    impactNotes: String(c.impact_notes || ''),
    aiScore: Number(c.ai_score),
    aiFeedback: String(c.ai_feedback),
    linkedProjectId: c.linked_project_id ? String(c.linked_project_id) : null,
    createdAt: String(c.created_at),
  }));

  const latestCompletedAssess = assessments.find((a) => a.status === 'completed');
  const activeFailure = failureDna.find((f) => f.status !== 'recovered');
  const latestHighSim = workplaceSimulations.find((w) => w.status === 'completed' && (w.overallScore ?? 0) >= 75);
  const hasHighAssess = Boolean(latestCompletedAssess && (latestCompletedAssess.score ?? 0) >= 75);
  const hasLowAssess = Boolean(latestCompletedAssess && (latestCompletedAssess.score ?? 100) < 60);

  let mood: CompanionBriefing['mood'] = 'focused';
  let greeting = `Vanakkam ${user.fullName.split(' ')[0]}! Ready to explore your ${compatibility?.career.title || 'career'} universe today?`;
  let recentAchievement: string | null = null;
  let suggestedActionLabel = 'Try One Day as a Professional';
  let suggestedRoute = 'workplace-sim';

  if (hasHighAssess || latestHighSim || projects.length > 0) {
    mood = 'celebrating';
    recentAchievement = latestHighSim
      ? `Scored ${latestHighSim.overallScore}% in ${latestHighSim.title}`
      : hasHighAssess
        ? `Achieved ${latestCompletedAssess?.score}% in ${latestCompletedAssess?.skillName}`
        : `Verified project proof in ${projects[0]?.skillName}`;
    greeting = `Super job, ${user.fullName.split(' ')[0]}! ${recentAchievement}. Let's build on this momentum!`;
    suggestedActionLabel = activeFailure ? `Clear Failure DNA: ${activeFailure.conceptTag}` : 'Explore Career Universe';
    suggestedRoute = activeFailure ? 'analytics' : 'careers';
  } else if (hasLowAssess || activeFailure) {
    mood = 'encouraging';
    greeting = `Hey ${user.fullName.split(' ')[0]}, mistakes are just Failure DNA signals showing us exactly what to unlock next. We'll crack ${activeFailure?.conceptTag || latestCompletedAssess?.skillName || 'this'} together!`;
    suggestedActionLabel = 'Practice Reverse Teaching';
    suggestedRoute = 'career-arena';
  }

  const weakestSkill = [...skills].sort((a, b) => a.verifiedScore - b.verifiedScore)[0];
  const companionBriefing: CompanionBriefing = {
    companionName: 'Zyra',
    mood,
    greeting,
    memoryHighlight: `Remembered goal: ${compatibility?.career.title || profile.targetCareerId} (${compatibility?.compatibilityScore ?? 0}% match) · Strongest: ${skills[0]?.skillName || 'Core'} (${skills[0]?.verifiedScore ?? 0}%) · Focus: ${weakestSkill?.skillName || 'Fundamentals'} (${weakestSkill?.verifiedScore ?? 0}%).`,
    suggestedActionLabel,
    suggestedRoute,
    recentAchievement,
  };

  return {
    user,
    profile,
    skills,
    roadmap,
    assessments,
    publishedTests,
    upcomingSyllabus,
    proctoringLogs,
    progressRecords,
    agentDecisions,
    careerHistory,
    revisions,
    projects,
    bookmarks,
    interviews,
    compatibility,
    moduleProgress,
    workplaceSimulations,
    parallelChallenges,
    failureDna,
    expertCouncil,
    reverseTeaching,
    communityMissions,
    companionBriefing,
  };
}

export function getMentorHistory(userId: string): MentorMessage[] {
  const rows = db
    .prepare('SELECT * FROM mentor_conversations WHERE user_id = ? ORDER BY created_at ASC LIMIT 60')
    .all(userId) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    role: r.role as MentorMessage['role'],
    content: String(r.content),
    contextTag: r.context_tag ? String(r.context_tag) : null,
    createdAt: String(r.created_at),
  }));
}

export function getAdminDashboardData(adminUserId: string): AdminDashboardData | null {
  const admin = getUserById(adminUserId);
  if (!admin || admin.role !== 'admin') return null;

  const assessmentRows = db
    .prepare('SELECT * FROM admin_assessments ORDER BY created_at DESC')
    .all() as Array<Record<string, unknown>>;
  const assessments = assessmentRows.map(mapAdminAssessmentRow);

  const studentRows = db
    .prepare(`
      SELECT u.id, u.roll_number, u.email, u.full_name,
             COALESCE(lp.target_career_id, 'full-stack-developer') as target_career_id
      FROM users u
      LEFT JOIN learner_profiles lp ON lp.user_id = u.id
      WHERE u.role = 'student'
      ORDER BY u.roll_number ASC
    `)
    .all() as Array<{
    id: string;
    roll_number: string;
    email: string;
    full_name: string;
    target_career_id: string;
  }>;

  const students = studentRows.map((st) => {
    const stats = db
      .prepare(`
        SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_cnt,
               ROUND(AVG(CASE WHEN status = 'completed' AND score IS NOT NULL THEN score END)) as avg_score,
               COUNT(CASE WHEN status = 'terminated_proctoring' THEN 1 END) as term_cnt
        FROM skill_assessments
        WHERE user_id = ?
      `)
      .get(st.id) as { completed_cnt: number; avg_score: number | null; term_cnt: number };

    const procCnt = db
      .prepare('SELECT COUNT(*) as cnt FROM proctoring_logs WHERE user_id = ?')
      .get(st.id) as { cnt: number };

    return {
      id: st.id,
      rollNumber: st.roll_number,
      email: st.email,
      fullName: st.full_name,
      targetCareerId: st.target_career_id,
      completedAssessments: Number(stats?.completed_cnt || 0),
      avgScore: Number(stats?.avg_score || 0),
      proctoringViolations: Number(procCnt?.cnt || 0),
      terminatedTests: Number(stats?.term_cnt || 0),
    };
  });

  const procRows = db
    .prepare(`
      SELECT p.*, u.full_name as student_name, u.roll_number
      FROM proctoring_logs p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT 40
    `)
    .all() as Array<Record<string, unknown>>;

  const proctoringLogs: ProctoringLog[] = procRows.map((p) => ({
    id: String(p.id),
    userId: String(p.user_id),
    studentName: String(p.student_name),
    rollNumber: String(p.roll_number),
    assessmentId: String(p.assessment_id),
    assessmentTitle: String(p.assessment_title),
    switchCount: Number(p.switch_count),
    eventType: p.event_type as ProctoringLog['eventType'],
    details: String(p.details),
    createdAt: String(p.created_at),
  }));

  const subRows = db
    .prepare(`
      SELECT sa.id, u.full_name as student_name, u.roll_number, sa.title, sa.skill_name,
             sa.score, sa.status, sa.tab_switch_count, sa.completed_at
      FROM skill_assessments sa
      JOIN users u ON u.id = sa.user_id
      WHERE sa.status IN ('completed', 'terminated_proctoring')
      ORDER BY COALESCE(sa.completed_at, sa.created_at) DESC
      LIMIT 30
    `)
    .all() as Array<Record<string, unknown>>;

  const recentSubmissions = subRows.map((s) => ({
    id: String(s.id),
    studentName: String(s.student_name),
    rollNumber: String(s.roll_number),
    title: String(s.title || s.skill_name),
    skillName: String(s.skill_name),
    score: s.score !== null ? Number(s.score) : null,
    status: String(s.status),
    tabSwitchCount: Number(s.tab_switch_count || 0),
    completedAt: s.completed_at ? String(s.completed_at) : null,
  }));

  return {
    admin,
    assessments,
    students,
    proctoringLogs,
    recentSubmissions,
  };
}
