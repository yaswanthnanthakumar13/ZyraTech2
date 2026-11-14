import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { db } from './db';
import { uid } from './seed';
import { getUserById } from './auth';
import {
  computeCareerCompatibility,
  getActiveRoadmap,
  getAllCareers,
  getAllResources,
  getCareerById,
  getLearnerProfile,
  getLearnerSkills,
  getMentorHistory,
  getUpcomingSyllabusRecommendations,
  mapAdminAssessmentRow,
} from './workspace';
import type {
  AgentOutputRecord,
  AIAgentDecision,
  AssessmentQuestion,
  MockInterviewEvaluation,
  MockInterviewMessage,
  SkillAssessment,
  SupportedLanguage,
  SyllabusRecommendation,
} from '../src/types';

const MODEL = 'gemini-4-hydrogen';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  hi: 'Hindi (हिन्दी)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ml: 'Malayalam (മലയാളം)',
  bn: 'Bengali (বাংলা)',
  mr: 'Marathi (मराठी)',
};

export function getUserLanguageInstruction(userId: string): string {
  const user = getUserById(userId);
  const lang = user?.preferredLanguage || 'en';
  if (lang === 'en') return 'Respond in clear English.';
  return `Respond in ${LANGUAGE_LABELS[lang]}. Keep technical code identifiers, APIs, and course codes in English script so they remain accurate, while writing explanations and guidance in ${LANGUAGE_LABELS[lang]}.`;
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function callGeminiJson<T>(
  systemInstruction: string,
  prompt: string,
  responseSchema: Record<string, unknown>,
  fallback: () => T
): Promise<{ data: T; usedGemini: boolean; warning?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      data: fallback(),
      usedGemini: false,
      warning: 'GEMINI_API_KEY is not configured; deterministic rule-based agent fallback used.',
    };
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: responseSchema as never,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      const text = (response.text ?? '').trim();
      if (!text) throw new Error('Empty Gemini response');
      return { data: JSON.parse(text) as T, usedGemini: true };
    } catch (err) {
      lastError = err;
    }
  }

  console.error('Gemini structured call failed, falling back:', lastError);
  return {
    data: fallback(),
    usedGemini: false,
    warning: lastError instanceof Error ? lastError.message : 'Gemini API error',
  };
}

// ============================================================================
// AGENT 1: SKILL ASSESSMENT AGENT & UNIVERSITY EXAM ENGINE
// ============================================================================
export async function generateSkillAssessment(params: {
  userId: string;
  skillName: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  assessmentType: 'mixed' | 'mcq' | 'coding' | 'conceptual' | 'debugging' | 'scenario' | 'project_coding';
  courseCode?: string;
  moduleCode?: string;
  assessmentMode?: 'daily_portal' | 'practice_workplace';
}): Promise<SkillAssessment> {
  const profile = getLearnerProfile(params.userId);
  const skills = getLearnerSkills(params.userId);
  const existingSkill = skills.find((s) => s.skillName.toLowerCase() === params.skillName.toLowerCase());
  const career = profile ? getCareerById(profile.targetCareerId) : null;
  const langInstruction = getUserLanguageInstruction(params.userId);
  const mode = params.assessmentMode === 'daily_portal' ? 'daily_portal' : 'practice_workplace';

  const prompt = `
Generate a 5-question ${params.difficulty} skill assessment for "${params.skillName}".
Target career context: ${career?.title ?? 'Software Engineering'}.
Course / Module context: ${params.courseCode || 'General'} ${params.moduleCode || ''}.
Assessment mode: ${mode}.
Assessment type requested: ${params.assessmentType}.
Learner's current score: ${existingSkill?.verifiedScore ?? 0}% (${existingSkill?.verificationStatus ?? 'self_declared'}).
Known weak concepts: ${existingSkill?.weakConcepts.join(', ') || 'None recorded yet'}.
Language requirement: ${langInstruction}

Requirements:
- Return exactly 5 questions.
- If assessmentType is "mixed", include a mix of "mcq", "debugging", "coding", and "conceptual" questions.
- If assessmentType is "mcq", all 5 must be "mcq" with 4 options.
- If assessmentType is "coding", create practical code-writing or debugging problems (set options to [] for open-ended coding prompts, and supply realistic codeSnippet starter/context plus a concise reference solution in correctAnswer).
- If assessmentType is "project_coding", create a Daily Project Assessment: 5 real-world mini-project engineering milestones for "${params.skillName}" in "${career?.title ?? 'Software Engineering'}" (3 hands-on coding tasks with options: [] + starter codeSnippet, 1 debugging fix, and 1 production architecture/security verification check).
- Each question must have a specific conceptTag (e.g. "Closures & Scope", "Async/Await", "SQL Joins", "XSS Mitigation").
- correctAnswer must be exact and concise (for MCQs with 4 options, it MUST match one of the strings in options verbatim).
- Provide careerLogic: 1-2 clear sentences explaining why this question matters for the student's current understanding (${existingSkill?.verifiedScore ?? 0}% in ${params.skillName}) and their target career (${career?.title ?? 'Software Engineering'}).
`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            questionType: { type: Type.STRING },
            prompt: { type: Type.STRING },
            codeSnippet: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            careerLogic: { type: Type.STRING },
            conceptTag: { type: Type.STRING },
          },
          required: ['questionType', 'prompt', 'options', 'correctAnswer', 'explanation', 'careerLogic', 'conceptTag'],
        },
      },
    },
    required: ['questions'],
  };

  const { data } = await callGeminiJson<{
    questions: Array<{
      questionType: string;
      prompt: string;
      codeSnippet?: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
      careerLogic?: string;
      conceptTag: string;
    }>;
  }>(
    'You are Agent 1 (Skill Assessment Agent) in ZyraTech University. Create rigorous, practical technical questions (MCQ and coding) with clear careerLogic grounded in the student’s mastery level.',
    prompt,
    schema,
    () =>
      buildFallbackQuestions(
        params.skillName,
        params.difficulty,
        params.assessmentType,
        career?.title || 'Software Engineering',
        existingSkill?.verifiedScore ?? 0
      )
  );

  const assessmentId = uid('assess');
  const now = new Date().toISOString();
  const questions = (data.questions || []).slice(0, 5);
  const modeLabel =
    params.assessmentType === 'project_coding'
      ? 'Daily Project Assessment'
      : mode === 'daily_portal'
        ? 'Daily Portal'
        : 'Practice Workplace';
  const title = `${modeLabel}: ${params.skillName} (${params.difficulty}${params.courseCode ? ` · ${params.courseCode}` : ''})`;

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO skill_assessments (
        id, user_id, admin_assessment_id, title, skill_name, career_id, course_code, module_code,
        assessment_mode, difficulty, assessment_type, status,
        score, total_questions, correct_count, tab_switch_count, weak_concepts, feedback, created_at, completed_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', NULL, ?, NULL, 0, '[]', NULL, ?, NULL)
    `).run(
      assessmentId,
      params.userId,
      title,
      params.skillName,
      profile?.targetCareerId || 'full-stack-developer',
      params.courseCode || '',
      params.moduleCode || '',
      mode,
      params.difficulty,
      params.assessmentType,
      questions.length,
      now
    );

    const insertQ = db.prepare(`
      INSERT INTO assessment_questions (
        id, assessment_id, question_index, question_type, prompt, code_snippet,
        options, correct_answer, explanation, career_logic, concept_tag
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    questions.forEach((q, idx) => {
      const normalizedType = ['mcq', 'coding', 'conceptual', 'debugging', 'scenario'].includes(q.questionType)
        ? q.questionType
        : 'mcq';
      const defaultLogic = `Tests ${q.conceptTag} at ${params.difficulty} depth to elevate your ${params.skillName} readiness (currently ${existingSkill?.verifiedScore ?? 0}%) for ${career?.title || 'your target career'}.`;
      insertQ.run(
        uid('q'),
        assessmentId,
        idx,
        normalizedType,
        q.prompt,
        q.codeSnippet && q.codeSnippet.trim() ? q.codeSnippet : null,
        JSON.stringify(q.options || []),
        q.correctAnswer,
        q.explanation,
        q.careerLogic || defaultLogic,
        q.conceptTag
      );
    });
  });
  tx();

  return getAssessmentWithQuestions(assessmentId, params.userId)!;
}

export function startAdminAssessmentAttempt(userId: string, adminAssessmentId: string): SkillAssessment {
  const row = db
    .prepare('SELECT * FROM admin_assessments WHERE id = ? AND is_published = 1')
    .get(adminAssessmentId) as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error('Published university assessment not found.');
  }

  const adminTest = mapAdminAssessmentRow(row);
  const career = getCareerById(adminTest.careerId);
  const assessmentId = uid('assess');
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO skill_assessments (
        id, user_id, admin_assessment_id, title, skill_name, career_id, course_code, module_code,
        assessment_mode, difficulty, assessment_type, status,
        score, total_questions, correct_count, tab_switch_count, weak_concepts, feedback, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'M1', 'daily_portal', ?, 'mixed', 'in_progress', NULL, ?, NULL, 0, '[]', NULL, ?, NULL)
    `).run(
      assessmentId,
      userId,
      adminTest.id,
      adminTest.title,
      adminTest.skillName,
      adminTest.careerId,
      adminTest.courseCode || '',
      adminTest.difficulty,
      adminTest.questions.length,
      now
    );

    const insertQ = db.prepare(`
      INSERT INTO assessment_questions (
        id, assessment_id, question_index, question_type, prompt, code_snippet,
        options, correct_answer, explanation, career_logic, concept_tag
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    adminTest.questions.forEach((q, idx) => {
      const concept = q.conceptTag || adminTest.skillName;
      const logic =
        q.careerLogic ||
        `Required university benchmark in ${concept} for ${career?.title || adminTest.careerId} (${adminTest.courseCode || adminTest.skillName}).`;
      insertQ.run(
        uid('q'),
        assessmentId,
        idx,
        q.questionType || 'mcq',
        q.prompt,
        q.codeSnippet && q.codeSnippet.trim() ? q.codeSnippet : null,
        JSON.stringify(q.options || []),
        q.correctAnswer,
        q.explanation,
        logic,
        concept
      );
    });
  });
  tx();

  return getAssessmentWithQuestions(assessmentId, userId)!;
}

export function recordProctoringEvent(params: {
  userId: string;
  assessmentId: string;
  eventType: 'tab_switch' | 'fullscreen_exit' | 'window_blur';
  details?: string;
}): {
  switchCount: number;
  maxSwitches: number;
  terminated: boolean;
  message: string;
  assessment: SkillAssessment;
} {
  const row = db
    .prepare('SELECT * FROM skill_assessments WHERE id = ? AND user_id = ?')
    .get(params.assessmentId, params.userId) as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error('Assessment attempt not found.');
  }

  let maxSwitches = 3;
  if (row.admin_assessment_id) {
    const adm = db
      .prepare('SELECT max_tab_switches FROM admin_assessments WHERE id = ?')
      .get(String(row.admin_assessment_id)) as { max_tab_switches: number } | undefined;
    if (adm?.max_tab_switches) maxSwitches = adm.max_tab_switches;
  }

  if (row.status !== 'in_progress') {
    return {
      switchCount: Number(row.tab_switch_count || 0),
      maxSwitches,
      terminated: row.status === 'terminated_proctoring',
      message: 'Assessment is already finalized.',
      assessment: getAssessmentWithQuestions(params.assessmentId, params.userId)!,
    };
  }

  const nextCount = Number(row.tab_switch_count || 0) + 1;
  const shouldTerminate = nextCount > maxSwitches;
  const now = new Date().toISOString();
  const title = String(row.title || `${String(row.skill_name)} Assessment`);

  db.transaction(() => {
    db.prepare('UPDATE skill_assessments SET tab_switch_count = ? WHERE id = ?').run(nextCount, params.assessmentId);

    db.prepare(`
      INSERT INTO proctoring_logs (id, user_id, assessment_id, assessment_title, switch_count, event_type, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uid('proc'),
      params.userId,
      params.assessmentId,
      title,
      nextCount,
      params.eventType,
      params.details || `Proctoring trigger #${nextCount}: ${params.eventType.replace('_', ' ')}`,
      now
    );

    if (shouldTerminate) {
      db.prepare(`
        UPDATE skill_assessments
        SET status = 'terminated_proctoring',
            score = 0,
            correct_count = 0,
            feedback = ?,
            completed_at = ?
        WHERE id = ?
      `).run(
        `Exam terminated automatically after ${nextCount} focus/tab switches (maximum permitted: ${maxSwitches}). Incident logged to University Admin Portal.`,
        now,
        params.assessmentId
      );

      db.prepare(`
        INSERT INTO proctoring_logs (id, user_id, assessment_id, assessment_title, switch_count, event_type, details, created_at)
        VALUES (?, ?, ?, ?, ?, 'terminated', ?, ?)
      `).run(
        uid('proc'),
        params.userId,
        params.assessmentId,
        title,
        nextCount,
        `Exam auto-terminated on switch #${nextCount} (> ${maxSwitches} allowed). Returned student to dashboard with warning.`,
        now
      );
    }
  })();

  const message = shouldTerminate
    ? `PROCTORING TERMINATION: You exceeded the maximum ${maxSwitches} allowed tab/fullscreen switches (${nextCount}/${maxSwitches}). Your test has been terminated and reported.`
    : `Proctoring Warning ${nextCount}/${maxSwitches}: Tab switching or exiting fullscreen is prohibited during ZyraTech assessments. More than ${maxSwitches} switches will terminate the exam.`;

  return {
    switchCount: nextCount,
    maxSwitches,
    terminated: shouldTerminate,
    message,
    assessment: getAssessmentWithQuestions(params.assessmentId, params.userId)!,
  };
}

export function getAssessmentWithQuestions(assessmentId: string, userId: string): SkillAssessment | null {
  const row = db
    .prepare('SELECT * FROM skill_assessments WHERE id = ? AND user_id = ?')
    .get(assessmentId, userId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const qRows = db
    .prepare('SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_index ASC')
    .all(assessmentId) as Array<Record<string, unknown>>;

  const isFinished = row.status === 'completed' || row.status === 'terminated_proctoring';

  const questions: AssessmentQuestion[] = qRows.map((q) => ({
    id: String(q.id),
    questionIndex: Number(q.question_index),
    questionType: q.question_type as AssessmentQuestion['questionType'],
    prompt: String(q.prompt),
    codeSnippet: q.code_snippet ? String(q.code_snippet) : null,
    options: JSON.parse(String(q.options || '[]')),
    correctAnswer: isFinished ? String(q.correct_answer) : undefined,
    explanation: isFinished ? String(q.explanation) : undefined,
    careerLogic: isFinished && q.career_logic ? String(q.career_logic) : undefined,
    conceptTag: String(q.concept_tag),
    userAnswer: q.user_answer !== null ? String(q.user_answer) : null,
    isCorrect: q.is_correct !== null ? Number(q.is_correct) === 1 : null,
    aiEvaluation: q.ai_evaluation ? String(q.ai_evaluation) : null,
  }));

  return {
    id: String(row.id),
    userId: String(row.user_id),
    adminAssessmentId: row.admin_assessment_id ? String(row.admin_assessment_id) : null,
    title: String(row.title || `${String(row.skill_name)} Assessment`),
    skillName: String(row.skill_name),
    careerId: String(row.career_id),
    courseCode: row.course_code ? String(row.course_code) : '',
    moduleCode: row.module_code ? String(row.module_code) : '',
    assessmentMode: (row.assessment_mode as SkillAssessment['assessmentMode']) || 'practice_workplace',
    difficulty: row.difficulty as SkillAssessment['difficulty'],
    assessmentType: row.assessment_type as SkillAssessment['assessmentType'],
    status: row.status as SkillAssessment['status'],
    score: row.score !== null ? Number(row.score) : null,
    totalQuestions: Number(row.total_questions),
    correctCount: row.correct_count !== null ? Number(row.correct_count) : null,
    tabSwitchCount: Number(row.tab_switch_count || 0),
    weakConcepts: JSON.parse(String(row.weak_concepts || '[]')),
    feedback: row.feedback ? String(row.feedback) : null,
    createdAt: String(row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    questions,
  };
}

export async function evaluateAssessmentSubmission(params: {
  userId: string;
  assessmentId: string;
  answers: Record<string, string>;
}): Promise<{ assessment: SkillAssessment; decision: AIAgentDecision }> {
  const row = db
    .prepare('SELECT * FROM skill_assessments WHERE id = ? AND user_id = ?')
    .get(params.assessmentId, params.userId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Assessment not found');
  if (row.status === 'terminated_proctoring') {
    throw new Error('This assessment was terminated due to proctoring violations (>3 tab switches).');
  }

  const qRows = db
    .prepare('SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_index ASC')
    .all(params.assessmentId) as Array<Record<string, unknown>>;

  const openEndedItems: Array<{
    id: string;
    prompt: string;
    referenceAnswer: string;
    userAnswer: string;
    conceptTag: string;
  }> = [];

  const graded = new Map<string, { isCorrect: boolean; aiEvaluation: string }>();

  for (const q of qRows) {
    const qId = String(q.id);
    const options: string[] = JSON.parse(String(q.options || '[]'));
    const userAns = (params.answers[qId] || '').trim();
    const correctAns = String(q.correct_answer).trim();

    if (options.length > 0) {
      const isCorrect = userAns.toLowerCase() === correctAns.toLowerCase();
      graded.set(qId, {
        isCorrect,
        aiEvaluation: isCorrect
          ? 'Correct selection verified.'
          : `Expected "${correctAns}". ${String(q.explanation)}`,
      });
    } else {
      openEndedItems.push({
        id: qId,
        prompt: String(q.prompt),
        referenceAnswer: correctAns,
        userAnswer: userAns,
        conceptTag: String(q.concept_tag),
      });
    }
  }

  if (openEndedItems.length > 0) {
    const evalSchema = {
      type: Type.OBJECT,
      properties: {
        results: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              isCorrect: { type: Type.BOOLEAN },
              feedback: { type: Type.STRING },
            },
            required: ['id', 'isCorrect', 'feedback'],
          },
        },
      },
      required: ['results'],
    };

    const { data } = await callGeminiJson<{
      results: Array<{ id: string; isCorrect: boolean; feedback: string }>;
    }>(
      `You are Agent 1 (Skill Assessment Agent). Grade open-ended coding, debugging, and conceptual answers fairly on technical accuracy. ${getUserLanguageInstruction(params.userId)}`,
      `Grade these learner responses against reference answers:\n${JSON.stringify(openEndedItems)}`,
      evalSchema,
      () => ({
        results: openEndedItems.map((item) => {
          const combinedKeywords = `${item.referenceAnswer} ${item.prompt} ${item.conceptTag}`
            .toLowerCase()
            .split(/\W+/)
            .filter((t) => t.length > 3);
          const uniqueKeywords = Array.from(new Set(combinedKeywords));
          const ansTrimmed = item.userAnswer.trim();
          const ansLow = ansTrimmed.toLowerCase();
          const keywordHits = uniqueKeywords.filter((t) => ansLow.includes(t)).length;
          const codeSignalHits = [
            /\bfunction\b|\bdef\b|\bconst\b|\blet\b|=>/,
            /\breturn\b|\byield\b|\bexport\b/,
            /\bif\b|\belse\b|\btry\b|\bcatch\b|\bthrow\b/,
            /\basync\b|\bawait\b|\bfetch\b|\bpromise\b/,
            /\bselect\b.*\bfrom\b|\bwhere\b|\bjoin\b|\bgroup by\b/i,
            /\bset\b|\bmap\b|\bfilter\b|\breduce\b|\bparse\b|\bstatus\b/,
            /[{}();=]/,
          ].filter((rx) => rx.test(ansTrimmed)).length;

          const isCodeSubmission = codeSignalHits >= 2 && ansTrimmed.length >= 16;
          const isConceptMatch = ansTrimmed.length >= 15 && keywordHits >= 2;
          const isCorrect =
            (isCodeSubmission && keywordHits >= 1) ||
            codeSignalHits >= 3 ||
            isConceptMatch;

          return {
            id: item.id,
            isCorrect,
            feedback: isCorrect
              ? 'Implementation and technical mechanism verified accurately.'
              : `Key implementation or concept detail missed (${item.conceptTag}). Reference: ${item.referenceAnswer}`,
          };
        }),
      })
    );

    for (const r of data.results) {
      graded.set(r.id, { isCorrect: r.isCorrect, aiEvaluation: r.feedback });
    }
  }

  let correctCount = 0;
  const weakConceptsSet = new Set<string>();
  const now = new Date().toISOString();

  const updateQ = db.prepare(`
    UPDATE assessment_questions
    SET user_answer = ?, is_correct = ?, ai_evaluation = ?
    WHERE id = ?
  `);

  for (const q of qRows) {
    const qId = String(q.id);
    const userAns = (params.answers[qId] || '').trim();
    const res = graded.get(qId) || { isCorrect: false, aiEvaluation: 'No answer provided.' };
    if (res.isCorrect) {
      correctCount++;
    } else {
      weakConceptsSet.add(String(q.concept_tag));
    }
    updateQ.run(userAns, res.isCorrect ? 1 : 0, res.aiEvaluation, qId);
  }

  const totalQuestions = Math.max(1, qRows.length);
  const score = Math.round((correctCount / totalQuestions) * 100);
  const weakConcepts = Array.from(weakConceptsSet);
  const skillName = String(row.skill_name);
  const assessmentTitle = String(row.title || `${skillName} Assessment`);

  const feedback =
    score >= 80
      ? `Strong verified mastery in ${skillName} (${score}%). Ready to advance to higher-complexity milestones.`
      : score >= 55
        ? `Partial competency in ${skillName} (${score}%). Focus targeted practice on: ${weakConcepts.join(', ') || 'edge cases'}.`
        : `Foundational difficulty detected in ${skillName} (${score}%). Weak concepts: ${weakConcepts.join(', ') || 'core fundamentals'}. Dependent topics will be paused while fundamentals are reinforced.`;

  db.prepare(`
    UPDATE skill_assessments
    SET status = 'completed', score = ?, correct_count = ?, weak_concepts = ?, feedback = ?, completed_at = ?
    WHERE id = ?
  `).run(score, correctCount, JSON.stringify(weakConcepts), feedback, now, params.assessmentId);

  const existingSkill = db
    .prepare('SELECT * FROM learner_skills WHERE user_id = ? AND LOWER(skill_name) = LOWER(?)')
    .get(params.userId, skillName) as Record<string, unknown> | undefined;

  const theoryDelta = score;
  const practicalDelta =
    String(row.assessment_type) === 'coding' ||
    String(row.assessment_type) === 'debugging' ||
    String(row.assessment_type) === 'project_coding'
      ? score
      : Math.round(score * 0.9);
  const psDelta = Math.round(score * 0.95);
  const newRetention = Math.min(98, Math.max(40, Math.round(score * 0.85 + 15)));

  if (existingSkill) {
    const newStatus = existingSkill.verification_status === 'project_verified' ? 'project_verified' : 'assessment_verified';
    db.prepare(`
      UPDATE learner_skills
      SET verified_score = ?, verification_status = ?, theory_score = ?, practical_score = ?,
          problem_solving_score = ?, retention_score = ?, last_practiced_at = ?, decay_risk = 'low',
          weak_concepts = ?, updated_at = ?
      WHERE id = ?
    `).run(
      score,
      newStatus,
      theoryDelta,
      practicalDelta,
      psDelta,
      newRetention,
      now,
      JSON.stringify(weakConcepts),
      now,
      String(existingSkill.id)
    );
  } else {
    db.prepare(`
      INSERT INTO learner_skills (
        id, user_id, skill_name, category, self_declared_score, verified_score,
        verification_status, theory_score, practical_score, problem_solving_score,
        project_score, retention_score, last_practiced_at, decay_risk, weak_concepts, updated_at
      ) VALUES (?, ?, ?, 'Technical', 0, ?, 'assessment_verified', ?, ?, ?, 0, ?, ?, 'low', ?, ?)
    `).run(
      uid('skill'),
      params.userId,
      skillName,
      score,
      theoryDelta,
      practicalDelta,
      psDelta,
      newRetention,
      now,
      JSON.stringify(weakConcepts),
      now
    );
  }

  if (score >= 70) {
    db.prepare(`
      UPDATE revision_schedules SET status = 'completed'
      WHERE user_id = ? AND LOWER(skill_name) = LOWER(?) AND status = 'pending'
    `).run(params.userId, skillName);
  }

  db.prepare(`
    INSERT INTO progress_records (id, user_id, activity_type, skill_name, title, minutes_spent, score, recorded_at)
    VALUES (?, ?, 'assessment', ?, ?, 20, ?, ?)
  `).run(uid('pr'), params.userId, skillName, assessmentTitle, score, now);

  // Sync Failure DNA directly from missed concepts & post-revision repeat checks
  syncFailureDNAFromAssessmentRecord(params.userId, skillName, weakConcepts, score, now);

  const decision = await orchestrateLearningEvent({
    userId: params.userId,
    triggerEvent: 'ASSESSMENT_SUBMITTED',
    context: {
      skillName,
      score,
      difficulty: String(row.difficulty),
      weakConcepts,
    },
  });

  // Also refresh upcoming syllabus module recommendations automatically after assessment!
  await generateUpcomingSyllabusWithAI(params.userId);

  const updatedAssessment = getAssessmentWithQuestions(params.assessmentId, params.userId)!;
  return { assessment: updatedAssessment, decision };
}

// ============================================================================
// UPCOMING SYLLABUS MODULE RECOMMENDER (GEMINI AI)
// ============================================================================
export async function generateUpcomingSyllabusWithAI(userId: string): Promise<SyllabusRecommendation[]> {
  const profile = getLearnerProfile(userId);
  if (!profile) return [];

  const career = getCareerById(profile.targetCareerId) || getAllCareers()[0];
  const skills = getLearnerSkills(userId);
  const compatibility = computeCareerCompatibility(userId, career.id);
  const langInstruction = getUserLanguageInstruction(userId);

  const availableModules = career.courses.flatMap((course) =>
    course.syllabusModules.map((mod) => ({
      courseCode: course.courseCode,
      courseTitle: course.title,
      level: course.level,
      hours: Math.max(6, Math.round(course.hours / Math.max(1, course.syllabusModules.length))),
      moduleCode: mod.moduleCode,
      moduleTitle: mod.title,
      topics: mod.topics,
      skillFocus: mod.skillFocus,
    }))
  );

  if (availableModules.length === 0) return getUpcomingSyllabusRecommendations(userId);

  const schema = {
    type: Type.OBJECT,
    properties: {
      recommendations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            courseCode: { type: Type.STRING },
            courseTitle: { type: Type.STRING },
            moduleCode: { type: Type.STRING },
            recommendedModuleTitle: { type: Type.STRING },
            skillFocus: { type: Type.STRING },
            rationale: { type: Type.STRING },
            topics: { type: Type.ARRAY, items: { type: Type.STRING } },
            estimatedHours: { type: Type.INTEGER },
            priority: { type: Type.STRING },
          },
          required: [
            'courseCode',
            'courseTitle',
            'moduleCode',
            'recommendedModuleTitle',
            'skillFocus',
            'rationale',
            'topics',
            'estimatedHours',
            'priority',
          ],
        },
      },
    },
    required: ['recommendations'],
  };

  const { data } = await callGeminiJson<{
    recommendations: Array<{
      courseCode: string;
      courseTitle: string;
      moduleCode: string;
      recommendedModuleTitle: string;
      skillFocus: string;
      rationale: string;
      topics: string[];
      estimatedHours: number;
      priority: string;
    }>;
  }>(
    `You are the ZyraTech Curriculum & Syllabus Agent. Recommend the best 2-3 upcoming syllabus modules based on the student's Skill DNA gaps and career courses. ${langInstruction}`,
    `Career Goal: ${career.title}
Student Skill DNA: ${skills.map((s) => `${s.skillName}: ${s.verifiedScore}% (${s.verificationStatus})`).join(', ')}
Top Missing Gaps: ${compatibility?.missingSkills.map((m) => `${m.skillName} (gap ${m.gap}%)`).join(', ') || 'None'}
Available Course Syllabus Modules: ${JSON.stringify(availableModules)}
Select up to 3 upcoming syllabus modules ordered by priority ("critical", "recommended", or "enrichment").`,
    schema,
    () => {
      const missingSet = new Set((compatibility?.missingSkills || []).map((m) => m.skillName.toLowerCase()));
      const sorted = [...availableModules].sort((a, b) => {
        const aMiss = missingSet.has(a.skillFocus.toLowerCase()) ? 0 : 1;
        const bMiss = missingSet.has(b.skillFocus.toLowerCase()) ? 0 : 1;
        return aMiss - bMiss;
      });
      return {
        recommendations: sorted.slice(0, 3).map((m, idx) => ({
          courseCode: m.courseCode,
          courseTitle: m.courseTitle,
          moduleCode: m.moduleCode,
          recommendedModuleTitle: m.moduleTitle,
          skillFocus: m.skillFocus,
          rationale:
            idx === 0
              ? `Directly targets your primary ${career.title} competency gap in ${m.skillFocus} so downstream projects unlock cleanly.`
              : `Builds continuous mastery in ${m.skillFocus} for ${courseTitleSafe(m.courseTitle)}.`,
          topics: m.topics,
          estimatedHours: m.hours,
          priority: idx === 0 ? 'critical' : idx === 1 ? 'recommended' : 'enrichment',
        })),
      };
    }
  );

  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare('DELETE FROM syllabus_recommendations WHERE user_id = ?').run(userId);
    const ins = db.prepare(`
      INSERT INTO syllabus_recommendations (
        id, user_id, career_id, course_code, course_title, module_code,
        recommended_module_title, skill_focus, rationale, topics, estimated_hours, priority, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of (data.recommendations || []).slice(0, 3)) {
      const prio = ['critical', 'recommended', 'enrichment'].includes(r.priority) ? r.priority : 'recommended';
      ins.run(
        uid('syl'),
        userId,
        career.id,
        r.courseCode,
        r.courseTitle,
        r.moduleCode,
        r.recommendedModuleTitle,
        r.skillFocus,
        r.rationale,
        JSON.stringify(r.topics || []),
        Math.max(4, Number(r.estimatedHours) || 10),
        prio,
        now
      );
    }
  })();

  return getUpcomingSyllabusRecommendations(userId);
}

function courseTitleSafe(t: string): string {
  return t || 'this course';
}

// ============================================================================
// ADMIN PORTAL GEMINI TEST GENERATOR
// ============================================================================
export async function generateAdminTestWithAI(params: {
  title: string;
  careerId: string;
  skillName: string;
  courseCode: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questionCount?: number;
  assessmentType?: 'mixed' | 'mcq' | 'coding';
}) {
  const career = getCareerById(params.careerId);
  const count = Math.max(3, Math.min(8, params.questionCount || 5));
  const examFormat = params.assessmentType || 'mixed';

  const schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            questionType: { type: Type.STRING },
            prompt: { type: Type.STRING },
            codeSnippet: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            conceptTag: { type: Type.STRING },
          },
          required: ['questionType', 'prompt', 'options', 'correctAnswer', 'explanation', 'conceptTag'],
        },
      },
    },
    required: ['questions'],
  };

  const { data, usedGemini } = await callGeminiJson<{
    questions: Array<{
      questionType: string;
      prompt: string;
      codeSnippet?: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
      conceptTag: string;
    }>;
  }>(
    'You are the ZyraTech University Exam Authoring Assistant. Create high-integrity university exam questions. For MCQ questions provide exact 4-option arrays with verbatim correctAnswer; for coding/debugging open-ended questions set options to [] and supply starter codeSnippet + reference solution.',
    `Author ${count} exam questions for university test "${params.title}".
Course Code: ${params.courseCode || 'General'}
Career Track: ${career?.title || params.careerId}
Target Skill: ${params.skillName}
Difficulty: ${params.difficulty}
Requested Format: ${examFormat === 'coding' ? 'Hands-on Coding & Debugging problems (options: [])' : examFormat === 'mcq' ? 'Multiple-Choice Questions (4 options each)' : 'Mixed (3-4 MCQs + 1-2 practical coding/debugging tasks)'}`,
    schema,
    () => buildFallbackQuestions(params.skillName, params.difficulty, examFormat, career?.title || params.careerId)
  );

  const normalized = (data.questions || []).slice(0, count).map((q) => {
    const qType = (['mcq', 'coding', 'conceptual', 'debugging', 'scenario'].includes(q.questionType)
      ? q.questionType
      : examFormat === 'coding'
        ? 'coding'
        : 'mcq') as 'mcq' | 'coding' | 'conceptual' | 'debugging' | 'scenario';
    const isOpenEnded = qType === 'coding' || qType === 'debugging';
    return {
      questionType: qType,
      prompt: q.prompt,
      codeSnippet: q.codeSnippet || '',
      options: isOpenEnded && (!q.options || q.options.length === 0)
        ? []
        : q.options && q.options.length >= 2
          ? q.options
          : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      conceptTag: q.conceptTag || params.skillName,
    };
  });

  return { questions: normalized, usedGemini };
}

// ============================================================================
// CENTRAL AI ORCHESTRATOR (COORDINATES ALL 6 SPECIALIZED AGENTS)
// ============================================================================
export async function orchestrateLearningEvent(params: {
  userId: string;
  triggerEvent:
    | 'ONBOARDING_COMPLETE'
    | 'ASSESSMENT_SUBMITTED'
    | 'CAREER_GOAL_CHANGED'
    | 'PROJECT_VERIFIED'
    | 'DECAY_CHECK'
    | 'MANUAL_SYNC';
  context?: Record<string, unknown>;
}): Promise<AIAgentDecision> {
  const profile = getLearnerProfile(params.userId);
  if (!profile) throw new Error('Learner profile not found');

  const skills = getLearnerSkills(params.userId);
  const career = getCareerById(profile.targetCareerId) || getAllCareers()[0];
  const compatibility = computeCareerCompatibility(params.userId, career.id);
  const resources = getAllResources(params.userId);
  const now = new Date().toISOString();
  const langInstruction = getUserLanguageInstruction(params.userId);

  const decayRisks = skills.filter((s) => s.decayRisk === 'moderate' || s.decayRisk === 'high');
  for (const ds of decayRisks) {
    const existingRev = db
      .prepare("SELECT id FROM revision_schedules WHERE user_id = ? AND skill_name = ? AND status = 'pending'")
      .get(params.userId, ds.skillName);
    if (!existingRev) {
      db.prepare(`
        INSERT INTO revision_schedules (id, user_id, skill_name, reason, urgency, due_date, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(
        uid('rev'),
        params.userId,
        ds.skillName,
        `Retention score dropped to ${ds.retentionScore}% since last practice. Spaced revision recommended.`,
        ds.decayRisk,
        new Date(Date.now() + 86400000).toISOString(),
        now
      );
    }
  }

  const assessedSkillName = params.context?.skillName ? String(params.context.skillName) : null;
  const assessedScore = typeof params.context?.score === 'number' ? Number(params.context.score) : null;
  const weakConcepts = Array.isArray(params.context?.weakConcepts)
    ? (params.context.weakConcepts as string[])
    : [];

  const isLowScoreEvent =
    params.triggerEvent === 'ASSESSMENT_SUBMITTED' && assessedScore !== null && assessedScore < 55;
  const isHighScoreEvent =
    params.triggerEvent === 'ASSESSMENT_SUBMITTED' && assessedScore !== null && assessedScore >= 75;

  const activeRoadmap = getActiveRoadmap(params.userId);
  const shouldRebuildRoadmap =
    !activeRoadmap ||
    params.triggerEvent === 'ONBOARDING_COMPLETE' ||
    params.triggerEvent === 'CAREER_GOAL_CHANGED' ||
    activeRoadmap.careerId !== career.id;

  const skillMap = new Map(skills.map((s) => [s.skillName.toLowerCase(), s]));

  if (shouldRebuildRoadmap) {
    db.prepare("UPDATE learning_roadmaps SET status = 'archived', updated_at = ? WHERE user_id = ? AND status = 'active'").run(
      now,
      params.userId
    );

    const roadmapId = uid('roadmap');
    const orderedReqs = [...career.requirements].sort((a, b) => {
      const sa = skillMap.get(a.skillName.toLowerCase())?.verifiedScore ?? 0;
      const sb = skillMap.get(b.skillName.toLowerCase())?.verifiedScore ?? 0;
      const metA = sa >= a.requiredLevel * 0.8 ? 0 : 1;
      const metB = sb >= b.requiredLevel * 0.8 ? 0 : 1;
      if (metA !== metB) return metA - metB;
      const impRank = { core: 0, important: 1, nice_to_have: 2 };
      return impRank[a.importance] - impRank[b.importance];
    });

    const totalHours = Math.max(12, compatibility?.estimatedLearningHours || 40);
    const reason =
      params.triggerEvent === 'CAREER_GOAL_CHANGED'
        ? `Career goal shifted to ${career.title}. Preserved ${compatibility?.transferableSkills.length || 0} transferable verified skills (${compatibility?.transferableSkills.join(', ') || 'baseline'}) and sequenced remaining gaps.`
        : `Personalized roadmap generated for ${career.title} (${compatibility?.compatibilityScore ?? 0}% baseline compatibility).`;

    db.prepare(`
      INSERT INTO learning_roadmaps (
        id, user_id, career_id, career_title, status, compatibility_score,
        readiness_estimate, estimated_total_hours, adaptation_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)
    `).run(
      roadmapId,
      params.userId,
      career.id,
      career.title,
      compatibility?.compatibilityScore ?? 0,
      compatibility?.indicativeReadinessEstimate ?? 0,
      totalHours,
      reason,
      now,
      now
    );

    const insertMs = db.prepare(`
      INSERT INTO roadmap_milestones (
        id, roadmap_id, user_id, stage_order, skill_name, title, learning_objective,
        difficulty, estimated_hours, status, completion_criteria, practical_exercise,
        mini_project, is_reusable_transfer, assessment_required, last_assessment_score, adapted_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    let firstIncompleteAssigned = false;
    orderedReqs.forEach((req, idx) => {
      const ls = skillMap.get(req.skillName.toLowerCase());
      const score = ls ? ls.verifiedScore : 0;
      const isVerifiedMet =
        ls && ls.verificationStatus !== 'self_declared' && score >= req.requiredLevel * 0.8;
      const isTransfer = Boolean(isVerifiedMet);

      let status: 'completed' | 'in_progress' | 'available' | 'locked' = 'locked';
      if (isVerifiedMet) {
        status = 'completed';
      } else if (!firstIncompleteAssigned) {
        status = 'in_progress';
        firstIncompleteAssigned = true;
      } else if (idx <= 3) {
        status = 'available';
      }

      const gap = Math.max(10, req.requiredLevel - score);
      const hrs = isVerifiedMet ? 2 : Math.max(6, Math.round(gap * 0.28));
      const diff = score < 35 ? 'beginner' : score < 70 ? 'intermediate' : 'advanced';

      insertMs.run(
        uid('ms'),
        roadmapId,
        params.userId,
        idx + 1,
        req.skillName,
        isVerifiedMet ? `${req.skillName} (Transferred Competency)` : `Master ${req.skillName} for ${career.title}`,
        isVerifiedMet
          ? `Previously verified at ${score}% — preserved across career paths without re-study.`
          : `Bridge ${req.skillName} from ${score}% to target ${req.requiredLevel}% proficiency.`,
        diff,
        hrs,
        status,
        `Score >= ${Math.min(85, req.requiredLevel)}% on ${req.skillName} skill verification.`,
        `Complete targeted ${req.skillName} practical lab focusing on real-world ${career.title} patterns.`,
        `Build a verifiable ${req.skillName} mini-project aligned with ${career.title}.`,
        isTransfer ? 1 : 0,
        ls && ls.verificationStatus !== 'self_declared' ? score : null,
        isTransfer
          ? `Preserved transferable skill (${score}% ${ls?.verificationStatus.replace('_', ' ')}).`
          : `Prioritized gap (${gap}% remaining to target).`
      );
    });
  } else if (activeRoadmap && assessedSkillName && assessedScore !== null) {
    const milestones = activeRoadmap.milestones;
    const targetMs = milestones.find((m) => m.skillName.toLowerCase() === assessedSkillName.toLowerCase());

    if (isLowScoreEvent) {
      if (targetMs) {
        db.prepare(`
          UPDATE roadmap_milestones
          SET status = 'needs_revision', difficulty = 'beginner',
              last_assessment_score = ?,
              learning_objective = ?,
              adapted_note = ?
          WHERE id = ?
        `).run(
          assessedScore,
          `Remediate foundational gaps in ${assessedSkillName}: ${weakConcepts.join(', ') || 'core syntax & logic'}.`,
          `Adaptive Remediation Triggered (${assessedScore}% score): switched to beginner-friendly material, added extra drills, and postponed dependent stages.`,
          targetMs.id
        );

        db.prepare(`
          UPDATE roadmap_milestones
          SET status = 'locked',
              adapted_note = 'Postponed until prerequisite ' || ? || ' reaches >= 70%.'
          WHERE roadmap_id = ? AND stage_order > ? AND status != 'completed'
        `).run(assessedSkillName, activeRoadmap.id, targetMs.stageOrder);
      }

      db.prepare(`
        INSERT INTO revision_schedules (id, user_id, skill_name, reason, urgency, due_date, status, created_at)
        VALUES (?, ?, ?, ?, 'high', ?, 'pending', ?)
      `).run(
        uid('rev'),
        params.userId,
        assessedSkillName,
        `Low assessment score (${assessedScore}%). Reassessment scheduled after completing beginner exercises on: ${weakConcepts.join(', ') || 'fundamentals'}.`,
        new Date(Date.now() + 2 * 86400000).toISOString(),
        now
      );

      db.prepare(`
        UPDATE learning_roadmaps
        SET compatibility_score = ?, readiness_estimate = ?, adaptation_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(
        compatibility?.compatibilityScore ?? activeRoadmap.compatibilityScore,
        compatibility?.indicativeReadinessEstimate ?? activeRoadmap.readinessEstimate,
        `Adaptive intervention: ${assessedSkillName} assessment scored ${assessedScore}%. Postponed advanced dependent stages and prioritized beginner remediation on ${weakConcepts.join(', ') || 'core concepts'}.`,
        now,
        activeRoadmap.id
      );
    } else if (isHighScoreEvent) {
      if (targetMs) {
        db.prepare(`
          UPDATE roadmap_milestones
          SET status = 'completed', last_assessment_score = ?,
              adapted_note = ?
          WHERE id = ?
        `).run(
          assessedScore,
          `Verified competency at ${assessedScore}%! Unlocked dependent stages and increased challenge level.`,
          targetMs.id
        );

        const nextMs = milestones.find((m) => m.stageOrder > targetMs.stageOrder && m.status !== 'completed');
        if (nextMs) {
          db.prepare(`
            UPDATE roadmap_milestones
            SET status = 'in_progress', adapted_note = ?
            WHERE id = ?
          `).run(`Unlocked after passing ${assessedSkillName} (${assessedScore}%).`, nextMs.id);
        }
      }

      db.prepare(`
        UPDATE learning_roadmaps
        SET compatibility_score = ?, readiness_estimate = ?, adaptation_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(
        compatibility?.compatibilityScore ?? activeRoadmap.compatibilityScore,
        compatibility?.indicativeReadinessEstimate ?? activeRoadmap.readinessEstimate,
        `Advancement unlocked: ${assessedSkillName} verified at ${assessedScore}%. Next roadmap milestone promoted to active status.`,
        now,
        activeRoadmap.id
      );
    } else {
      db.prepare(`
        UPDATE learning_roadmaps
        SET compatibility_score = ?, readiness_estimate = ?, updated_at = ?
        WHERE id = ?
      `).run(
        compatibility?.compatibilityScore ?? activeRoadmap.compatibilityScore,
        compatibility?.indicativeReadinessEstimate ?? activeRoadmap.readinessEstimate,
        now,
        activeRoadmap.id
      );
    }
  }

  const matchedResources = resources
    .filter((r) => !assessedSkillName || r.skillName.toLowerCase() === assessedSkillName.toLowerCase())
    .slice(0, 4)
    .map((r) => `${r.title} (${r.provider}, ${r.difficulty})`);

  const orchestratorSchema = {
    type: Type.OBJECT,
    properties: {
      orchestratorSummary: { type: Type.STRING },
      nextAction: { type: Type.STRING },
      explanation: { type: Type.STRING },
      agentOutputs: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            agentName: { type: Type.STRING },
            summary: { type: Type.STRING },
            keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['agentName', 'summary', 'keyFindings', 'recommendations'],
        },
      },
    },
    required: ['orchestratorSummary', 'nextAction', 'explanation', 'agentOutputs'],
  };

  const orchestratorPrompt = `
You are the Central AI Orchestrator for ZyraTech coordinating 6 specialized agents:
1. Skill Assessment Agent
2. Career Matching Agent
3. Roadmap Generation Agent
4. Resource Recommendation Agent
5. Performance Analysis Agent
6. AI Mentor Agent

Event Trigger: ${params.triggerEvent}
Event Context: ${JSON.stringify(params.context || {})}
Target Career: ${career.title} (${compatibility?.compatibilityScore ?? 0}% compatibility, ${compatibility?.indicativeReadinessEstimate ?? 0}% indicative readiness)
Learner Skills: ${skills.map((s) => `${s.skillName}: ${s.verifiedScore}% (${s.verificationStatus}, retention ${s.retentionScore}%)`).join('; ')}
Missing Career Skills: ${compatibility?.missingSkills.map((m) => `${m.skillName} (current ${m.currentScore}% / target ${m.requiredLevel}%)`).join('; ') || 'None'}
Transferable Skills: ${compatibility?.transferableSkills.join(', ') || 'None'}
Decay Risks: ${decayRisks.map((d) => `${d.skillName} (${d.decayRisk})`).join(', ') || 'None'}
Available Matched Resources: ${matchedResources.join('; ')}
Preferred Learning Style: ${profile.preferredLearningStyle}
Language guidance: ${langInstruction}

Produce structured outputs for all 6 agents (exact agentName strings: "Skill Assessment Agent", "Career Matching Agent", "Roadmap Generation Agent", "Resource Recommendation Agent", "Performance Analysis Agent", "AI Mentor Agent"), resolve any conflicts, and specify the single clearest nextAction and explanation.
`;

  const { data: orchData } = await callGeminiJson<{
    orchestratorSummary: string;
    nextAction: string;
    explanation: string;
    agentOutputs: AgentOutputRecord[];
  }>(
    'You are the ZyraTech Central AI Orchestrator. Coordinate all 6 specialized agents into a coherent, non-contradictory, explainable learning decision.',
    orchestratorPrompt,
    orchestratorSchema,
    () =>
      buildFallbackOrchestration(
        params.triggerEvent,
        career.title,
        compatibility?.compatibilityScore ?? 0,
        compatibility?.transferableSkills || [],
        assessedSkillName,
        assessedScore,
        weakConcepts,
        decayRisks.map((d) => d.skillName)
      )
  );

  const decisionId = uid('dec');
  db.prepare(`
    INSERT INTO ai_agent_decisions (
      id, user_id, trigger_event, orchestrator_summary, agent_outputs, next_action, explanation, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    decisionId,
    params.userId,
    params.triggerEvent,
    orchData.orchestratorSummary,
    JSON.stringify(orchData.agentOutputs),
    orchData.nextAction,
    orchData.explanation,
    now
  );

  if (params.triggerEvent === 'ASSESSMENT_SUBMITTED' || params.triggerEvent === 'CAREER_GOAL_CHANGED') {
    db.prepare(`
      INSERT INTO mentor_conversations (id, user_id, role, content, context_tag, created_at)
      VALUES (?, ?, 'assistant', ?, ?, ?)
    `).run(
      uid('msg'),
      params.userId,
      `${orchData.orchestratorSummary}\n\nNext Recommended Action: ${orchData.nextAction}\n\nWhy: ${orchData.explanation}`,
      params.triggerEvent.toLowerCase(),
      now
    );
  }

  return {
    id: decisionId,
    userId: params.userId,
    triggerEvent: params.triggerEvent,
    orchestratorSummary: orchData.orchestratorSummary,
    agentOutputs: orchData.agentOutputs,
    nextAction: orchData.nextAction,
    explanation: orchData.explanation,
    createdAt: now,
  };
}

// ============================================================================
// AGENT 6: AI MENTOR AGENT (STRICT EDUCATIONAL GUARDRAIL + MULTILINGUAL)
// ============================================================================
function isNonEducationalOrInappropriate(message: string): { blocked: boolean; reason?: string } {
  const low = message.toLowerCase();

  // Explicit inappropriate / unsafe topics
  const inappropriatePattern =
    /\b(porn|nsfw|sex|nude|erotic|dating advice|flirt|girlfriend|boyfriend|gamble|casino|betting|weed|cocaine|heroin|suicide|self-harm|bomb|weapon|ddos someone|hack my ex|steal password|crack wifi|pirate movie|cheating in exam|bypass proctor)\b/i;
  if (inappropriatePattern.test(low)) {
    return {
      blocked: true,
      reason: 'inappropriate or unsafe content',
    };
  }

  // Clearly off-topic entertainment / non-academic chatter when no educational keywords are present
  const offTopicPattern =
    /\b(bollywood|hollywood|movie review|gossip|astrology|horoscope|zodiac|cricket score|ipl match|recipe for|cook biryani|celebrity|tinder|meme|video game cheat|gta|valorant rank|lottery)\b/i;
  const eduSignalPattern =
    /\b(code|coding|program|python|javascript|typescript|react|node|sql|html|css|docker|kubernetes|security|owasp|network|linux|algorithm|data structure|career|job|interview|resume|syllabus|course|study|studies|exam|assessment|roadmap|project|debug|error|function|database|api|ml|ai|math|statistics|probability|learn|skill|degree|university)\b/i;

  if (offTopicPattern.test(low) && !eduSignalPattern.test(low)) {
    return {
      blocked: true,
      reason: 'non-educational topic',
    };
  }

  return { blocked: false };
}

export async function runAIMentorChat(params: {
  userId: string;
  message: string;
  companionMode?: 'english' | 'tamil' | 'tanglish';
}): Promise<{ reply: string; usedGemini: boolean; refused?: boolean }> {
  const user = getUserById(params.userId);
  const profile = getLearnerProfile(params.userId);
  const skills = getLearnerSkills(params.userId);
  const roadmap = getActiveRoadmap(params.userId);
  const history = getMentorHistory(params.userId).slice(-8);
  const syllabus = getUpcomingSyllabusRecommendations(params.userId);
  const langInstruction = getUserLanguageInstruction(params.userId);

  const mode = params.companionMode;
  const companionLangInstruction =
    mode === 'tanglish'
      ? 'Respond naturally in warm, student-friendly Tanglish (Tamil words written naturally in English/Latin script mixed with crisp English technical terms, e.g. "Kalakkal progress da!", "Indha concept-a step-by-step paapom"). Keep code/APIs accurate.'
      : mode === 'tamil'
        ? 'Respond warmly in natural Tamil (தமிழ்) while keeping code syntax, APIs, and course codes in English script.'
        : langInstruction;

  const recentAssessments = db
    .prepare(
      'SELECT title, skill_name, score, weak_concepts, feedback FROM skill_assessments WHERE user_id = ? AND status = ? ORDER BY completed_at DESC LIMIT 3'
    )
    .all(params.userId, 'completed') as Array<Record<string, unknown>>;
  const latestDecision = db
    .prepare('SELECT orchestrator_summary, next_action, explanation FROM ai_agent_decisions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(params.userId) as Record<string, unknown> | undefined;
  const recentFailures = db
    .prepare("SELECT skill_name, concept_tag, occurrence_count, status FROM failure_dna_records WHERE user_id = ? AND status != 'recovered' LIMIT 4")
    .all(params.userId) as Array<Record<string, unknown>>;
  const recentSims = db
    .prepare('SELECT title, sim_kind, overall_score FROM workplace_simulations WHERE user_id = ? AND status = ? ORDER BY completed_at DESC LIMIT 2')
    .all(params.userId, 'completed') as Array<Record<string, unknown>>;

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO mentor_conversations (id, user_id, role, content, context_tag, created_at)
    VALUES (?, ?, 'user', ?, ?, ?)
  `).run(uid('msg'), params.userId, params.message, mode ? `companion_${mode}` : 'chat', now);

  const guardCheck = isNonEducationalOrInappropriate(params.message);
  if (guardCheck.blocked) {
    const refusalReply =
      mode === 'tanglish'
        ? 'Nanba, naan Zyra — unga ZyraTech AI Career Companion! Career guidance, coding, syllabus, and learning doubts matum dhan naan help panna mudiyum. Indha inappropriate/off-topic vishayatha skip pannitu, unga coding or career path pathi kelunga!'
        : 'I am Zyra, your ZyraTech Living AI Companion, restricted strictly to educational purposes — career guidance, coding, debugging, university courses, simulations, and study strategies. I cannot assist with inappropriate or non-educational topics. Please ask a study, coding, or career question instead.';
    db.prepare(`
      INSERT INTO mentor_conversations (id, user_id, role, content, context_tag, created_at)
      VALUES (?, ?, 'assistant', ?, 'guardrail_refusal', ?)
    `).run(uid('msg'), params.userId, refusalReply, new Date().toISOString());
    return { reply: refusalReply, usedGemini: false, refused: true };
  }

  const systemInstruction = `
You are Zyra — the Living AI Career Companion & Agent 6 inside ZyraTech ("Discover Your Skills. Experience Your Future.").
Personality: Warm, encouraging, observant friend and senior mentor who remembers ${user?.fullName || 'the student'}'s real learning history, celebrates wins genuinely, and lifts them up after low scores or proctoring setbacks.
${companionLangInstruction}

STRICT SCOPE GUARDRAIL (MANDATORY):
You MUST ONLY answer questions related to career guidance, coding/programming, academic studies, university courses, workplace simulations, Failure DNA recovery, interviews, and educational topics.
If the user asks about ANY inappropriate content (NSFW, dating, illegal acts, cheating/bypassing proctoring, violence) OR non-educational topics (movies, celebrity gossip, sports betting, horoscopes, unrelated casual chit-chat), start your response with "[OUT_OF_SCOPE]" followed by a polite 2-sentence refusal.

Companion Behavior Rules:
- Reference the student's actual progress/achievements or Failure DNA naturally when relevant so they feel remembered and supported.
- Celebrate high scores/projects warmly, and encourage after low scores without shaming.
- Give hints and guiding questions BEFORE revealing full coding solutions when debugging.
- Map new concepts onto skills the student already excels at.
- Keep responses focused, clear, and practical (under 240 words unless asked for a deep walkthrough).

Remembered Learner History:
- Name: ${user?.fullName ?? 'Student'} (Streak: ${profile?.streakDays ?? 1} days)
- Target Career: ${roadmap?.careerTitle ?? profile?.targetCareerId ?? 'Full Stack Developer'} (Compatibility: ${roadmap?.compatibilityScore ?? 0}%)
- Learning Style: ${profile?.preferredLearningStyle ?? 'interactive_coding'} (${profile?.dailyLearningMinutes ?? 60} min/day)
- Skill DNA: ${skills.map((s) => `${s.skillName} ${s.verifiedScore}% [${s.verificationStatus}]`).join(' | ')}
- Active Failure DNA Patterns: ${JSON.stringify(recentFailures)}
- Recent Workplace Simulations: ${JSON.stringify(recentSims)}
- Upcoming Syllabus Modules: ${syllabus.map((s) => `${s.courseCode} ${s.moduleCode}: ${s.recommendedModuleTitle}`).join(' | ') || 'None'}
- Recent Assessments: ${JSON.stringify(recentAssessments)}
- Latest Orchestrator Decision: ${JSON.stringify(latestDecision || {})}
`;

  const ai = getGeminiClient();
  let reply = '';
  let usedGemini = false;
  let refused = false;

  if (ai) {
    try {
      const conversationText = history
        .map((m) => `${m.role === 'user' ? 'Learner' : 'Zyra'}: ${m.content}`)
        .join('\n');
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: `${conversationText}\nLearner: ${params.message}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      const raw = (response.text ?? '').trim();
      if (raw.startsWith('[OUT_OF_SCOPE]')) {
        refused = true;
        reply = raw.replace('[OUT_OF_SCOPE]', '').trim();
      } else {
        reply = raw;
      }
      usedGemini = Boolean(reply);
    } catch (err) {
      console.error('AI Companion Gemini error:', err);
    }
  }

  if (!reply) {
    const weakest = [...skills].sort((a, b) => a.verifiedScore - b.verifiedScore)[0];
    const strongest = [...skills].sort((a, b) => b.verifiedScore - a.verifiedScore)[0];
    const firstName = user?.fullName?.split(' ')[0] || 'friend';
    if (mode === 'tanglish') {
      reply = `Vanakkam ${firstName}! Naan Zyra, unga ZyraTech AI Companion. Unga Skill DNA paarkum podhu ${strongest?.skillName || 'Python'} (${strongest?.verifiedScore || 80}%) romba strong-aa irukku — super! Ippo ${weakest?.skillName || 'JavaScript'} (${weakest?.verifiedScore || 20}%) boost panna ${strongest?.skillName || 'Python'} logic maariye step-by-step input -> transform -> output panni test pannunga. ${recentFailures[0] ? `Failure DNA alert: "${String(recentFailures[0].concept_tag)}"-a Reverse Teaching-la explain panni clear pannalam!` : 'Next Workday Simulation try pannunga!'}`;
    } else if (mode === 'tamil') {
      reply = `வணக்கம் ${firstName}! நான் Zyra — உங்கள் ZyraTech கற்றல் தோழி. உங்கள் ${strongest?.skillName || 'Python'} (${strongest?.verifiedScore || 80}%) திறன் சிறப்பாக உள்ளது! அடுத்ததாக ${weakest?.skillName || 'JavaScript'} (${weakest?.verifiedScore || 20}%) மேம்படுத்த, சிறிய input -> transform -> output படிகளாகப் பிரித்துப் பயிற்சி செய்யுங்கள். ${syllabus[0] ? `பரிந்துரைக்கப்பட்ட பாடம்: ${syllabus[0].courseCode} (${syllabus[0].recommendedModuleTitle}).` : ''}`;
    } else {
      reply = `Hey ${firstName}! I'm Zyra, your ZyraTech Companion. Looking at your journey, your ${strongest?.skillName || 'Python'} foundation (${strongest?.verifiedScore || 80}%) is already strong, and ${weakest?.skillName || 'JavaScript'} (${weakest?.verifiedScore || 20}%) is your next big unlock for ${roadmap?.careerTitle || 'your target career'}.\n\nHint to move forward: Break the task into small input -> transform -> output steps just like ${strongest?.skillName || 'Python'}, and test edge cases one by one. ${recentFailures[0] ? `Tip: Let's clear your active Failure DNA pattern on "${String(recentFailures[0].concept_tag)}" via Reverse Teaching!` : syllabus[0] ? `Recommended Module: ${syllabus[0].courseCode} (${syllabus[0].recommendedModuleTitle}).` : ''}`;
    }
  }

  db.prepare(`
    INSERT INTO mentor_conversations (id, user_id, role, content, context_tag, created_at)
    VALUES (?, ?, 'assistant', ?, ?, ?)
  `).run(uid('msg'), params.userId, reply, refused ? 'guardrail_refusal' : 'chat', new Date().toISOString());

  return { reply, usedGemini, refused };
}

// ============================================================================
// DOMAIN-SCOPED EDUCATIONAL DOUBT ASSISTANT (POPUP — NON-TEST PAGES ONLY)
// ============================================================================
export async function runDomainDoubtAssistant(params: {
  userId: string;
  domain: string;
  question: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{ reply: string; domain: string; usedGemini: boolean; refused?: boolean }> {
  const domain = params.domain.trim() || 'Full-Stack Web Development';
  const question = params.question.trim();
  const profile = getLearnerProfile(params.userId);
  const skills = getLearnerSkills(params.userId);
  const career = profile ? getCareerById(profile.targetCareerId) : null;
  const langInstruction = getUserLanguageInstruction(params.userId);

  const guardCheck = isNonEducationalOrInappropriate(question);
  if (guardCheck.blocked) {
    return {
      domain,
      usedGemini: false,
      refused: true,
      reply: `ZyraTech Doubt Solver is restricted strictly to educational doubts in your selected domain (${domain}). I cannot respond to inappropriate, unsafe, or non-academic topics. Please ask a concept, coding, syllabus, or project question in ${domain}.`,
    };
  }

  const ai = getGeminiClient();
  const conversationText = (params.history || [])
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`)
    .join('\n');

  if (ai) {
    try {
      const systemInstruction = `
You are ZyraTech Domain Doubt Assistant.
${langInstruction}
Selected Educational Domain: "${domain}"
Student Target Career: ${career?.title ?? 'Software Engineering'}
Student Verified Skills: ${skills.map((s) => `${s.skillName} (${s.verifiedScore}%)`).join(', ') || 'Foundational'}

STRICT EDUCATIONAL & DOMAIN RULES:
1. Answer ONLY educational, technical, syllabus, coding, or career-study doubts within "${domain}".
2. If the student asks anything inappropriate, NSFW, unsafe, exam-cheating, or completely non-educational (movies, gossip, betting, horoscopes, random entertainment), start your reply with "[OUT_OF_SCOPE]" and refuse politely in 2 sentences.
3. If the student asks an educational question from an unrelated domain, briefly state your active domain is "${domain}" and either bridge the concept cleanly to "${domain}" or invite them to switch the domain selector.
4. Explain clearly in under 190 words with a concise example or snippet when helpful. Do not invent fake URLs.
`;
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: `${conversationText ? `${conversationText}\n` : ''}Student (${domain} doubt): ${question}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      const raw = (response.text ?? '').trim();
      if (raw.startsWith('[OUT_OF_SCOPE]')) {
        return {
          domain,
          usedGemini: true,
          refused: true,
          reply: raw.replace('[OUT_OF_SCOPE]', '').trim(),
        };
      }
      if (raw) {
        return { domain, usedGemini: true, refused: false, reply: raw };
      }
    } catch (err) {
      console.error('Domain Doubt Assistant Gemini error:', err);
    }
  }

  // Deterministic educational fallback scoped to selected domain
  const qLow = question.toLowerCase();
  let domainHint = `In ${domain}, break the concept into input validation, core state/logic transformation, and output verification.`;
  if (domain.toLowerCase().includes('sql') || qLow.includes('sql') || qLow.includes('join')) {
    domainHint =
      'In SQL & Databases, use parameterized queries (`WHERE id = ?`) to block SQL injection, choose `INNER JOIN` when both tables must match vs `LEFT JOIN` to keep unmatched left rows, and inspect `EXPLAIN` plans on indexed filter columns.';
  } else if (domain.toLowerCase().includes('python') || qLow.includes('python')) {
    domainHint =
      'In Python & DSA, prefer `dict`/`set` lookups (`O(1)` average) over nested loops (`O(n^2)`), validate boundary inputs early, and use list comprehensions or `collections.Counter` for clean readable transformations.';
  } else if (domain.toLowerCase().includes('react') || domain.toLowerCase().includes('javascript') || qLow.includes('react') || qLow.includes('async')) {
    domainHint =
      'In JavaScript & React, treat state as immutable (use `.map`/`.filter` or spread), always `await` async promises inside `try/catch`, and keep `useEffect` dependency arrays exact to prevent stale closures or infinite renders.';
  } else if (domain.toLowerCase().includes('security') || domain.toLowerCase().includes('cyber')) {
    domainHint =
      'In Cybersecurity & Networking, apply defense-in-depth: strict input schema validation, least-privilege IAM/session cookies (`HttpOnly`, `SameSite=Lax`), parameterized DB access, and TLS verification across boundaries.';
  } else if (domain.toLowerCase().includes('cloud') || domain.toLowerCase().includes('docker')) {
    domainHint =
      'In Cloud & DevOps, keep containers stateless and minimal (multi-stage Docker builds, non-root user), externalize config via environment variables, and verify readiness with explicit healthcheck endpoints.';
  } else if (domain.toLowerCase().includes('data') || domain.toLowerCase().includes('ai') || domain.toLowerCase().includes('ml')) {
    domainHint =
      'In Data Science & AI, split train/validation/test sets BEFORE scaling or feature encoding to prevent data leakage, inspect class balance, and track precision/recall alongside accuracy.';
  }

  return {
    domain,
    usedGemini: false,
    refused: false,
    reply: `**${domain} Study Guidance:** ${domainHint}\n\nTo clarify "${question.slice(0, 80)}${question.length > 80 ? '...' : ''}", write a minimal 5-line test case in the Practice Workplace or ask a follow-up question on the specific step you want broken down.`,
  };
}

// ============================================================================
// RESUME PARSER & PROJECT VERIFIER & MOCK INTERVIEW
// ============================================================================
export async function parseResumeWithAI(resumeText: string) {
  const schema = {
    type: Type.OBJECT,
    properties: {
      fullName: { type: Type.STRING },
      educationLevel: { type: Type.STRING },
      institution: { type: Type.STRING },
      workExperience: { type: Type.STRING },
      technicalSkills: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            skillName: { type: Type.STRING },
            estimatedScore: { type: Type.INTEGER },
          },
          required: ['skillName', 'estimatedScore'],
        },
      },
      nonTechnicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
      certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
      projects: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['title', 'description', 'technologies'],
        },
      },
    },
    required: ['technicalSkills', 'nonTechnicalSkills', 'certifications', 'projects'],
  };

  const { data } = await callGeminiJson(
    'Extract structured learner competencies from resume text conservatively. Never inflate estimatedScore above 85 for unverified resume text.',
    `Parse this resume into structured fields:\n\n${resumeText}`,
    schema,
    () => {
      const known = ['Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'HTML', 'CSS', 'Docker', 'Linux & Shell'];
      const found = known
        .filter((k) => resumeText.toLowerCase().includes(k.toLowerCase().split(' ')[0]))
        .map((k) => ({ skillName: k, estimatedScore: 55 }));
      return {
        fullName: '',
        educationLevel: 'Undergraduate / Graduate',
        institution: '',
        workExperience: resumeText.slice(0, 220),
        technicalSkills: found.length ? found : [{ skillName: 'Python', estimatedScore: 40 }],
        nonTechnicalSkills: ['Communication', 'Problem Solving'],
        certifications: [],
        projects: [],
      };
    }
  );

  return data as {
    fullName?: string;
    educationLevel?: string;
    institution?: string;
    workExperience?: string;
    technicalSkills: Array<{ skillName: string; estimatedScore: number }>;
    nonTechnicalSkills: string[];
    certifications: string[];
    projects: Array<{ title: string; description: string; technologies: string[] }>;
  };
}

export async function verifyProjectWithAI(params: {
  userId: string;
  title: string;
  skillName: string;
  description: string;
  submissionNotes: string;
  repoOrDemoLink: string;
}) {
  const profile = getLearnerProfile(params.userId);
  const schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      feedback: { type: Type.STRING },
      verifiedConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
      nextImprovement: { type: Type.STRING },
    },
    required: ['score', 'feedback', 'verifiedConcepts', 'nextImprovement'],
  };

  const { data } = await callGeminiJson<{
    score: number;
    feedback: string;
    verifiedConcepts: string[];
    nextImprovement: string;
  }>(
    `You are Agent 1 (Skill Assessment Agent) performing Real-World Project Verification. Score conservatively (40-95) based on architectural specificity, edge-case handling, and proof in submissionNotes. ${getUserLanguageInstruction(params.userId)}`,
    `Evaluate this learner project submission for skill "${params.skillName}":
Title: ${params.title}
Description: ${params.description}
Implementation & Architecture Notes: ${params.submissionNotes}
Link: ${params.repoOrDemoLink || 'None provided'}`,
    schema,
    () => {
      const detailScore = Math.min(88, 52 + Math.floor(params.submissionNotes.length / 18));
      return {
        score: detailScore,
        feedback: `Project "${params.title}" demonstrates practical application of ${params.skillName}. Add automated tests and error boundary documentation to strengthen verification further.`,
        verifiedConcepts: [params.skillName, 'Practical Implementation'],
        nextImprovement: 'Include unit/integration tests and deployment instructions.',
      };
    }
  );

  const clampedScore = Math.max(35, Math.min(96, data.score));
  const now = new Date().toISOString();
  const projectId = uid('proj');

  db.prepare(`
    INSERT INTO learner_projects (
      id, user_id, title, skill_name, career_id, description, submission_notes,
      repo_or_demo_link, ai_verification_score, ai_feedback, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?)
  `).run(
    projectId,
    params.userId,
    params.title,
    params.skillName,
    profile?.targetCareerId || 'full-stack-developer',
    params.description,
    params.submissionNotes,
    params.repoOrDemoLink,
    clampedScore,
    `${data.feedback} Next step: ${data.nextImprovement}`,
    now
  );

  const existing = db
    .prepare('SELECT * FROM learner_skills WHERE user_id = ? AND LOWER(skill_name) = LOWER(?)')
    .get(params.userId, params.skillName) as Record<string, unknown> | undefined;

  if (existing) {
    const blended = Math.round(Math.max(Number(existing.verified_score), clampedScore * 0.92));
    db.prepare(`
      UPDATE learner_skills
      SET verified_score = ?, verification_status = 'project_verified',
          project_score = ?, practical_score = MAX(practical_score, ?),
          retention_score = MIN(98, retention_score + 15), last_practiced_at = ?,
          decay_risk = 'low', updated_at = ?
      WHERE id = ?
    `).run(blended, clampedScore, clampedScore, now, now, String(existing.id));
  } else {
    db.prepare(`
      INSERT INTO learner_skills (
        id, user_id, skill_name, category, self_declared_score, verified_score,
        verification_status, theory_score, practical_score, problem_solving_score,
        project_score, retention_score, last_practiced_at, decay_risk, weak_concepts, updated_at
      ) VALUES (?, ?, ?, 'Project', ?, ?, 'project_verified', ?, ?, ?, ?, 85, ?, 'low', '[]', ?)
    `).run(
      uid('skill'),
      params.userId,
      params.skillName,
      clampedScore,
      clampedScore,
      Math.round(clampedScore * 0.85),
      clampedScore,
      Math.round(clampedScore * 0.9),
      clampedScore,
      now,
      now
    );
  }

  db.prepare(`
    INSERT INTO progress_records (id, user_id, activity_type, skill_name, title, minutes_spent, score, recorded_at)
    VALUES (?, ?, 'project', ?, ?, 90, ?, ?)
  `).run(uid('pr'), params.userId, params.skillName, `Verified Project: ${params.title}`, clampedScore, now);

  await orchestrateLearningEvent({
    userId: params.userId,
    triggerEvent: 'PROJECT_VERIFIED',
    context: { skillName: params.skillName, score: clampedScore, projectTitle: params.title },
  });

  return { projectId, score: clampedScore, feedback: data.feedback };
}

export async function startMockInterviewSession(params: {
  userId: string;
  careerId: string;
  interviewType: 'technical' | 'coding' | 'behavioral' | 'career_specific';
}) {
  const career = getCareerById(params.careerId) || getAllCareers()[0];
  const skills = getLearnerSkills(params.userId);
  const ai = getGeminiClient();
  const langInstruction = getUserLanguageInstruction(params.userId);

  let openingQuestion = `Welcome to your ${params.interviewType.replace('_', ' ')} interview for ${career.title}. Let's start with a core scenario: how would you design and validate a feature that uses ${career.requirements[0]?.skillName || 'SQL'} and ${career.requirements[2]?.skillName || 'JavaScript'} while handling edge-case failures?`;

  if (ai) {
    try {
      const resp = await ai.models.generateContent({
        model: MODEL,
        contents: `Start a ${params.interviewType} mock interview for the role "${career.title}". Candidate skills: ${skills.map((s) => `${s.skillName} (${s.verifiedScore}%)`).join(', ')}. Ask a single, sharp opening interview question tailored to this role and interview type.`,
        config: {
          systemInstruction: `You are a senior engineering interviewer. Ask 1 concise, realistic question. ${langInstruction}`,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      if (resp.text?.trim()) openingQuestion = resp.text.trim();
    } catch {
      // use fallback
    }
  }

  const messages: MockInterviewMessage[] = [
    { role: 'interviewer', content: openingQuestion, timestamp: new Date().toISOString() },
  ];
  const id = uid('int');
  db.prepare(`
    INSERT INTO mock_interviews (id, user_id, career_id, interview_type, messages, evaluation, readiness_score, status, created_at)
    VALUES (?, ?, ?, ?, ?, NULL, NULL, 'active', ?)
  `).run(id, params.userId, career.id, params.interviewType, JSON.stringify(messages), new Date().toISOString());

  return { id, careerId: career.id, interviewType: params.interviewType, messages, status: 'active' };
}

export async function handleMockInterviewTurn(params: {
  userId: string;
  interviewId: string;
  answer: string;
  eyeContactScore?: number;
  screenFocusScore?: number;
}) {
  const row = db
    .prepare('SELECT * FROM mock_interviews WHERE id = ? AND user_id = ?')
    .get(params.interviewId, params.userId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Interview session not found');

  const career = getCareerById(String(row.career_id)) || getAllCareers()[0];
  const messages: MockInterviewMessage[] = JSON.parse(String(row.messages || '[]'));
  messages.push({ role: 'candidate', content: params.answer, timestamp: new Date().toISOString() });

  const turnCount = messages.filter((m) => m.role === 'candidate').length;
  const ai = getGeminiClient();
  const langInstruction = getUserLanguageInstruction(params.userId);

  if (turnCount >= 3) {
    const evalSchema = {
      type: Type.OBJECT,
      properties: {
        technicalAccuracy: { type: Type.INTEGER },
        problemSolvingApproach: { type: Type.INTEGER },
        explanationQuality: { type: Type.INTEGER },
        communicationStructure: { type: Type.INTEGER },
        responseClarityIndicator: { type: Type.INTEGER },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvementAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
        summary: { type: Type.STRING },
      },
      required: [
        'technicalAccuracy',
        'problemSolvingApproach',
        'explanationQuality',
        'communicationStructure',
        'responseClarityIndicator',
        'strengths',
        'improvementAreas',
        'summary',
      ],
    };

    const { data } = await callGeminiJson<Omit<MockInterviewEvaluation, 'disclaimer' | 'eyeContactScore' | 'screenFocusScore'>>(
      `Evaluate this mock interview transcript rigorously. Note: responseClarityIndicator reflects linguistic structure and decisiveness in text responses only, NOT psychological confidence. ${langInstruction}`,
      `Role: ${career.title}\nType: ${String(row.interview_type)}\nTranscript:\n${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}`,
      evalSchema,
      () => {
        const avgLen =
          messages.filter((m) => m.role === 'candidate').reduce((acc, m) => acc + m.content.length, 0) /
          Math.max(1, turnCount);
        const base = Math.min(88, Math.max(48, Math.round(45 + avgLen / 8)));
        return {
          technicalAccuracy: base,
          problemSolvingApproach: Math.min(92, base + 3),
          explanationQuality: base,
          communicationStructure: Math.max(50, base - 2),
          responseClarityIndicator: base,
          strengths: ['Structured response sequence', 'Addressed core scenario directly'],
          improvementAreas: ['Include concrete latency/security tradeoffs and edge-case validation'],
          summary: `Candidate completed a 3-turn ${String(row.interview_type)} interview for ${career.title}.`,
        };
      }
    );

    const eyeScore =
      typeof params.eyeContactScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(params.eyeContactScore)))
        : undefined;
    const screenScore =
      typeof params.screenFocusScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(params.screenFocusScore)))
        : undefined;

    const strengths = [...data.strengths];
    const improvements = [...data.improvementAreas];
    if (eyeScore !== undefined) {
      if (eyeScore >= 75) {
        strengths.push(`Steady camera eye alignment (${eyeScore}%)`);
      } else {
        improvements.push(`Maintain camera eye contact (${eyeScore}% detected) to project stronger interview presence`);
      }
    }
    if (screenScore !== undefined && screenScore < 85) {
      improvements.push(`Avoid switching windows during interviews (screen focus ${screenScore}%)`);
    }

    const evaluation: MockInterviewEvaluation = {
      ...data,
      strengths,
      improvementAreas: improvements,
      eyeContactScore: eyeScore,
      screenFocusScore: screenScore,
      disclaimer:
        'Response clarity & camera-focus metrics evaluate presentation alignment and structure only; they do not measure psychological state.',
    };

    const baseReadiness =
      (evaluation.technicalAccuracy +
        evaluation.problemSolvingApproach +
        evaluation.explanationQuality +
        evaluation.communicationStructure +
        evaluation.responseClarityIndicator) /
      5;
    const presenceAdj =
      eyeScore !== undefined && screenScore !== undefined
        ? (eyeScore * 0.5 + screenScore * 0.5 - 75) * 0.08
        : 0;
    const readinessScore = Math.max(20, Math.min(99, Math.round(baseReadiness + presenceAdj)));

    messages.push({
      role: 'interviewer',
      content: `Thank you — that concludes the interview. Your Interview Readiness Report (${readinessScore}/100) has been generated below.`,
      timestamp: new Date().toISOString(),
    });

    db.prepare(`
      UPDATE mock_interviews
      SET messages = ?, evaluation = ?, readiness_score = ?, status = 'completed'
      WHERE id = ?
    `).run(JSON.stringify(messages), JSON.stringify(evaluation), readinessScore, params.interviewId);

    db.prepare(`
      INSERT INTO progress_records (id, user_id, activity_type, skill_name, title, minutes_spent, score, recorded_at)
      VALUES (?, ?, 'interview', ?, ?, 25, ?, ?)
    `).run(uid('pr'), params.userId, career.title, `${String(row.interview_type)} Mock Interview`, readinessScore, new Date().toISOString());

    return { id: params.interviewId, messages, evaluation, readinessScore, status: 'completed' };
  }

  let followUp = `Good start. Follow-up (${turnCount}/3): How would you test or debug that approach if unexpected malformed input or high concurrency occurred in production?`;
  if (ai) {
    try {
      const resp = await ai.models.generateContent({
        model: MODEL,
        contents: `Continue this ${String(row.interview_type)} interview for ${career.title}. Transcript:\n${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}\nAsk one probing follow-up question (${turnCount + 1} of 3).`,
        config: {
          systemInstruction: `You are a senior technical interviewer. Ask one concise follow-up question probing depth or edge cases. ${langInstruction}`,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      if (resp.text?.trim()) followUp = resp.text.trim();
    } catch {
      // keep fallback
    }
  }

  messages.push({ role: 'interviewer', content: followUp, timestamp: new Date().toISOString() });
  db.prepare('UPDATE mock_interviews SET messages = ? WHERE id = ?').run(JSON.stringify(messages), params.interviewId);

  return { id: params.interviewId, messages, evaluation: null, readinessScore: null, status: 'active' };
}

// ============================================================================
// FALLBACK HELPERS
// ============================================================================
function buildFallbackQuestions(
  skillName: string,
  difficulty: string,
  type: string,
  careerTitle = 'Software Engineering',
  currentScore = 0
) {
  const s = skillName.toLowerCase();
  const baseLogic = (concept: string) =>
    `Targets ${concept} at ${difficulty} depth because your current ${skillName} mastery (${currentScore}%) directly affects ${careerTitle} production tasks.`;

  if (type === 'project_coding') {
    return {
      questions: [
        {
          questionType: 'coding',
          prompt: `Daily Project Task 1 (${skillName}): Implement a production-ready validation & transformation function for a real ${careerTitle} project endpoint that rejects missing fields and never mutates input objects.`,
          codeSnippet: s.includes('sql')
            ? `-- Daily Project SQL Schema & Query\n-- Return top 5 active modules with verified completion counts\nSELECT ...`
            : `// Daily Project Coding Task 1 (${skillName})\nfunction handleProjectRecord(payload) {\n  // 1. Validate required fields\n  // 2. Return clean transformed object without mutation\n}`,
          options: [],
          correctAnswer: s.includes('sql')
            ? 'SELECT module_code, COUNT(*) AS completions FROM assessments WHERE status = ? GROUP BY module_code ORDER BY completions DESC LIMIT 5;'
            : 'Validate payload fields non-null/type first, throw or return error object if invalid, and return a new transformed object using return without mutating payload.',
          explanation: 'Real projects require explicit boundary validation and pure state updates before persistence.',
          careerLogic: baseLogic('Project Input Validation & Pure Data Flow'),
          conceptTag: `${skillName} Project Validation`,
        },
        {
          questionType: 'coding',
          prompt: `Daily Project Task 2 (${skillName}): Implement an async project data loader with try/catch error handling and HTTP response status verification.`,
          codeSnippet: `// Daily Project Coding Task 2\nasync function loadProjectMilestone(id) {\n  // TODO: await fetch, check res.ok, return parsed json inside try/catch\n}`,
          options: [],
          correctAnswer: 'Use async/await with fetch, check if (!res.ok) throw new Error(...), and wrap in try/catch to return a safe fallback or error.',
          explanation: 'Async project integrations fail silently unless both network errors (try/catch) and HTTP errors (!res.ok) are handled.',
          careerLogic: baseLogic('Project Async API Integration'),
          conceptTag: `${skillName} Async Integration`,
        },
        {
          questionType: 'debugging',
          prompt: `Daily Project Debug Task: Fix the bug in this project aggregation snippet that mutates shared state and misses error cases.`,
          codeSnippet: `function mergeProjectScores(base, incoming) {\n  for (const item of incoming) {\n    base.push(item);\n  }\n  return base;\n}`,
          options: [],
          correctAnswer: 'Return a new deduplicated array using [...base, ...incoming] or a Map/Set instead of mutating base directly.',
          explanation: 'Mutating caller arrays causes subtle UI and state synchronization bugs across project components.',
          careerLogic: baseLogic('Immutability & Bug Fixing'),
          conceptTag: `${skillName} State Debugging`,
        },
        {
          questionType: 'coding',
          prompt: `Daily Project Task 4: Write a utility in ${skillName} that aggregates completed module scores and returns an accurate rounded completion percentage.`,
          codeSnippet: `// Daily Project Metric Calculation\nfunction computeProjectCompletion(items) {\n  // Filter completed items and return rounded % (0-100)\n}`,
          options: [],
          correctAnswer: 'Guard empty array returning 0, filter completed items or sum scores, and return Math.round percentage safely.',
          explanation: 'Guarding division by zero and filtering explicitly guarantees accurate dashboard & project metrics.',
          careerLogic: baseLogic('Project Metrics & Edge Cases'),
          conceptTag: `${skillName} Project Logic`,
        },
        {
          questionType: 'mcq',
          prompt: `Before deploying your ${careerTitle} project assessment build, which security and reliability check is essential?`,
          codeSnippet: '',
          options: [
            'Validate all user inputs on the server, keep API keys in server env vars, and verify build + lint checks pass',
            'Hardcode secret keys directly inside client React components for convenience',
            'Skip input sanitization when the frontend form uses HTML required attributes',
            'Disable error handling so failed API requests silently hang',
          ],
          correctAnswer:
            'Validate all user inputs on the server, keep API keys in server env vars, and verify build + lint checks pass',
          explanation: 'Production project readiness requires server-side validation, secret isolation, and clean build verification.',
          careerLogic: baseLogic('Production Project Deployment'),
          conceptTag: `${skillName} Deployment Readiness`,
        },
      ],
    };
  }

  if (type === 'coding') {
    return {
      questions: [
        {
          questionType: 'coding',
          prompt: `Write a clean ${skillName} function or snippet (${difficulty}) that validates input parameters and returns a structured result without mutating caller inputs.`,
          codeSnippet: s.includes('sql')
            ? `-- Complete a parameterized query filtering active records\nSELECT id, name FROM students WHERE ...`
            : `// Implement input validation & pure transformation in ${skillName}\nfunction processItem(input) {\n  // TODO\n}`,
          options: [],
          correctAnswer: s.includes('sql')
            ? 'SELECT id, name FROM students WHERE status = ? ORDER BY id;'
            : 'Validate input non-null/type first, throw explicit error on invalid input, return new transformed object without mutating input.',
          explanation: `Always validate boundaries before transforming state and avoid unintended side effects.`,
          careerLogic: baseLogic('Input Validation & Pure Logic'),
          conceptTag: `${skillName} Applied Coding`,
        },
        {
          questionType: 'debugging',
          prompt: `Identify the concurrency/async bug in this ${skillName} snippet and describe the corrected code.`,
          codeSnippet: `async function fetchProfile(id) {\n  const res = fetch('/api/student/' + id);\n  return res.json();\n}`,
          options: [],
          correctAnswer: 'Await fetch() and handle non-OK HTTP responses before parsing JSON.',
          explanation: 'Missing await causes res to be a Promise rather than a Response object; wrap with await and check res.ok.',
          careerLogic: baseLogic('Async Execution & Error Handling'),
          conceptTag: `${skillName} Debugging`,
        },
        {
          questionType: 'coding',
          prompt: `Implement a ${difficulty} algorithm in ${skillName} to deduplicate an array of records by \`id\` while preserving first-seen order.`,
          codeSnippet: `// Deduplicate items by item.id in O(n) time`,
          options: [],
          correctAnswer: 'Use a Set to track seen ids in a single O(n) pass and append unseen records to a result array.',
          explanation: 'Tracking seen IDs in a Set/Map gives O(n) time complexity instead of nested O(n^2) loops.',
          careerLogic: baseLogic('Algorithmic Complexity'),
          conceptTag: `${skillName} Data Structures`,
        },
        {
          questionType: 'coding',
          prompt: `Write a defensive guard in ${skillName} to prevent injection or malformed payload crashes when parsing JSON user input.`,
          codeSnippet: `function parsePayload(rawText) {\n  // Guard JSON.parse + validate shape\n}`,
          options: [],
          correctAnswer: 'Wrap JSON.parse in try/catch, validate required fields/types, and return sanitized data or an explicit error.',
          explanation: 'try/catch around JSON.parse prevents unhandled runtime exceptions; schema validation prevents downstream bugs.',
          careerLogic: baseLogic('Defensive Coding & Security'),
          conceptTag: `${skillName} Security Boundary`,
        },
        {
          questionType: 'conceptual',
          prompt: `Explain in 2-3 sentences how you would write an automated unit test verifying the ${skillName} functions above.`,
          codeSnippet: '',
          options: [],
          correctAnswer: 'Arrange valid + invalid edge-case inputs, act on the function, and assert expected outputs/errors deterministically.',
          explanation: 'Using the Arrange-Act-Assert pattern verifies both nominal paths and edge-case error handling.',
          careerLogic: baseLogic('Automated Verification'),
          conceptTag: `${skillName} Unit Testing`,
        },
      ],
    };
  }

  if (s.includes('javascript')) {
    return {
      questions: [
        {
          questionType: 'mcq',
          prompt: 'What does a closure preserve in JavaScript when an inner function is returned from an outer function?',
          codeSnippet: `function makeCounter() {\n  let count = 0;\n  return () => ++count;\n}\nconst next = makeCounter();\nconsole.log(next(), next());`,
          options: ['1 2', '0 1', '1 1', 'ReferenceError: count is not defined'],
          correctAnswer: '1 2',
          explanation: 'The returned arrow function retains lexical access to count inside makeCounter’s closure scope.',
          careerLogic: baseLogic('Closures & Lexical Scope'),
          conceptTag: 'Closures & Lexical Scope',
        },
        {
          questionType: 'debugging',
          prompt: 'Why does this async fetch helper log `Promise { <pending> }` instead of the parsed JSON?',
          codeSnippet: `function loadUser() {\n  const res = fetch('/api/user');\n  return res.json();\n}`,
          options: [
            'fetch() returns a Promise that must be awaited before calling .json()',
            'fetch() only works inside class constructors',
            'JSON.parse must be called manually on Response objects',
            'const cannot hold a Response object',
          ],
          correctAnswer: 'fetch() returns a Promise that must be awaited before calling .json()',
          explanation: 'Without async/await (or .then), res is a Promise rather than a resolved Response object.',
          careerLogic: baseLogic('Promises & Async/Await'),
          conceptTag: 'Promises & Async/Await',
        },
        {
          questionType: 'mcq',
          prompt: 'In what order do synchronous logs, microtasks (Promise.then), and macrotasks (setTimeout 0) execute in the JS Event Loop?',
          codeSnippet: '',
          options: [
            'Synchronous -> Microtasks -> Macrotasks',
            'Synchronous -> Macrotasks -> Microtasks',
            'Macrotasks -> Microtasks -> Synchronous',
            'Microtasks -> Synchronous -> Macrotasks',
          ],
          correctAnswer: 'Synchronous -> Microtasks -> Macrotasks',
          explanation: 'The event loop drains the call stack, then flushes the microtask queue before taking the next macrotask.',
          careerLogic: baseLogic('DOM Event Loop'),
          conceptTag: 'DOM Event Loop',
        },
        {
          questionType: 'mcq',
          prompt: 'Which array method returns a new array containing only elements that pass a predicate function without mutating the original array?',
          codeSnippet: '',
          options: ['Array.prototype.filter', 'Array.prototype.splice', 'Array.prototype.forEach', 'Array.prototype.reduceRight'],
          correctAnswer: 'Array.prototype.filter',
          explanation: 'filter() creates a shallow copy containing elements where the callback returns truthy.',
          careerLogic: baseLogic('Immutable Array Methods'),
          conceptTag: 'Immutable Array Methods',
        },
        {
          questionType: 'scenario',
          prompt: `At ${difficulty} level (${type}), why is event delegation attached to a parent container preferred for dynamic lists?`,
          codeSnippet: '',
          options: [
            'It uses a single listener via event bubbling and works for dynamically added items',
            'It prevents the browser from creating DOM nodes',
            'It bypasses CSS specificity rules',
            'It executes handlers on a separate Web Worker thread',
          ],
          correctAnswer: 'It uses a single listener via event bubbling and works for dynamically added items',
          explanation: 'Events bubble up to the container, reducing memory overhead and handling newly inserted children automatically.',
          careerLogic: baseLogic('DOM Event Delegation'),
          conceptTag: 'DOM Event Delegation',
        },
      ],
    };
  }

  return {
    questions: [
      {
        questionType: 'mcq',
        prompt: `Which practice best demonstrates production-grade ${skillName} competency (${difficulty})?`,
        codeSnippet: '',
        options: [
          `Validating inputs, handling failure modes, and writing modular ${skillName} logic`,
          'Ignoring error paths to minimize code length',
          'Hardcoding environment secrets inside client bundles',
          'Skipping automated verification checks',
        ],
        correctAnswer: `Validating inputs, handling failure modes, and writing modular ${skillName} logic`,
        explanation: `Production ${skillName} relies on input validation, explicit error handling, and testable modularity.`,
        careerLogic: baseLogic(`${skillName} Core Architecture`),
        conceptTag: `${skillName} Core Architecture`,
      },
      {
        questionType: 'conceptual',
        prompt: `In ${skillName}, what is the primary risk of coupling state mutation directly with external I/O without boundaries?`,
        codeSnippet: '',
        options: [
          'Race conditions, difficult debugging, and non-deterministic test failures',
          'Faster CPU execution at the cost of disk space',
          'Automatic type safety enforcement',
          'Zero impact on maintainability',
        ],
        correctAnswer: 'Race conditions, difficult debugging, and non-deterministic test failures',
        explanation: 'Isolating state transitions from external I/O ensures predictable behavior and testability.',
        careerLogic: baseLogic(`${skillName} State & I/O`),
        conceptTag: `${skillName} State & I/O`,
      },
      {
        questionType: 'debugging',
        prompt: `When troubleshooting a failing ${skillName} workflow in production, which diagnostic sequence is most effective?`,
        codeSnippet: '',
        options: [
          'Reproduce deterministically, inspect structured logs/inputs, isolate the failing boundary, add a regression test',
          'Restart the process repeatedly without reading logs',
          'Disable validation checks until the error disappears',
          'Rewrite the entire module from scratch immediately',
        ],
        correctAnswer: 'Reproduce deterministically, inspect structured logs/inputs, isolate the failing boundary, add a regression test',
        explanation: 'Systematic reproduction and boundary isolation prevent recurring regressions.',
        careerLogic: baseLogic(`${skillName} Debugging`),
        conceptTag: `${skillName} Debugging`,
      },
      {
        questionType: 'mcq',
        prompt: `Which security principle applies directly when building ${skillName} components?`,
        codeSnippet: '',
        options: [
          'Principle of least privilege and parameterized/validated boundaries',
          'Trusting all client-supplied payloads implicitly',
          'Storing plaintext credentials for faster lookup',
          'Exposing internal stack traces to end users',
        ],
        correctAnswer: 'Principle of least privilege and parameterized/validated boundaries',
        explanation: 'Least privilege and strict boundary validation minimize attack surface.',
        careerLogic: baseLogic(`${skillName} Security`),
        conceptTag: `${skillName} Security`,
      },
      {
        questionType: 'scenario',
        prompt: `How should ${skillName} performance bottlenecks be verified before optimizing?`,
        codeSnippet: '',
        options: [
          'Profile and measure baseline latency/throughput first, then target the verified bottleneck',
          'Optimize every loop prematurely without metrics',
          'Increase server memory indefinitely',
          'Remove error logging to save CPU cycles',
        ],
        correctAnswer: 'Profile and measure baseline latency/throughput first, then target the verified bottleneck',
        explanation: 'Measurement-driven profiling prevents wasted effort and accidental complexity.',
        careerLogic: baseLogic(`${skillName} Performance`),
        conceptTag: `${skillName} Performance`,
      },
    ],
  };
}

function buildFallbackOrchestration(
  triggerEvent: string,
  careerTitle: string,
  compatibilityScore: number,
  transferableSkills: string[],
  skillName: string | null,
  score: number | null,
  weakConcepts: string[],
  decaySkills: string[]
) {
  const isLow = score !== null && score < 55;
  const isHigh = score !== null && score >= 75;
  const summary =
    triggerEvent === 'CAREER_GOAL_CHANGED'
      ? `Recalculated career alignment for ${careerTitle} (${compatibilityScore}% compatibility) and preserved ${transferableSkills.length} transferable skills.`
      : isLow && skillName
        ? `Detected foundational difficulty in ${skillName} (${score}%). Paused dependent stages and generated beginner remediation.`
        : isHigh && skillName
          ? `Verified strong competency in ${skillName} (${score}%). Unlocked the next roadmap milestone.`
          : `Synchronized learner profile and roadmap for ${careerTitle} (${compatibilityScore}% compatibility).`;

  const nextAction =
    isLow && skillName
      ? `Review beginner ${skillName} resources on ${weakConcepts.join(', ') || 'core fundamentals'} and retake the assessment.`
      : `Continue your active ${careerTitle} roadmap stage and verify skills via assessment or project submission.`;

  const explanation =
    isLow && skillName
      ? `Performance Analysis Agent flagged ${skillName} at ${score}% (${weakConcepts.join(', ') || 'foundations'}). Roadmap Agent postponed advanced dependent modules until ${skillName} reaches >= 70%.`
      : `Career Matching Agent mapped verified skills (${transferableSkills.join(', ') || 'baseline'}) to ${careerTitle}, preserving prior progress without repetition.`;

  const agentOutputs: AgentOutputRecord[] = [
    {
      agentName: 'Skill Assessment Agent',
      summary: skillName && score !== null ? `Evaluated ${skillName} at ${score}% verified competency.` : 'Maintained verified Skill DNA baseline.',
      keyFindings: weakConcepts.length ? [`Weak concepts: ${weakConcepts.join(', ')}`] : ['No new unaddressed concept flags'],
      recommendations: [isLow ? `Assign foundational drills for ${skillName}` : 'Continue verifying remaining self-declared skills'],
    },
    {
      agentName: 'Career Matching Agent',
      summary: `Computed ${compatibilityScore}% compatibility for ${careerTitle}.`,
      keyFindings: [`Transferable verified skills: ${transferableSkills.join(', ') || 'None yet'}`],
      recommendations: [`Focus next on highest-weight gap for ${careerTitle}`],
    },
    {
      agentName: 'Roadmap Generation Agent',
      summary: isLow ? 'Inserted remediation gate and locked dependent modules.' : 'Updated milestone sequence for current career goal.',
      keyFindings: [`Active career path: ${careerTitle}`],
      recommendations: [nextAction],
    },
    {
      agentName: 'Resource Recommendation Agent',
      summary: isLow ? `Prioritized beginner-level interactive resources for ${skillName}.` : 'Aligned resources with learner preferred style.',
      keyFindings: ['Only verified external providers included'],
      recommendations: ['Use interactive practice alongside documentation'],
    },
    {
      agentName: 'Performance Analysis Agent',
      summary: decaySkills.length ? `Flagged learning decay risk on: ${decaySkills.join(', ')}.` : 'Learning consistency within nominal range.',
      keyFindings: [decaySkills.length ? `Retention review needed for ${decaySkills.join(', ')}` : 'Active progress recorded'],
      recommendations: [decaySkills.length ? `Schedule 15-min spaced revision for ${decaySkills[0]}` : 'Maintain daily streak'],
    },
    {
      agentName: 'AI Mentor Agent',
      summary: 'Updated contextual mentoring guidance to reflect the latest orchestrator state.',
      keyFindings: ['Ready to explain weak concepts or roadmap changes'],
      recommendations: ['Ask AI Mentor for step-by-step hints before retrying assessments'],
    },
  ];

  return { orchestratorSummary: summary, nextAction, explanation, agentOutputs };
}

function syncFailureDNAFromAssessmentRecord(
  userId: string,
  skillName: string,
  weakConcepts: string[],
  score: number,
  now: string
): void {
  const hasCompletedRevision = Boolean(
    db
      .prepare("SELECT id FROM revision_schedules WHERE user_id = ? AND LOWER(skill_name) = LOWER(?) AND status = 'completed' LIMIT 1")
      .get(userId, skillName)
  );

  for (const concept of weakConcepts) {
    const existing = db
      .prepare('SELECT * FROM failure_dna_records WHERE user_id = ? AND LOWER(skill_name) = LOWER(?) AND LOWER(concept_tag) = LOWER(?)')
      .get(userId, skillName, concept) as Record<string, unknown> | undefined;

    if (existing) {
      const nextCount = Number(existing.occurrence_count || 1) + 1;
      const repeatedAfter = hasCompletedRevision || existing.status === 'recovered' ? 1 : Number(existing.repeated_after_revision || 0);
      const pattern =
        repeatedAfter === 1
          ? 'post_revision_repeat'
          : nextCount >= 2
            ? 'repeated_mistake'
            : 'misunderstood_concept';
      const nextStatus = existing.status === 'recovered' ? 'relapsed' : 'active';

      db.prepare(`
        UPDATE failure_dna_records
        SET occurrence_count = ?,
            repeated_after_revision = ?,
            failure_pattern = ?,
            status = ?,
            diagnostic_note = ?,
            last_detected_at = ?,
            resolved_at = NULL
        WHERE id = ?
      `).run(
        nextCount,
        repeatedAfter,
        pattern,
        nextStatus,
        repeatedAfter === 1
          ? `Repeated ${nextCount}x in ${skillName} (${concept}) even after revision intervention (${score}% latest).`
          : `Missed ${nextCount}x across ${skillName} assessments (${score}% latest).`,
        now,
        String(existing.id)
      );
    } else {
      const pattern = score < 50 ? 'problem_solving_failure' : 'misunderstood_concept';
      db.prepare(`
        INSERT INTO failure_dna_records (
          id, user_id, skill_name, concept_tag, failure_pattern, occurrence_count,
          repeated_after_revision, diagnostic_note, recovery_mission_title,
          recovery_mission_task, status, last_detected_at, resolved_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'active', ?, NULL)
      `).run(
        uid('fdna'),
        userId,
        skillName,
        concept,
        pattern,
        hasCompletedRevision ? 1 : 0,
        `Detected during ${skillName} assessment (${score}% score). Focus remediation needed on ${concept}.`,
        `Repair ${concept} in ${skillName}`,
        `1. Explain "${concept}" in Reverse Teaching Challenge using your own words.\n2. Solve 1 debugging task in ${skillName} focusing on ${concept}.\n3. Retake a targeted ${skillName} check to verify zero relapse.`,
        now
      );
    }
  }

  if (score >= 80) {
    const activeRows = db
      .prepare("SELECT id, concept_tag FROM failure_dna_records WHERE user_id = ? AND LOWER(skill_name) = LOWER(?) AND status != 'recovered'")
      .all(userId, skillName) as Array<{ id: string; concept_tag: string }>;
    const weakSet = new Set(weakConcepts.map((w) => w.toLowerCase()));
    for (const r of activeRows) {
      if (!weakSet.has(r.concept_tag.toLowerCase())) {
        db.prepare("UPDATE failure_dna_records SET status = 'recovered', resolved_at = ? WHERE id = ?").run(now, r.id);
      }
    }
  }
}
