import { Type } from '@google/genai';
import { db } from './db';
import { uid } from './seed';
import {
  computeCareerCompatibility,
  getActiveRoadmap,
  getAllCareers,
  getCareerById,
  getLearnerProfile,
  getLearnerSkills,
  getLearnerWorkspace,
} from './workspace';
import {
  callGeminiJson,
  getUserLanguageInstruction,
  orchestrateLearningEvent,
  verifyProjectWithAI,
} from './agents';
import type {
  CommunityMissionSubmission,
  CommunityMissionTemplate,
  ExpertCouncilMemberFinding,
  ExpertCouncilReport,
  FailureDNAItem,
  LearnerWorkspaceData,
  ParallelChallengeItem,
  ParallelRoleTaskResult,
  ReverseTeachingItem,
  SimulationRubricScores,
  SimulationTwistEvent,
  WorkplaceSimulationItem,
  WorkplaceSimulationStage,
} from '../src/types';

// ============================================================================
// B. CAREER UNIVERSE WORLDS & K. CAREER REALITY VS EXPECTATION CATALOG
// ============================================================================
export interface CareerWorldDescriptor {
  careerId: string;
  worldName: string;
  worldSubtitle: string;
  atmosphereTag: string;
  realisticDailyTasks: string[];
  practicalChallenges: string[];
  expectationMyth: string;
  dayToDayReality: string;
  communicationLoad: string;
  learningDifficultyCurve: string;
  expectationVsRealityRows: Array<{
    dimension: string;
    studentExpectation: string;
    industryReality: string;
  }>;
  expectationCheckQuestion: {
    prompt: string;
    options: string[];
    correctAnswer: string;
    insight: string;
  };
}

export const CAREER_UNIVERSE_WORLDS: CareerWorldDescriptor[] = [
  {
    careerId: 'full-stack-developer',
    worldName: 'The Architecture Foundry',
    worldSubtitle: 'Ship end-to-end APIs, resilient UIs, and production databases',
    atmosphereTag: 'Build · Debug · Deploy',
    realisticDailyTasks: [
      'Trace a failing checkout webhook across React client, Express API, and SQL constraints',
      'Design backward-compatible database migrations and paginated API responses',
      'Review pull requests for race conditions, input validation, and accessibility',
    ],
    practicalChallenges: [
      'Legacy code with missing tests under tight sprint deadlines',
      'Ambiguous product requirements from clients mid-sprint',
      'Production memory leaks or slow N+1 SQL queries during traffic spikes',
    ],
    expectationMyth: 'Writing greenfield React components all day with zero legacy bugs.',
    dayToDayReality:
      '70% reading logs, debugging edge cases, writing API contracts & tests, and aligning with PMs; 30% writing new features.',
    communicationLoad: 'High — daily standups, PR reviews, API contract syncs with designers & backend peers.',
    learningDifficultyCurve: 'Steep early (HTML/JS/React + SQL + APIs together), compounds fast once mental models click.',
    expectationVsRealityRows: [
      {
        dimension: 'Daily Work Mix',
        studentExpectation: '80% building shiny UI screens from scratch',
        industryReality: '60% debugging state/API bugs, refactoring, and writing defensive tests',
      },
      {
        dimension: 'Technical Scope',
        studentExpectation: 'Know one framework syntax well',
        industryReality: 'Reason across browser state, network latency, auth cookies, SQL indexes, and error recovery',
      },
      {
        dimension: 'Collaboration',
        studentExpectation: 'Solo coding with headphones all day',
        industryReality: 'Constant negotiation with QA, designers, and stakeholders over trade-offs',
      },
    ],
    expectationCheckQuestion: {
      prompt: 'When an API latency spike happens in production right before a demo, what does a senior developer do first?',
      options: [
        'Check structured server logs, slow SQL queries, and recent deployments before editing code',
        'Rewrite the frontend framework from scratch',
        'Disable error logging to make requests faster',
        'Ignore it until the client notices',
      ],
      correctAnswer: 'Check structured server logs, slow SQL queries, and recent deployments before editing code',
      insight: 'Real-world engineering starts with observability and evidence, not blind rewrites.',
    },
  },
  {
    careerId: 'cybersecurity-analyst',
    worldName: 'The Sentinel Citadel',
    worldSubtitle: 'Hunt anomalies, triage suspicious logins, and contain live incidents',
    atmosphereTag: 'Detect · Triage · Contain',
    realisticDailyTasks: [
      'Inspect auth logs to distinguish credential stuffing from legitimate travel logins',
      'Audit Express/SQL endpoints for broken access control (IDOR) and injection gaps',
      'Draft incident containment timelines and actionable remediation tickets for engineers',
    ],
    practicalChallenges: [
      'Alert fatigue — separating 2 real threats from 500 benign log warnings',
      'Under-pressure containment decisions without knocking out legitimate customer traffic',
      'Explaining technical vulnerabilities clearly to non-technical executives',
    ],
    expectationMyth: 'Dramatic Hollywood terminal hacking in dark rooms.',
    dayToDayReality:
      'Systematic log correlation, threat modeling, patch verification, IAM audits, and calm incident documentation.',
    communicationLoad: 'Critical — clear escalation memos and blame-free remediation reports for developers.',
    learningDifficultyCurve: 'Broad fundamentals required (Networking + Linux + Web Auth + SQL) before specialized defense.',
    expectationVsRealityRows: [
      {
        dimension: 'Core Activity',
        studentExpectation: 'Running automated exploit tools non-stop',
        industryReality: 'Reading HTTP/Linux/auth logs, verifying CVEs, writing detection rules, and hardening configs',
      },
      {
        dimension: 'Mindset',
        studentExpectation: 'Find one flaw and celebrate',
        industryReality: 'Quantify blast radius, preserve forensic evidence, and verify fixes without breaking uptime',
      },
      {
        dimension: 'Communication',
        studentExpectation: 'Purely technical work in isolation',
        industryReality: 'Convincing product teams to prioritize security fixes over feature launches',
      },
    ],
    expectationCheckQuestion: {
      prompt: 'You spot 42 failed SSH logins followed by 1 successful root login from an unknown ASN at 03:12 UTC. First safe response?',
      options: [
        'Isolate/revoke the compromised session & rotate keys while preserving forensic logs for timeline review',
        'Delete the auth log file immediately so the dashboard looks clean',
        'Email the attacker asking who they are',
        'Wait 7 days to see if anything breaks',
      ],
      correctAnswer: 'Isolate/revoke the compromised session & rotate keys while preserving forensic logs for timeline review',
      insight: 'Incident response balances rapid containment with preserving forensic evidence.',
    },
  },
  {
    careerId: 'data-scientist',
    worldName: 'The Signal Observatory',
    worldSubtitle: 'Clean messy real-world datasets, validate models, and guide decisions',
    atmosphereTag: 'Clean · Model · Validate',
    realisticDailyTasks: [
      'Detect missing values, label leakage, and skewed distributions in raw operational CSVs/SQL tables',
      'Compare baseline logistic regression vs gradient boosting with precision/recall metrics',
      'Translate model trade-offs into business KPIs for product leadership',
    ],
    practicalChallenges: [
      '80% messy, inconsistent source data with silent schema drifts',
      'Models that look 98% accurate offline but fail on imbalanced real-world classes',
      'Stakeholders wanting magic answers without causal evidence',
    ],
    expectationMyth: 'Training deep neural networks on clean Kaggle datasets all day.',
    dayToDayReality:
      'SQL wrangling, data hygiene audits, statistical sanity checks, baseline modeling, and clear storytelling.',
    communicationLoad: 'High — explaining confidence intervals, false positives, and limitations to non-technical teams.',
    learningDifficultyCurve: 'Needs balanced Python + SQL + Statistics intuition to avoid silent data leakage mistakes.',
    expectationVsRealityRows: [
      {
        dimension: 'Time Breakdown',
        studentExpectation: '90% tuning deep learning hyperparameters',
        industryReality: '75% SQL extraction, cleaning anomalies, defining target labels, and error analysis',
      },
      {
        dimension: 'Success Metric',
        studentExpectation: 'Highest accuracy percentage wins',
        industryReality: 'Precision/recall under real class imbalance, calibration, and business impact',
      },
      {
        dimension: 'Deliverable',
        studentExpectation: 'A Jupyter notebook file',
        industryReality: 'Reproducible pipelines, monitored predictions, and clear stakeholder decision memos',
      },
    ],
    expectationCheckQuestion: {
      prompt: 'A fraud dataset has 99.5% legitimate and 0.5% fraudulent transactions. A naive model scores 99.5% accuracy. What happened?',
      options: [
        'It predicts "legitimate" every time; precision/recall on the minority fraud class is 0%',
        'The model is production-ready and perfect',
        'Increasing batch size fixes class imbalance automatically',
        'Accuracy is the only metric that matters in finance',
      ],
      correctAnswer: 'It predicts "legitimate" every time; precision/recall on the minority fraud class is 0%',
      insight: 'Real-world data science checks class imbalance and minority-class recall before celebrating accuracy.',
    },
  },
  {
    careerId: 'ui-ux-designer',
    worldName: 'The Human Craft Studio',
    worldSubtitle: 'Diagnose user drop-offs, enforce accessibility, and shape intuitive flows',
    atmosphereTag: 'Research · Prototype · Test',
    realisticDailyTasks: [
      'Audit a 5-step onboarding funnel where 40% of mobile users abandon on step 3',
      'Fix WCAG contrast failures, keyboard focus traps, and ambiguous error states',
      'Partner with frontend engineers to align design tokens, spacing, and responsive states',
    ],
    practicalChallenges: [
      'Balancing aesthetic polish against edge-case error, loading, and empty states',
      'Engineering constraints requiring simplified interaction patterns on tight deadlines',
      'Validating assumptions with actual user behavior instead of personal taste',
    ],
    expectationMyth: 'Picking pretty colors and gradients in Figma without technical constraints.',
    dayToDayReality:
      'User flow simplification, usability testing, accessible typography/contrast verification, and design systems.',
    communicationLoad: 'Very High — user interviews, engineering handoffs, and stakeholder critiques.',
    learningDifficultyCurve: 'Visual craft is quick to start; deep information architecture and accessibility mastery take rigor.',
    expectationVsRealityRows: [
      {
        dimension: 'Core Artifact',
        studentExpectation: 'Dribbble-style glossy concept shots',
        industryReality: 'End-to-end flows handling validation errors, slow networks, and screen readers',
      },
      {
        dimension: 'Decision Driver',
        studentExpectation: 'Personal visual preference',
        industryReality: 'Task completion rate, drop-off telemetry, cognitive load reduction, and WCAG AA compliance',
      },
      {
        dimension: 'Handoff',
        studentExpectation: 'Drop a static PNG and move on',
        industryReality: 'Iterate alongside developers on responsive breakpoints and interactive states',
      },
    ],
    expectationCheckQuestion: {
      prompt: 'Mobile users abandon your signup form at 44% on the verification step. What should your design review test first?',
      options: [
        'Inspect field friction, error copy clarity, input types, and step count using session flow evidence',
        'Add decorative floating animations behind the form',
        'Lower contrast to make the page look minimal',
        'Hide validation errors until submission finishes',
      ],
      correctAnswer: 'Inspect field friction, error copy clarity, input types, and step count using session flow evidence',
      insight: 'Product design treats user friction as an engineering and cognitive-load problem.',
    },
  },
  {
    careerId: 'ai-ml-engineer',
    worldName: 'The Inference Engine Bay',
    worldSubtitle: 'Deploy reliable AI pipelines, guardrails, latency budgets, and evals',
    atmosphereTag: 'Evaluate · Guardrail · Scale',
    realisticDailyTasks: [
      'Build automated evaluation harnesses to catch prompt regressions and hallucinations',
      'Add structured JSON validation and deterministic fallbacks around model inference',
      'Optimize token latency, retrieval precision, and cost per request',
    ],
    practicalChallenges: [
      'Non-deterministic model outputs breaking strict downstream JSON parsers',
      'Prompt injection or scope drift on user-facing assistants',
      'Balancing quality vs latency vs API budget at scale',
    ],
    expectationMyth: 'Just pasting a chat prompt and calling an API once.',
    dayToDayReality:
      'Evaluation suites, retrieval quality tuning, schema enforcement, fallback paths, and production monitoring.',
    communicationLoad: 'High — setting realistic accuracy expectations with product & compliance teams.',
    learningDifficultyCurve: 'Combines solid software engineering with ML evaluation discipline.',
    expectationVsRealityRows: [
      {
        dimension: 'Hardest Problem',
        studentExpectation: 'Writing a clever 3-line prompt',
        industryReality: 'Building deterministic evals, guardrails, and resilient fallbacks when models fail',
      },
      {
        dimension: 'Reliability',
        studentExpectation: 'Works on 2 demo inputs = shipped',
        industryReality: 'Measured across 100+ adversarial & edge-case tests before release',
      },
    ],
    expectationCheckQuestion: {
      prompt: 'Your LLM JSON classifier occasionally returns malformed syntax in production. Best engineering fix?',
      options: [
        'Enforce strict response schema validation + retry + deterministic rule-based fallback',
        'Hope users type nicer inputs',
        'Disable error handling so it looks fast',
        'Switch font colors on the dashboard',
      ],
      correctAnswer: 'Enforce strict response schema validation + retry + deterministic rule-based fallback',
      insight: 'Production AI engineering prioritizes schema contracts and graceful degradation.',
    },
  },
  {
    careerId: 'cloud-engineer',
    worldName: 'The Distributed Cloud Grid',
    worldSubtitle: 'Architect resilient infrastructure, CI/CD pipelines, and zero-downtime rollouts',
    atmosphereTag: 'Provision · Automate · Observe',
    realisticDailyTasks: [
      'Write least-privilege IAM policies and multi-stage Docker builds with healthchecks',
      'Debug failed container startup or port binding mismatches in deployment pipelines',
      'Automate rollbacks, secrets injection, and resource cost alerts',
    ],
    practicalChallenges: [
      'Configuration works on localhost but fails in isolated staging containers',
      'Sudden traffic spikes exhausting connection pools or memory limits',
      'Tight security compliance audits on public endpoints and environment secrets',
    ],
    expectationMyth: 'Clicking create-server buttons in a cloud console occasionally.',
    dayToDayReality:
      'Infrastructure-as-code, networking diagnostics, container hardening, and incident postmortems.',
    communicationLoad: 'High — partnering with backend and security teams to unblock safe releases.',
    learningDifficultyCurve: 'Requires Linux + Networking + Containers + CI/CD automation discipline.',
    expectationVsRealityRows: [
      {
        dimension: 'Deployment',
        studentExpectation: 'SSH into a server and run git pull',
        industryReality: 'Immutable container builds, automated healthchecks, and reproducible IaC configs',
      },
      {
        dimension: 'Security',
        studentExpectation: 'Give admin role so nothing errors out',
        industryReality: 'Minimal IAM permissions, secret managers, and network isolation',
      },
    ],
    expectationCheckQuestion: {
      prompt: 'A newly deployed container keeps restarting in staging after 10 seconds. First diagnostic check?',
      options: [
        'Inspect container startup logs, exit code, env vars, and readiness healthcheck endpoint',
        'Double instance RAM blindly without reading logs',
        'Delete the healthcheck permanently',
        'Hardcode DB passwords inside the Dockerfile',
      ],
      correctAnswer: 'Inspect container startup logs, exit code, env vars, and readiness healthcheck endpoint',
      insight: 'Cloud debugging isolates environment, port binding, and healthcheck signals first.',
    },
  },
];

export const COMMUNITY_MISSIONS_CATALOG: CommunityMissionTemplate[] = [
  {
    id: 'cm-campus-queue',
    title: 'Campus Placement & Lab Queue Tracker',
    category: 'Campus Utility App',
    skillFocus: 'JavaScript',
    careerId: 'full-stack-developer',
    difficulty: 'intermediate',
    problemStatement:
      'College computer labs and placement interviews suffer from overcrowded queues and missed slots. Design & implement a lightweight digital token queue & wait-time estimator with edge-case handling for no-shows.',
    deliverableChecklist: [
      'State model for active tokens, skipped slots, and completed check-ins',
      'Input validation preventing duplicate roll numbers in the active queue',
      'Clear mobile-first UI or API endpoint summary + test cases',
    ],
    estimatedHours: 4,
  },
  {
    id: 'cm-local-shop-site',
    title: 'Accessible Local Clinic / Bookstore Web Portal',
    category: 'Local Community Website',
    skillFocus: 'HTML/CSS',
    careerId: 'ui-ux-designer',
    difficulty: 'beginner',
    problemStatement:
      'A neighborhood clinic/bookstore lacks an accessible mobile website for elderly visitors and low-bandwidth phones. Build a fast, high-contrast semantic HTML/CSS booking & catalog layout.',
    deliverableChecklist: [
      'Semantic landmarks (<main>, <nav>, <section>), readable 16px+ typography, WCAG AA contrast',
      'Keyboard-navigable appointment/book request form with clear inline errors',
      'Zero heavy images blocking first paint on slow 3G connections',
    ],
    estimatedHours: 3,
  },
  {
    id: 'cm-phishing-audit',
    title: 'Student Club Login & Password Security Audit',
    category: 'Security Audit',
    skillFocus: 'Cybersecurity Fundamentals',
    careerId: 'cybersecurity-analyst',
    difficulty: 'intermediate',
    problemStatement:
      'A student symposium registration site handles 1,200 student emails and roll numbers. Conduct a defensive security checklist & write concrete fixes for SQL injection, weak cookies, and brute-force logins.',
    deliverableChecklist: [
      'Identify 3 concrete OWASP risks (e.g., unparameterized queries, missing rate limit, plain HTTP cookies)',
      'Provide parameterized query + HttpOnly cookie + rate-limit mitigation code',
      'Responsible disclosure & verification test plan',
    ],
    estimatedHours: 4,
  },
  {
    id: 'cm-hostel-water-data',
    title: 'Campus Hostel Electricity & Water Usage Anomaly Report',
    category: 'Data Analysis',
    skillFocus: 'Data Analysis',
    careerId: 'data-scientist',
    difficulty: 'intermediate',
    problemStatement:
      'Analyze daily utility logs across 4 campus blocks with missing meter readings and weekend spikes. Produce a clean anomaly detection methodology and actionable conservation metrics.',
    deliverableChecklist: [
      'Handle missing/corrupt meter rows explicitly without distorting averages',
      'Define IQR or z-score threshold to flag genuine leak spikes vs exam-week usage',
      '3 concise executive recommendations backed by verifiable numbers',
    ],
    estimatedHours: 4,
  },
  {
    id: 'cm-doubt-triage-bot',
    title: 'First-Year Peer Study Helpdesk Triage Schema',
    category: 'Automation & AI Workflow',
    skillFocus: 'Python',
    careerId: 'ai-ml-engineer',
    difficulty: 'beginner',
    problemStatement:
      'Senior mentors get flooded with repeated lab setup questions. Design a structured Python triage classifier & FAQ router that groups doubts by subject, flags urgent exam blockers, and preserves privacy.',
    deliverableChecklist: [
      'Clean taxonomy of topics + priority rules + PII stripping check',
      'Deterministic fallback rule if keyword confidence is low',
      'Sample unit tests covering 3 edge-case student queries',
    ],
    estimatedHours: 3,
  },
];

export function getCareerUniverseCatalog() {
  const careers = getAllCareers();
  const worlds = careers.map((career) => {
    const custom = CAREER_UNIVERSE_WORLDS.find((w) => w.careerId === career.id);
    if (custom) return { ...custom, career };
    return {
      careerId: career.id,
      worldName: `${career.title} Arena`,
      worldSubtitle: career.description,
      atmosphereTag: `${career.category} · Hands-On`,
      realisticDailyTasks: career.requirements.slice(0, 3).map(
        (r) => `Apply ${r.skillName} (target ${r.requiredLevel}%) to real production tickets and peer reviews`
      ),
      practicalChallenges: [
        'Translating ambiguous requirements into verifiable technical milestones',
        'Debugging regressions cleanly under real delivery timelines',
        'Communicating trade-offs clearly across teammates',
      ],
      expectationMyth: `Only writing isolated ${career.requirements[0]?.skillName || 'code'} tutorials with perfect instructions.`,
      dayToDayReality:
        'Combining technical execution, reading existing systems, troubleshooting edge cases, and documenting decisions clearly.',
      communicationLoad: 'Moderate to High — regular engineering reviews and progress updates.',
      learningDifficultyCurve: 'Steady growth when theory is paired with real debugging and verified mini-projects.',
      expectationVsRealityRows: [
        {
          dimension: 'Daily Tasks',
          studentExpectation: 'Following step-by-step toy examples',
          industryReality: 'Diagnosing ambiguous requirements, edge cases, and integration failures',
        },
        {
          dimension: 'Skill Depth',
          studentExpectation: 'Memorizing syntax',
          industryReality: `Connecting ${career.requirements.slice(0, 3).map((r) => r.skillName).join(', ')} in working systems`,
        },
      ],
      expectationCheckQuestion: {
        prompt: `What distinguishes a production-ready ${career.title} from someone who only watches tutorials?`,
        options: [
          'Verifying edge cases, debugging real failures, and shipping tested work',
          'Copying code without understanding failure modes',
          'Skipping error handling to look faster',
          'Avoiding code reviews from teammates',
        ],
        correctAnswer: 'Verifying edge cases, debugging real failures, and shipping tested work',
        insight: `Hands-on debugging and edge-case ownership define readiness for ${career.title}.`,
      },
      career,
    };
  });

  return {
    worlds,
    communityMissions: COMMUNITY_MISSIONS_CATALOG,
  };
}

// ============================================================================
// F. FAILURE DNA DETECTOR & RECOVERY MISSIONS
// ============================================================================
export function scanFailureDNA(userId: string): FailureDNAItem[] {
  const skills = getLearnerSkills(userId);
  const now = new Date().toISOString();

  // Group missed questions by concept_tag + skill_name across completed assessments
  const missedQuestions = db
    .prepare(`
      SELECT sa.skill_name, aq.concept_tag, COUNT(*) as miss_count, MAX(sa.completed_at) as last_seen
      FROM assessment_questions aq
      JOIN skill_assessments sa ON sa.id = aq.assessment_id
      WHERE sa.user_id = ? AND sa.status = 'completed' AND aq.is_correct = 0
      GROUP BY LOWER(sa.skill_name), LOWER(aq.concept_tag)
    `)
    .all(userId) as Array<{ skill_name: string; concept_tag: string; miss_count: number; last_seen: string }>;

  const completedRevisions = new Set(
    (
      db
        .prepare("SELECT DISTINCT LOWER(skill_name) as sk FROM revision_schedules WHERE user_id = ? AND status = 'completed'")
        .all(userId) as Array<{ sk: string }>
    ).map((r) => r.sk)
  );

  const mentorHelpCounts = db
    .prepare(`
      SELECT COUNT(*) as total_msgs FROM mentor_conversations
      WHERE user_id = ? AND role = 'user'
    `)
    .get(userId) as { total_msgs: number };

  const upsert = db.prepare(`
    INSERT INTO failure_dna_records (
      id, user_id, skill_name, concept_tag, failure_pattern, occurrence_count,
      repeated_after_revision, diagnostic_note, recovery_mission_title,
      recovery_mission_task, status, last_detected_at, resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, NULL)
    ON CONFLICT(user_id, skill_name, concept_tag) DO UPDATE SET
      failure_pattern = excluded.failure_pattern,
      occurrence_count = MAX(failure_dna_records.occurrence_count, excluded.occurrence_count),
      repeated_after_revision = MAX(failure_dna_records.repeated_after_revision, excluded.repeated_after_revision),
      diagnostic_note = excluded.diagnostic_note,
      last_detected_at = excluded.last_detected_at
  `);

  for (const mq of missedQuestions) {
    const revRepeat = completedRevisions.has(mq.skill_name.toLowerCase()) ? 1 : 0;
    const pattern: FailureDNAItem['failurePattern'] = revRepeat
      ? 'post_revision_repeat'
      : mq.miss_count >= 2
        ? 'repeated_mistake'
        : 'misunderstood_concept';
    const existingRow = db
      .prepare("SELECT status FROM failure_dna_records WHERE user_id = ? AND LOWER(skill_name) = LOWER(?) AND LOWER(concept_tag) = LOWER(?)")
      .get(userId, mq.skill_name, mq.concept_tag) as { status: string } | undefined;

    if (existingRow?.status === 'recovered' && mq.miss_count < 2) continue;

    upsert.run(
      uid('fdna'),
      userId,
      mq.skill_name,
      mq.concept_tag,
      pattern,
      mq.miss_count,
      revRepeat,
      revRepeat
        ? `Repeated ${mq.miss_count}x in ${mq.skill_name} (${mq.concept_tag}) even after revision.`
        : `Missed ${mq.miss_count}x in ${mq.skill_name} (${mq.concept_tag}). Conceptual reinforcement needed.`,
      `Repair ${mq.concept_tag} (${mq.skill_name})`,
      `1. Teach "${mq.concept_tag}" back to Zyra in Reverse Teaching Challenge.\n2. Complete 1 debugging exercise in ${mq.skill_name}.\n3. Clear this Failure DNA mission and verify via a practice quiz.`,
      mq.last_seen || now
    );
  }

  // Slow improvement / low retention skills
  for (const sk of skills) {
    if (sk.verifiedScore < 55 && sk.verificationStatus !== 'self_declared') {
      const pattern: FailureDNAItem['failurePattern'] =
        sk.problemSolvingScore < 50 ? 'problem_solving_failure' : 'slow_improvement';
      upsert.run(
        uid('fdna'),
        userId,
        sk.skillName,
        `${sk.skillName} Applied Reasoning`,
        pattern,
        1,
        completedRevisions.has(sk.skillName.toLowerCase()) ? 1 : 0,
        `Verified score in ${sk.skillName} remains ${sk.verifiedScore}% (Problem Solving ${sk.problemSolvingScore}%).`,
        `Rebuild ${sk.skillName} Core Execution`,
        `1. Run a Beginner Workday Simulation or Practice Lab in ${sk.skillName}.\n2. Explain the root edge case in Reverse Teaching.`,
        now
      );
    } else if (mentorHelpCounts.total_msgs >= 8 && sk.decayRisk === 'high') {
      upsert.run(
        uid('fdna'),
        userId,
        sk.skillName,
        `${sk.skillName} Recall Independence`,
        'excessive_assistance',
        1,
        0,
        `High mentor reliance (${mentorHelpCounts.total_msgs} queries) paired with ${sk.retentionScore}% retention in ${sk.skillName}.`,
        `Independent Recall Sprint: ${sk.skillName}`,
        `1. Solve 1 ${sk.skillName} debugging stage without hints.\n2. Log a 15-min revision sprint.`,
        now
      );
    }
  }

  const rows = db
    .prepare('SELECT * FROM failure_dna_records WHERE user_id = ? ORDER BY occurrence_count DESC, last_detected_at DESC LIMIT 20')
    .all(userId) as Array<Record<string, unknown>>;

  return rows.map((f) => ({
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
}

export function completeFailureRecoveryMission(userId: string, failureId: string): LearnerWorkspaceData {
  const row = db
    .prepare('SELECT * FROM failure_dna_records WHERE id = ? AND user_id = ?')
    .get(failureId, userId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Failure DNA record not found.');

  const now = new Date().toISOString();
  const skillName = String(row.skill_name);

  db.transaction(() => {
    db.prepare(`
      UPDATE failure_dna_records
      SET status = 'recovered', resolved_at = ?
      WHERE id = ? AND user_id = ?
    `).run(now, failureId, userId);

    db.prepare(`
      UPDATE learner_skills
      SET verified_score = MIN(96, verified_score + 6),
          problem_solving_score = MIN(98, problem_solving_score + 8),
          retention_score = MIN(98, retention_score + 12),
          decay_risk = 'low',
          last_practiced_at = ?,
          updated_at = ?
      WHERE user_id = ? AND LOWER(skill_name) = LOWER(?)
    `).run(now, now, userId, skillName);

    db.prepare(`
      INSERT INTO progress_records (id, user_id, activity_type, skill_name, title, minutes_spent, score, recorded_at)
      VALUES (?, ?, 'revision', ?, ?, 20, 82, ?)
    `).run(uid('pr'), userId, skillName, `Failure DNA Recovery: ${String(row.concept_tag)}`, now);
  })();

  const ws = getLearnerWorkspace(userId);
  if (!ws) throw new Error('Workspace unavailable.');
  return ws;
}

// ============================================================================
// G. AI EXPERT COUNCIL (4 COLLABORATIVE AGENTS + ORCHESTRATOR RESOLUTION)
// ============================================================================
export async function conveneExpertCouncil(userId: string): Promise<{
  report: ExpertCouncilReport;
  workspace: LearnerWorkspaceData;
}> {
  const profile = getLearnerProfile(userId);
  if (!profile) throw new Error('Learner profile not found.');

  // Ensure Failure DNA is freshly scanned first
  const failureDna = scanFailureDNA(userId);
  const skills = getLearnerSkills(userId);
  const career = getCareerById(profile.targetCareerId) || getAllCareers()[0];
  const compat = computeCareerCompatibility(userId, career.id);
  const roadmap = getActiveRoadmap(userId);
  const sims = db
    .prepare('SELECT title, sim_kind, overall_score FROM workplace_simulations WHERE user_id = ? AND status = ? ORDER BY completed_at DESC LIMIT 5')
    .all(userId, 'completed') as Array<Record<string, unknown>>;

  const schema = {
    type: Type.OBJECT,
    properties: {
      members: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            agentRole: { type: Type.STRING },
            focusArea: { type: Type.STRING },
            score: { type: Type.INTEGER },
            stance: { type: Type.STRING },
            findings: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendation: { type: Type.STRING },
          },
          required: ['agentRole', 'focusArea', 'score', 'stance', 'findings', 'recommendation'],
        },
      },
      agreements: { type: Type.ARRAY, items: { type: Type.STRING } },
      disagreements: { type: Type.ARRAY, items: { type: Type.STRING } },
      orchestratorVerdict: { type: Type.STRING },
    },
    required: ['members', 'agreements', 'disagreements', 'orchestratorVerdict'],
  };

  const strongest = [...skills].sort((a, b) => b.verifiedScore - a.verifiedScore)[0];
  const weakest = [...skills].sort((a, b) => a.verifiedScore - b.verifiedScore)[0];
  const activeFailures = failureDna.filter((f) => f.status !== 'recovered');
  const decayRisks = skills.filter((s) => s.decayRisk !== 'low');

  const fallback = (): {
    members: ExpertCouncilMemberFinding[];
    agreements: string[];
    disagreements: string[];
    orchestratorVerdict: string;
  } => ({
    members: [
      {
        agentRole: 'Career Coach Agent',
        focusArea: 'Career Alignment & Exploration Fit',
        score: compat?.compatibilityScore ?? 60,
        stance: (compat?.compatibilityScore ?? 60) >= 65 ? 'advance' : 'pivot_explore',
        findings: [
          `Current compatibility with ${career.title} is ${compat?.compatibilityScore ?? 0}% (${compat?.metSkills.length ?? 0} skills met).`,
          `Strongest transferable asset: ${strongest?.skillName || 'Core Logic'} (${strongest?.verifiedScore ?? 0}%).`,
        ],
        recommendation:
          (compat?.compatibilityScore ?? 60) >= 65
            ? `Stay on ${career.title} and complete 1 realistic Workday Simulation this week.`
            : `Run the Parallel Career Challenge to compare ${career.title} against adjacent tracks before locking focus.`,
      },
      {
        agentRole: 'Technical Expert Agent',
        focusArea: 'Code Execution & Concept Rigor',
        score: weakest ? Math.round((weakest.verifiedScore + (strongest?.verifiedScore ?? 60)) / 2) : 65,
        stance: activeFailures.length > 0 ? 'reinforce' : 'advance',
        findings: [
          weakest
            ? `Primary technical bottleneck: ${weakest.skillName} (${weakest.verifiedScore}% verified, Problem Solving ${weakest.problemSolvingScore}%).`
            : 'Balanced baseline across technical skills.',
          activeFailures[0]
            ? `Recurring Failure DNA in ${activeFailures[0].skillName}: ${activeFailures[0].conceptTag} (${activeFailures[0].occurrenceCount}x).`
            : 'No unresolved technical Failure DNA patterns.',
        ],
        recommendation: `Prioritize hands-on debugging & Reverse Teaching on ${weakest?.skillName || 'core algorithms'} before advancing difficulty.`,
      },
      {
        agentRole: 'Learning Observer Agent',
        focusArea: 'Retention Curve & Study Habits',
        score: Math.round(skills.reduce((acc, s) => acc + s.retentionScore, 0) / Math.max(1, skills.length)),
        stance: decayRisks.length > 0 ? 'reinforce' : 'advance',
        findings: [
          decayRisks.length > 0
            ? `${decayRisks.length} skill(s) showing Ebbinghaus decay risk: ${decayRisks.map((d) => d.skillName).join(', ')}.`
            : 'Retention curve across practiced skills is healthy.',
          `Active streak: ${profile.streakDays} day(s) at ${profile.dailyLearningMinutes} min/day target.`,
        ],
        recommendation:
          decayRisks.length > 0
            ? `Schedule immediate 15-min spaced revision for ${decayRisks[0].skillName} to halt forgetting decay.`
            : 'Maintain short daily checkpoints in Learning Hub.',
      },
      {
        agentRole: 'Industry Mentor Agent',
        focusArea: 'Workplace Readiness & Deliverable Proof',
        score: sims.length > 0 ? Number(sims[0].overall_score || 72) : Math.max(45, (compat?.indicativeReadinessEstimate ?? 55)),
        stance: sims.length === 0 ? 'reinforce' : 'advance',
        findings: [
          sims.length > 0
            ? `Completed ${sims.length} workplace simulation(s); latest score ${sims[0].overall_score}%.`
            : 'No completed One Day as a Professional simulation recorded yet.',
          'Employers verify practical bug triage, edge-case discipline, and community/project artifacts over passive video hours.',
        ],
        recommendation: `Complete a Community Mission or Unexpected Boss Challenge tailored to ${career.title} to earn verified portfolio proof.`,
      },
    ],
    agreements: [
      `All 4 agents agree ${strongest?.skillName || 'core logic'} is a solid anchor to build upon.`,
      activeFailures.length > 0
        ? `Immediate consensus to clear Failure DNA on "${activeFailures[0].conceptTag}" via active recall.`
        : 'Consensus that verified hands-on deliverables should lead the next milestone.',
    ],
    disagreements: [
      `Career Coach wants immediate advancement into ${career.title} deliverables, while ${decayRisks.length > 0 ? 'Learning Observer' : 'Technical Expert'} recommends pausing 1 session to solidify ${weakest?.skillName || 'foundations'} (${weakest?.verifiedScore ?? 0}%).`,
    ],
    orchestratorVerdict: `Balanced Council Decision: Keep ${career.title} active, inject a 15-minute ${weakest?.skillName || 'core'} repair & revision sprint first, then unlock your next Workday Simulation and Roadmap stage.`,
  });

  const { data } = await callGeminiJson(
    `You are the ZyraTech AI Expert Council Orchestrator coordinating 4 distinct agents: Career Coach Agent, Technical Expert Agent, Learning Observer Agent, and Industry Mentor Agent. Evaluate the student honestly based strictly on telemetry (no exaggeration). Surface genuine disagreements between agents and synthesize a practical verdict. ${getUserLanguageInstruction(userId)}`,
    `Student Career Goal: ${career.title} (${compat?.compatibilityScore ?? 0}% compatibility)
Skill DNA: ${JSON.stringify(skills.map((s) => ({ name: s.skillName, score: s.verifiedScore, retention: s.retentionScore, decay: s.decayRisk, ps: s.problemSolvingScore })))}
Failure DNA: ${JSON.stringify(activeFailures)}
Completed Simulations: ${JSON.stringify(sims)}`,
    schema,
    fallback
  );

  const validRoles: ExpertCouncilMemberFinding['agentRole'][] = [
    'Career Coach Agent',
    'Technical Expert Agent',
    'Learning Observer Agent',
    'Industry Mentor Agent',
  ];

  const members: ExpertCouncilMemberFinding[] = validRoles.map((role, idx) => {
    const found = (data.members || []).find((m) => m.agentRole === role) || (data.members || [])[idx] || fallback().members[idx];
    const stance = ['advance', 'reinforce', 'pivot_explore'].includes(found.stance)
      ? (found.stance as ExpertCouncilMemberFinding['stance'])
      : 'reinforce';
    return {
      agentRole: role,
      focusArea: found.focusArea || fallback().members[idx].focusArea,
      score: Math.max(20, Math.min(98, Number(found.score) || 65)),
      stance,
      findings: (found.findings || []).slice(0, 3),
      recommendation: found.recommendation || fallback().members[idx].recommendation,
    };
  });

  const now = new Date().toISOString();
  const appliedSystemUpdates: string[] = [];

  // Apply real adaptive system updates inside SQLite
  db.transaction(() => {
    if (roadmap) {
      db.prepare(`
        UPDATE learning_roadmaps
        SET adaptation_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(`Expert Council Verdict: ${data.orchestratorVerdict}`, now, roadmap.id);
      appliedSystemUpdates.push(`Updated active ${roadmap.careerTitle} roadmap adaptation rationale`);
    }

    const focusSkill = weakest?.skillName || career.requirements[0]?.skillName || 'JavaScript';
    const existingRev = db
      .prepare("SELECT id FROM revision_schedules WHERE user_id = ? AND LOWER(skill_name) = LOWER(?) AND status = 'pending'")
      .get(userId, focusSkill);
    if (!existingRev && (decayRisks.length > 0 || activeFailures.length > 0)) {
      db.prepare(`
        INSERT INTO revision_schedules (id, user_id, skill_name, reason, urgency, due_date, status, created_at)
        VALUES (?, ?, ?, ?, 'high', ?, 'pending', ?)
      `).run(
        uid('rev'),
        userId,
        focusSkill,
        `AI Expert Council flagged ${focusSkill} for immediate targeted revision & Failure DNA repair.`,
        new Date(Date.now() + 86400000).toISOString(),
        now
      );
      appliedSystemUpdates.push(`Scheduled high-priority spaced revision for ${focusSkill}`);
    }

    const councilDecisionOutputs = members.map((m) => ({
      agentName: m.agentRole,
      summary: `${m.focusArea} (${m.score}/100 · ${m.stance})`,
      keyFindings: m.findings,
      recommendations: [m.recommendation],
    }));

    db.prepare(`
      INSERT INTO ai_agent_decisions (id, user_id, trigger_event, orchestrator_summary, agent_outputs, next_action, explanation, created_at)
      VALUES (?, ?, 'EXPERT_COUNCIL_REVIEW', ?, ?, ?, ?, ?)
    `).run(
      uid('dec'),
      userId,
      data.orchestratorVerdict,
      JSON.stringify(councilDecisionOutputs),
      members[1]?.recommendation || 'Complete targeted recovery drill',
      `Disagreements resolved: ${(data.disagreements || []).join(' | ') || 'Unified reinforcement plan.'}`,
      now
    );
    appliedSystemUpdates.push('Logged 4-Agent Expert Council synthesis into Agent Decision Trace');
  })();

  const reviewId = uid('ec');
  db.prepare(`
    INSERT INTO expert_council_reviews (
      id, user_id, members, agreements, disagreements, orchestrator_verdict, applied_system_updates, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    reviewId,
    userId,
    JSON.stringify(members),
    JSON.stringify(data.agreements || []),
    JSON.stringify(data.disagreements || []),
    data.orchestratorVerdict,
    JSON.stringify(appliedSystemUpdates),
    now
  );

  const report: ExpertCouncilReport = {
    id: reviewId,
    userId,
    members,
    agreements: data.agreements || [],
    disagreements: data.disagreements || [],
    orchestratorVerdict: data.orchestratorVerdict,
    appliedSystemUpdates,
    createdAt: now,
  };

  const workspace = getLearnerWorkspace(userId);
  if (!workspace) throw new Error('Workspace unavailable.');
  return { report, workspace };
}

// ============================================================================
// C. ONE DAY AS A PROFESSIONAL · D. UNEXPECTED BOSS CHALLENGE
// I. CAREER ESCAPE ROOM · L. ETHICAL DECISION ARENA
// ============================================================================
function buildSimulationTemplate(
  simKind: WorkplaceSimulationItem['simKind'],
  careerId: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): { title: string; skillApplied: string; stages: WorkplaceSimulationStage[] } {
  if (simKind === 'ethical_arena') {
    return {
      title:
        careerId === 'cybersecurity-analyst'
          ? 'Ethical Arena: Shadow Leak & Student Data Dilemma'
          : careerId === 'data-scientist'
            ? 'Ethical Arena: Biased Scholarship Screening Model'
            : 'Ethical Arena: Dark-Pattern Metrics vs User Consent',
      skillApplied:
        careerId === 'cybersecurity-analyst'
          ? 'Cybersecurity Fundamentals'
          : careerId === 'data-scientist'
            ? 'Data Analysis'
            : 'JavaScript',
      stages: [
        {
          stageNumber: 1,
          title: 'Stage 1: Discovery & Privacy Boundary',
          deadlineSeconds: 240,
          briefing:
            'While optimizing a campus internship dashboard, your teammate shares an unmasked CSV containing 1,800 student phone numbers, roll numbers, and GPA logs in a public Slack/Discord channel to debug faster.',
          artifactSnippet: `// Shared message in #eng-general (140 members):\n"Attached prod_students_export.csv — filter where gpa < 6.0 and email me back!"`,
          twist: null,
          promptQuestion:
            'What immediate technical and ethical actions do you take regarding the exposed student PII, and why?',
        },
        {
          stageNumber: 2,
          title: 'Stage 2: Stakeholder Pressure',
          deadlineSeconds: 240,
          briefing:
            'Your team lead pushes back during standup: "We have a demo in 2 hours. Don’t waste time scrubbing logs or creating synthetic fixtures — nobody outside our college is in that channel."',
          artifactSnippet: `Policy Note: Student records include protected academic & personal identifiers under institutional privacy rules.`,
          twist: {
            speaker: 'AI Manager',
            roleLabel: 'Delivery Lead',
            message: 'Demo starts in 2 hours. Leaving the real CSV speeds up our bug fix — just keep quiet and patch the chart.',
            requirementChange: 'Resolve delivery pressure without normalizing privacy or security shortcuts.',
          },
          promptQuestion:
            'How do you respond professionally to your lead while keeping the demo on track safely and fairly?',
        },
        {
          stageNumber: 3,
          title: 'Stage 3: Algorithmic Fairness & Safeguard Architecture',
          deadlineSeconds: 240,
          briefing:
            'Before signing off, you also notice the shortlist script silently penalizes diploma/rural-college applicants due to missing historical pin-code features.',
          artifactSnippet: `if (!applicant.metroPinCode) score -= 18; // Legacy heuristic`,
          twist: {
            speaker: 'AI Client',
            roleLabel: 'University Dean Office',
            message: 'We need assurance this tool treats every student fairly and protects privacy going forward.',
            requirementChange: 'Propose concrete fairness, auditability, and safety controls.',
          },
          promptQuestion:
            'Outline your final governance & engineering fix covering PII protection, bias removal, and transparent auditing.',
        },
      ],
    };
  }

  if (simKind === 'escape_room') {
    const skillApplied =
      careerId === 'cybersecurity-analyst'
        ? 'Cybersecurity Fundamentals'
        : careerId === 'data-scientist' || careerId === 'data-analyst'
          ? 'SQL'
          : 'JavaScript';
    return {
      title: `Career Escape Room: Locked Incident Vault (${difficulty})`,
      skillApplied,
      stages: [
        {
          stageNumber: 1,
          title: 'Room 1: The Broken Auth Gate',
          deadlineSeconds: 210,
          briefing:
            'The vault API rejects valid student tokens after midnight UTC and leaks raw database errors on invalid IDs. Unlock Room 2 by diagnosing both flaws.',
          artifactSnippet: `app.get('/api/vault/:id', (req, res) => {\n  const row = db.prepare("SELECT * FROM items WHERE id = " + req.params.id).get();\n  if (Date.now() > token.exp * 1000) return res.status(401).json({ err: row });\n});`,
          twist: null,
          promptQuestion:
            'Identify BOTH security/logic bugs preventing safe entry (hint: SQL string concatenation & error leakage / exp units) and write the fixed query + check.',
        },
        {
          stageNumber: 2,
          title: 'Room 2: The Stalled Worker Queue (Adaptive Lock)',
          deadlineSeconds: 240,
          briefing:
            'Door 1 opened, triggering a memory spike inside the telemetry processor! A recursive cache loader has no exit condition on cyclic dependencies.',
          artifactSnippet: `function loadDeps(node, seen = []) {\n  return node.children.map(c => loadDeps(c, seen)); // Cycles cause stack overflow!\n}`,
          twist: {
            speaker: 'System Alert',
            roleLabel: 'Adaptive Difficulty Lock',
            message: 'Vault timer accelerated — cyclic references detected in module dependency graph.',
            requirementChange: 'Track visited IDs cleanly with O(1) lookup to break cycles.',
          },
          promptQuestion:
            'Write or explain the exact Set-based visited guard and base case that unlocks Room 3 without infinite recursion.',
        },
        {
          stageNumber: 3,
          title: 'Room 3: Final Production Release Key',
          deadlineSeconds: 240,
          briefing:
            'Final vault door! Two engineers patched the same SQL migration differently: one dropped indexes on `user_id` (`500k` rows), the other forgot `ROLLBACK` on partial failures.',
          artifactSnippet: `BEGIN;\nUPDATE wallets SET balance = balance - 500 WHERE user_id = ?;\nUPDATE wallets SET balance = balance + 500 WHERE user_id = ?;\n-- Missing balance check & transaction safety?`,
          twist: null,
          promptQuestion:
            'Specify the atomic transaction invariant, negative-balance guard, and index requirement needed to escape safely.',
        },
      ],
    };
  }

  if (simKind === 'boss_challenge') {
    const skillApplied =
      careerId === 'cybersecurity-analyst'
        ? 'Cybersecurity Fundamentals'
        : careerId === 'data-scientist'
          ? 'Python'
          : careerId === 'ui-ux-designer'
            ? 'HTML/CSS'
            : 'Node.js';
    return {
      title: `Unexpected Boss Challenge: Live Sprint Disruption`,
      skillApplied,
      stages: [
        {
          stageNumber: 1,
          title: 'Phase 1: Production Triage Under Pressure',
          deadlineSeconds: 240,
          briefing:
            'Monday 09:40 AM. Your team just shipped an update and users report duplicate order/enrollment submissions when clicking Submit twice on slow campus Wi-Fi.',
          artifactSnippet: `POST /api/enroll -> inserts duplicate rows whenever mobile client retries after 3s timeout.`,
          twist: null,
          promptQuestion:
            'Explain your immediate client + backend fix (idempotency key, disabled pending state, DB unique constraint) to stop duplicate writes.',
        },
        {
          stageNumber: 2,
          title: 'Phase 2: AI Client Scope Shock + Teammate Blocker',
          deadlineSeconds: 240,
          briefing:
            'Just as you stabilize duplicates, the Client changes requirements AND a junior teammate pushes a broken config.',
          artifactSnippet: `Teammate commit diff:\n- const secret = process.env.JWT_SECRET;\n+ const secret = "dev-secret-123"; // temporary fix to pass build`,
          twist: {
            speaker: 'AI Client',
            roleLabel: 'VP Product & Teammate',
            message:
              'Client wants CSV audit export added BEFORE 4 PM today, while your teammate accidentally hardcoded a secret into main!',
            requirementChange: '1) Reject/revert hardcoded secret safely, 2) Negotiate scope & ship safe CSV export.',
          },
          promptQuestion:
            'How do you handle your teammate’s hardcoded secret commit AND communicate realistic trade-offs to your AI Manager & Client?',
        },
        {
          stageNumber: 3,
          title: 'Phase 3: Final Boss Postmortem & Rollout Sign-off',
          deadlineSeconds: 240,
          briefing:
            'Your AI Manager asks for a 4-point launch readiness checklist before traffic switches back to 100%.',
          artifactSnippet: `Checklist draft: Idempotency Verified | Secrets Removed | CSV Escaping (Formula Injection safe) | Rollback Ready`,
          twist: {
            speaker: 'AI Manager',
            roleLabel: 'Engineering Director',
            message: 'Prove to me we won’t have a repeat outage tonight.',
            requirementChange: 'Include regression tests, formula-injection safe CSV export, and rollback trigger.',
          },
          promptQuestion:
            'Deliver your concise executive rollout sign-off covering technical verification, risk mitigation, and monitoring alerts.',
        },
      ],
    };
  }

  // Default: 'workday' — One Day as a Professional tailored per career track
  if (careerId === 'cybersecurity-analyst') {
    return {
      title: 'One Day as a Cybersecurity Analyst: SOC Shift 01',
      skillApplied: 'Cybersecurity Fundamentals',
      stages: [
        {
          stageNumber: 1,
          title: '09:30 AM — Suspicious Login Triage',
          deadlineSeconds: 240,
          briefing:
            'SIEM Alert #8841 fires: Student portal account `2501@zyra.in` logged in from Chennai at 09:10 IST and from an unfamiliar Tor exit IP at 09:14 IST, followed by 14 API exports.',
          artifactSnippet: `09:10:02 IST | IP 49.37.xx.xx (Chennai ISP) | 200 OK /api/workspace\n09:14:19 IST | IP 185.220.101.xx (Tor Exit) | 200 OK /api/export?limit=5000`,
          twist: null,
          promptQuestion:
            'Analyze why this is high-confidence session hijacking / credential compromise and state your immediate containment steps.',
        },
        {
          stageNumber: 2,
          title: '01:15 PM — Mid-Shift Escalation Twist',
          deadlineSeconds: 240,
          briefing:
            'Engineering checks the `/api/export` route and realizes it never checks `req.user.id === targetUserId` (IDOR vulnerability), while the Ops Lead asks not to restart the server during live exams.',
          artifactSnippet: `app.get('/api/export', (req, res) => {\n  return db.prepare('SELECT * FROM student_logs WHERE user_id = ?').all(req.query.userId);\n});`,
          twist: {
            speaker: 'AI Manager',
            roleLabel: 'SOC Lead',
            message: 'Live university exams are running right now! Patch the authorization flaw cleanly without breaking active exam sessions.',
            requirementChange: 'Enforce server-side ownership from signed session token (`req.user.id`), not query params.',
          },
          promptQuestion:
            'Write the exact secure route fix and explain how you stop unauthorized cross-user access without dropping valid students.',
        },
        {
          stageNumber: 3,
          title: '04:45 PM — Incident Closure & Preventive Controls',
          deadlineSeconds: 240,
          briefing:
            'The immediate bleed is stopped. Draft the post-incident briefing for leadership and developers.',
          artifactSnippet: `Need: Root Cause, Affected Scope, Short-Term Fix, Permanent Prevention (Rate limits + HttpOnly/SameSite + anomaly alert).`,
          twist: null,
          promptQuestion:
            'Summarize the incident response report and 3 permanent hardening controls to prevent future token abuse.',
        },
      ],
    };
  }

  if (careerId === 'data-scientist' || careerId === 'data-analyst') {
    return {
      title: 'One Day as a Data Scientist: Churn & Leakage Audit',
      skillApplied: 'Data Analysis',
      stages: [
        {
          stageNumber: 1,
          title: '09:30 AM — Dirty Dataset & Schema Surprise',
          deadlineSeconds: 240,
          briefing:
            'Product sends a 40,000-row learner engagement table to predict 30-day dropout. 18% of `study_minutes` are `-1` sentinel errors and `retention_score` contains future cancellation flags.',
          artifactSnippet: `Columns: user_id, study_minutes (-1 for missing), cancelled_next_month_email_sent (bool), target_dropped_out (0/1)`,
          twist: null,
          promptQuestion:
            'Identify the silent data-leakage column AND explain how you clean `-1` sentinel values safely without leaking test-set statistics.',
        },
        {
          stageNumber: 2,
          title: '01:30 PM — Executive KPI Shift',
          deadlineSeconds: 240,
          briefing:
            'Your baseline model catches only 35% of actual dropouts (low recall) despite 91% overall accuracy, and the Product Manager demands a decision before 4 PM.',
          artifactSnippet: `Confusion Matrix: TP=140, FP=40, FN=260, TN=3560 (Dropout rate = 10%)`,
          twist: {
            speaker: 'AI Client',
            roleLabel: 'Head of Student Success',
            message: 'Missing a student who is about to drop out costs us way more than sending an extra helpful reminder email!',
            requirementChange: 'Optimize decision threshold / class weighting for Recall & F2 over raw Accuracy.',
          },
          promptQuestion:
            'Explain which metric + threshold adjustment you apply and how you verify no overfitting occurred.',
        },
        {
          stageNumber: 3,
          title: '05:00 PM — Production Monitoring Plan',
          deadlineSeconds: 240,
          briefing:
            'The model is approved for staging. Specify what drift alerts and ethical guardrails must ship with it.',
          artifactSnippet: `Monitor: feature missingness %, prediction score distribution drift, false positive intervention rate.`,
          twist: null,
          promptQuestion:
            'Write your 3-part deployment monitoring & stakeholder recommendation summary.',
        },
      ],
    };
  }

  if (careerId === 'ui-ux-designer') {
    return {
      title: 'One Day as a UI/UX Designer: Checkout Drop-Off Rescue',
      skillApplied: 'HTML/CSS',
      stages: [
        {
          stageNumber: 1,
          title: '09:30 AM — Diagnose Step-2 Funnel Drop-Off',
          deadlineSeconds: 240,
          briefing:
            'Telemetry shows 46% of mobile learners abandon registration on Step 2. Inspecting the screen reveals tiny 11px gray placeholder labels, no inline error clarity, and an 18-field single screen.',
          artifactSnippet: `<input placeholder="Enter PIN" style="color:#b8c2cc; font-size:11px" />\n<button>Submit</button> <!-- disabled silently with no explanation -->`,
          twist: null,
          promptQuestion:
            'List the top 3 usability + WCAG accessibility failures here and propose concrete layout/copy redesigns.',
        },
        {
          stageNumber: 2,
          title: '01:00 PM — Engineering Scope Trade-Off',
          deadlineSeconds: 240,
          briefing:
            'Frontend engineering says they only have 4 hours before release and cannot rebuild an animated 5-step wizard.',
          artifactSnippet: `Constraint: 4 hours engineering budget; must fix mobile drop-off & keyboard focus visibility today.`,
          twist: {
            speaker: 'AI Teammate',
            roleLabel: 'Frontend Engineer',
            message: 'We can ship semantic `<label>` tags, high-contrast errors, and cut optional fields today — full multi-step animation must wait for next sprint.',
            requirementChange: 'Prioritize highest-impact friction fixes achievable in 4 hours.',
          },
          promptQuestion:
            'Decide which UX fixes ship today vs Sprint 2, and write clear developer handoff acceptance criteria.',
        },
        {
          stageNumber: 3,
          title: '04:30 PM — Usability Verification Plan',
          deadlineSeconds: 240,
          briefing:
            'Define how you will prove the redesign improved completion without breaking accessibility.',
          artifactSnippet: `Metrics: Step-2 completion rate, form error retry rate, keyboard tab order & 4.5:1 contrast check.`,
          twist: null,
          promptQuestion:
            'Outline your A/B validation & accessibility sign-off checklist.',
        },
      ],
    };
  }

  // Software / Full-Stack / Cloud / AI Engineer Workday
  return {
    title: 'One Day as a Software Developer: Live Ticket & Feature Sprint',
    skillApplied: careerId === 'ai-ml-engineer' ? 'Python' : 'JavaScript',
    stages: [
      {
        stageNumber: 1,
        title: '09:30 AM — Debug Stale State Bug in Production',
        deadlineSeconds: 240,
        briefing:
          'Users report that clicking "Complete Task" updates the database on refresh, yet the UI counter still shows stale counts AND crashes when an empty array returns from `/api/tasks`.',
        artifactSnippet: `async function completeTask(id) {\n  fetch('/api/tasks/' + id, { method: 'POST' }); // missing await & error handling\n  setCount(count + 1); // stale closure & crashes if tasks is null\n}`,
        twist: null,
        promptQuestion:
          'Identify the async race condition, functional state update bug, and defensive null handling needed, and write the corrected handler.',
      },
      {
        stageNumber: 2,
        title: '01:15 PM — Mid-Day Requirement Change & Teammate Conflict',
        deadlineSeconds: 240,
        briefing:
          'Just as your bug fix passes local checks, your AI Manager forwards an urgent client request while a teammate reports merge conflicts on the task schema.',
        artifactSnippet: `New Client Ask: Add server-side pagination + search filter on /api/tasks before 5 PM demo, preserving existing clients that omit ?page=.`,
        twist: {
          speaker: 'AI Client',
          roleLabel: 'Product Manager & Teammate',
          message: 'Client needs filtered pagination by 5 PM, AND legacy mobile app calls /api/tasks with no query params — don’t break backward compatibility!',
          requirementChange: 'Support backward-compatible defaults (`page=1, limit=20`) + safe parameterized SQL LIKE filtering.',
        },
        promptQuestion:
          'Explain how you implement backward-compatible pagination/filtering safely (SQL injection proof) and coordinate the schema merge with your teammate.',
      },
      {
        stageNumber: 3,
        title: '04:45 PM — PR Self-Review & Release Note',
        deadlineSeconds: 240,
        briefing:
          'Time to open your pull request for final team verification before production deployment.',
        artifactSnippet: `PR Checklist: Edge cases tested (empty list, page=0, SQL special chars), error boundary feedback, clean rollback safety.`,
        twist: null,
        promptQuestion:
          'Write the concise technical PR verification plan covering 3 unit/integration test cases and failure recovery.',
      },
    ],
  };
}

export function startWorkplaceSimulation(params: {
  userId: string;
  simKind: WorkplaceSimulationItem['simKind'];
  careerId?: string;
}): WorkplaceSimulationItem {
  const profile = getLearnerProfile(params.userId);
  const careerId = params.careerId || profile?.targetCareerId || 'full-stack-developer';
  const skills = getLearnerSkills(params.userId);
  const avgScore = skills.length
    ? Math.round(skills.reduce((s, x) => s + x.verifiedScore, 0) / skills.length)
    : 50;
  const difficulty: WorkplaceSimulationItem['difficulty'] =
    avgScore >= 75 ? 'advanced' : avgScore >= 50 ? 'intermediate' : 'beginner';

  const template = buildSimulationTemplate(params.simKind, careerId, difficulty);
  const id = uid('sim');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO workplace_simulations (
      id, user_id, sim_kind, career_id, title, difficulty, current_stage, total_stages,
      stages, rubric, overall_score, summary_feedback, skill_applied, status, created_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NULL, NULL, NULL, ?, 'active', ?, NULL)
  `).run(
    id,
    params.userId,
    params.simKind,
    careerId,
    template.title,
    difficulty,
    template.stages.length,
    JSON.stringify(template.stages),
    template.skillApplied,
    now
  );

  return {
    id,
    userId: params.userId,
    simKind: params.simKind,
    careerId,
    title: template.title,
    difficulty,
    currentStage: 0,
    totalStages: template.stages.length,
    stages: template.stages,
    rubric: null,
    overallScore: null,
    summaryFeedback: null,
    skillApplied: template.skillApplied,
    status: 'active',
    createdAt: now,
    completedAt: null,
  };
}

export async function advanceWorkplaceSimulationStage(params: {
  userId: string;
  simId: string;
  response: string;
  elapsedSeconds?: number;
}): Promise<{ simulation: WorkplaceSimulationItem; workspace: LearnerWorkspaceData }> {
  const row = db
    .prepare('SELECT * FROM workplace_simulations WHERE id = ? AND user_id = ?')
    .get(params.simId, params.userId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Simulation session not found.');
  if (row.status === 'completed') throw new Error('Simulation is already completed.');

  const stages = JSON.parse(String(row.stages || '[]')) as WorkplaceSimulationStage[];
  const idx = Number(row.current_stage);
  const stage = stages[idx];
  if (!stage) throw new Error('Simulation stage out of bounds.');

  const elapsed = Math.max(5, Number(params.elapsedSeconds) || 45);
  const simKind = row.sim_kind as WorkplaceSimulationItem['simKind'];
  const skillApplied = String(row.skill_applied);

  const stageSchema = {
    type: Type.OBJECT,
    properties: {
      stageScore: { type: Type.INTEGER },
      stageFeedback: { type: Type.STRING },
      dynamicNextTwistMessage: { type: Type.STRING },
    },
    required: ['stageScore', 'stageFeedback'],
  };

  const fallbackStageEval = () => {
    const clean = params.response.trim();
    const words = clean.split(/\s+/).filter(Boolean).length;
    const base = Math.min(92, Math.max(42, 46 + Math.min(35, words * 1.4) + (elapsed <= stage.deadlineSeconds ? 8 : 0)));
    const score = Math.round(base);
    return {
      stageScore: score,
      stageFeedback:
        score >= 75
          ? `Strong structured response (${score}%): addressed core constraints within deadline (${elapsed}s).`
          : `Partial solution (${score}%): expand on root-cause verification, edge cases, and team communication next stage.`,
      dynamicNextTwistMessage: '',
    };
  };

  const { data: stageEval } = await callGeminiJson<{
    stageScore: number;
    stageFeedback: string;
    dynamicNextTwistMessage?: string;
  }>(
    `You are the ZyraTech Workplace Simulation Evaluator (${simKind}). Score stage responses honestly from 30 to 96 based on technical rigor, root-cause accuracy, safety/ethics awareness, and practical communication. Never flatter vague 3-word answers. ${getUserLanguageInstruction(params.userId)}`,
    `Simulation: ${String(row.title)} (${String(row.difficulty)})
Stage ${stage.stageNumber}: ${stage.title}
Briefing: ${stage.briefing}
Question: ${stage.promptQuestion}
Student Answer (${elapsed}s vs ${stage.deadlineSeconds}s target): ${params.response}`,
    stageSchema,
    fallbackStageEval
  );

  const clampedStageScore = Math.max(30, Math.min(96, Number(stageEval.stageScore) || 65));
  stage.studentResponse = params.response;
  stage.elapsedSeconds = elapsed;
  stage.stageScore = clampedStageScore;
  stage.stageFeedback = stageEval.stageFeedback;

  // Adapt next stage twist dynamically if available
  const nextIdx = idx + 1;
  if (nextIdx < stages.length && stages[nextIdx].twist && stageEval.dynamicNextTwistMessage?.trim()) {
    stages[nextIdx].twist = {
      ...(stages[nextIdx].twist as SimulationTwistEvent),
      message: stageEval.dynamicNextTwistMessage.trim(),
    };
  }

  const now = new Date().toISOString();

  if (nextIdx < stages.length) {
    db.prepare(`
      UPDATE workplace_simulations
      SET current_stage = ?, stages = ?
      WHERE id = ?
    `).run(nextIdx, JSON.stringify(stages), params.simId);

    const updated: WorkplaceSimulationItem = {
      id: String(row.id),
      userId: params.userId,
      simKind,
      careerId: String(row.career_id),
      title: String(row.title),
      difficulty: row.difficulty as WorkplaceSimulationItem['difficulty'],
      currentStage: nextIdx,
      totalStages: stages.length,
      stages,
      rubric: null,
      overallScore: null,
      summaryFeedback: null,
      skillApplied,
      status: 'active',
      createdAt: String(row.created_at),
      completedAt: null,
    };

    const workspace = getLearnerWorkspace(params.userId)!;
    return { simulation: updated, workspace };
  }

  // Final stage completed — compute full 5+ axis rubric and update Skill DNA + progress
  const avgStage = Math.round(stages.reduce((acc, s) => acc + (s.stageScore ?? 65), 0) / stages.length);
  const onTimeStages = stages.filter((s) => (s.elapsedSeconds ?? 999) <= s.deadlineSeconds).length;
  const timeScore = Math.min(98, Math.round((onTimeStages / stages.length) * 85 + 10));

  const rubricSchema = {
    type: Type.OBJECT,
    properties: {
      problemSolving: { type: Type.INTEGER },
      technicalAccuracy: { type: Type.INTEGER },
      decisionMaking: { type: Type.INTEGER },
      communication: { type: Type.INTEGER },
      timeManagement: { type: Type.INTEGER },
      safetyAwareness: { type: Type.INTEGER },
      fairness: { type: Type.INTEGER },
      privacyAwareness: { type: Type.INTEGER },
      professionalResponsibility: { type: Type.INTEGER },
      summaryFeedback: { type: Type.STRING },
    },
    required: ['problemSolving', 'technicalAccuracy', 'decisionMaking', 'communication', 'timeManagement', 'summaryFeedback'],
  };

  const fallbackRubric = () => ({
    problemSolving: Math.min(96, avgStage + 2),
    technicalAccuracy: Math.max(35, avgStage - 1),
    decisionMaking: avgStage,
    communication: Math.min(95, avgStage + 1),
    timeManagement: timeScore,
    safetyAwareness: simKind === 'ethical_arena' ? avgStage : undefined,
    fairness: simKind === 'ethical_arena' ? Math.max(40, avgStage - 2) : undefined,
    privacyAwareness: simKind === 'ethical_arena' ? Math.min(96, avgStage + 3) : undefined,
    professionalResponsibility: simKind === 'ethical_arena' ? avgStage : undefined,
    summaryFeedback: `Completed all ${stages.length} stages of "${String(row.title)}" with ${avgStage}% composite readiness. Applied ${skillApplied} practical reasoning and recorded progress into your Skill DNA.`,
  });

  const { data: finalRubric } = await callGeminiJson<
    SimulationRubricScores & { summaryFeedback: string }
  >(
    `Produce a balanced workplace simulation rubric evaluation for ZyraTech (${simKind}). ${getUserLanguageInstruction(params.userId)}`,
    `Simulation: ${String(row.title)}\nStages & Student Responses: ${JSON.stringify(stages.map((s) => ({ title: s.title, response: s.studentResponse, score: s.stageScore, elapsed: s.elapsedSeconds })))}`,
    rubricSchema,
    fallbackRubric
  );

  const rubric: SimulationRubricScores = {
    problemSolving: Math.max(30, Math.min(98, Number(finalRubric.problemSolving) || avgStage)),
    technicalAccuracy: Math.max(30, Math.min(98, Number(finalRubric.technicalAccuracy) || avgStage)),
    decisionMaking: Math.max(30, Math.min(98, Number(finalRubric.decisionMaking) || avgStage)),
    communication: Math.max(30, Math.min(98, Number(finalRubric.communication) || avgStage)),
    timeManagement: Math.max(30, Math.min(98, Number(finalRubric.timeManagement) || timeScore)),
    ...(simKind === 'ethical_arena'
      ? {
          safetyAwareness: Math.max(30, Math.min(98, Number(finalRubric.safetyAwareness) || avgStage)),
          fairness: Math.max(30, Math.min(98, Number(finalRubric.fairness) || avgStage)),
          privacyAwareness: Math.max(30, Math.min(98, Number(finalRubric.privacyAwareness) || avgStage)),
          professionalResponsibility: Math.max(30, Math.min(98, Number(finalRubric.professionalResponsibility) || avgStage)),
        }
      : {}),
  };

  const overallScore = Math.round(
    (rubric.problemSolving +
      rubric.technicalAccuracy +
      rubric.decisionMaking +
      rubric.communication +
      rubric.timeManagement) /
      5
  );

  const totalMins = Math.max(10, Math.round(stages.reduce((acc, s) => acc + (s.elapsedSeconds ?? 60), 0) / 60));

  db.transaction(() => {
    db.prepare(`
      UPDATE workplace_simulations
      SET current_stage = ?, stages = ?, rubric = ?, overall_score = ?, summary_feedback = ?, status = 'completed', completed_at = ?
      WHERE id = ?
    `).run(stages.length, JSON.stringify(stages), JSON.stringify(rubric), overallScore, finalRubric.summaryFeedback, now, params.simId);

    const existingSkill = db
      .prepare('SELECT * FROM learner_skills WHERE user_id = ? AND LOWER(skill_name) = LOWER(?)')
      .get(params.userId, skillApplied) as Record<string, unknown> | undefined;

    if (existingSkill) {
      const nextPractical = Math.round((Number(existingSkill.practical_score) + rubric.technicalAccuracy) / 2);
      const nextPS = Math.round((Number(existingSkill.problem_solving_score) + rubric.problemSolving) / 2);
      const nextVerified = Math.min(98, Math.round(Math.max(Number(existingSkill.verified_score), overallScore * 0.92)));
      const nextStatus =
        existingSkill.verification_status === 'project_verified' ? 'project_verified' : 'assessment_verified';

      db.prepare(`
        UPDATE learner_skills
        SET verified_score = ?, practical_score = ?, problem_solving_score = ?,
            verification_status = ?, retention_score = MIN(98, retention_score + 10),
            last_practiced_at = ?, decay_risk = 'low', updated_at = ?
        WHERE id = ?
      `).run(nextVerified, nextPractical, nextPS, nextStatus, now, now, String(existingSkill.id));
    }

    db.prepare(`
      INSERT INTO progress_records (id, user_id, activity_type, skill_name, title, minutes_spent, score, recorded_at)
      VALUES (?, ?, 'assessment', ?, ?, ?, ?, ?)
    `).run(uid('pr'), params.userId, skillApplied, String(row.title), totalMins, overallScore, now);
  })();

  await orchestrateLearningEvent({
    userId: params.userId,
    triggerEvent: 'ASSESSMENT_SUBMITTED',
    context: {
      skillName: skillApplied,
      score: overallScore,
      weakConcepts: overallScore < 65 ? [`${skillApplied} Workplace Decisions`] : [],
    },
  });

  const simulation: WorkplaceSimulationItem = {
    id: String(row.id),
    userId: params.userId,
    simKind,
    careerId: String(row.career_id),
    title: String(row.title),
    difficulty: row.difficulty as WorkplaceSimulationItem['difficulty'],
    currentStage: stages.length,
    totalStages: stages.length,
    stages,
    rubric,
    overallScore,
    summaryFeedback: finalRubric.summaryFeedback,
    skillApplied,
    status: 'completed',
    createdAt: String(row.created_at),
    completedAt: now,
  };

  const workspace = getLearnerWorkspace(params.userId)!;
  return { simulation, workspace };
}

// ============================================================================
// E. PARALLEL CAREER CHALLENGE (3 ROLES · UNIFIED RUBRIC · EVIDENCE COMPARISON)
// ============================================================================
export function startParallelChallenge(userId: string): ParallelChallengeItem {
  const id = uid('pcc');
  const now = new Date().toISOString();

  const tasks: ParallelRoleTaskResult[] = [
    {
      careerId: 'full-stack-developer',
      careerTitle: 'Software Developer',
      taskTitle: 'Task 1 · Order Total & Double-Click Bug',
      taskPrompt:
        'A checkout function miscalculates discounts when couponPercent is 0 or null and submits twice on rapid clicks. Explain the root bug and write the safe corrected JavaScript/TypeScript calculation + guard.',
      codeOrContext: `function calcTotal(price, couponPercent) {\n  const discount = couponPercent || 10; // Bug: 0 falls back to 10%!\n  return price - (price * discount / 100);\n}`,
      studentSubmission: '',
      technicalExecution: 0,
      analyticalReasoning: 0,
      edgeCaseRigor: 0,
      clarity: 0,
      overallScore: 0,
      evidenceNote: '',
    },
    {
      careerId: 'cybersecurity-analyst',
      careerTitle: 'Cybersecurity Analyst',
      taskTitle: 'Task 2 · Token & Login Endpoint Triage',
      taskPrompt:
        'Inspect this login route. Identify at least 2 security flaws (injection, timing/plaintext compare, missing rate-limit or cookie flags) and specify exact fixes.',
      codeOrContext: `app.post('/login', (req, res) => {\n  const user = db.prepare("SELECT * FROM users WHERE email='" + req.body.email + "'").get();\n  if (user && user.password === req.body.password) res.cookie('sid', user.id).json({ ok: true });\n});`,
      studentSubmission: '',
      technicalExecution: 0,
      analyticalReasoning: 0,
      edgeCaseRigor: 0,
      clarity: 0,
      overallScore: 0,
      evidenceNote: '',
    },
    {
      careerId: 'data-scientist',
      careerTitle: 'Data Scientist',
      taskTitle: 'Task 3 · Experiment Evaluation & Bias Check',
      taskPrompt:
        'An online course A/B test shows Group B had 12% higher test scores, but Group B only contains honors-track students who opted in early. Explain why this comparison is flawed and how to analyze it accurately.',
      codeOrContext: `Group A (n=400, mandatory cohort): avg 68%\nGroup B (n=65, self-selected early opt-in): avg 80%\nMissing data: 30% of Group A never opened Week 3 quiz.`,
      studentSubmission: '',
      technicalExecution: 0,
      analyticalReasoning: 0,
      edgeCaseRigor: 0,
      clarity: 0,
      overallScore: 0,
      evidenceNote: '',
    },
  ];

  const disclaimer =
    'Parallel Challenge compares observed performance across three standardized tasks on unified criteria. It indicates demonstrated affinity and current strengths — never a guaranteed job outcome.';

  db.prepare(`
    INSERT INTO parallel_career_challenges (
      id, user_id, tasks, recommended_career_id, recommended_career_title,
      evidence_summary, disclaimer, status, created_at, completed_at
    ) VALUES (?, ?, ?, '', '', '', ?, 'active', ?, NULL)
  `).run(id, userId, JSON.stringify(tasks), disclaimer, now);

  return {
    id,
    userId,
    tasks,
    recommendedCareerId: '',
    recommendedCareerTitle: '',
    evidenceSummary: '',
    disclaimer,
    status: 'active',
    createdAt: now,
    completedAt: null,
  };
}

export async function submitParallelChallenge(params: {
  userId: string;
  challengeId: string;
  submissions: Record<string, string>;
}): Promise<{ challenge: ParallelChallengeItem; workspace: LearnerWorkspaceData }> {
  const row = db
    .prepare('SELECT * FROM parallel_career_challenges WHERE id = ? AND user_id = ?')
    .get(params.challengeId, params.userId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Parallel Career Challenge session not found.');

  const tasks = JSON.parse(String(row.tasks || '[]')) as ParallelRoleTaskResult[];
  const payloadForEval = tasks.map((t) => ({
    careerId: t.careerId,
    careerTitle: t.careerTitle,
    prompt: t.taskPrompt,
    submission: (params.submissions[t.careerId] || '').trim(),
  }));

  const schema = {
    type: Type.OBJECT,
    properties: {
      evaluations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            careerId: { type: Type.STRING },
            technicalExecution: { type: Type.INTEGER },
            analyticalReasoning: { type: Type.INTEGER },
            edgeCaseRigor: { type: Type.INTEGER },
            clarity: { type: Type.INTEGER },
            evidenceNote: { type: Type.STRING },
          },
          required: ['careerId', 'technicalExecution', 'analyticalReasoning', 'edgeCaseRigor', 'clarity', 'evidenceNote'],
        },
      },
      evidenceSummary: { type: Type.STRING },
    },
    required: ['evaluations', 'evidenceSummary'],
  };

  const fallbackEval = () => {
    const evaluations = payloadForEval.map((p) => {
      const len = p.submission.length;
      const bonusTerms =
        p.careerId === 'full-stack-developer'
          ? ['null', '??', 'undefined', 'disabled', 'idempot', '==='].filter((k) => p.submission.toLowerCase().includes(k)).length
          : p.careerId === 'cybersecurity-analyst'
            ? ['parameter', '?', 'hash', 'bcrypt', 'httponly', 'rate', 'sql injection'].filter((k) => p.submission.toLowerCase().includes(k)).length
            : ['selection bias', 'confound', 'random', 'missing', 'sample', 'imbalance', 'control'].filter((k) => p.submission.toLowerCase().includes(k)).length;
      const base = Math.min(92, Math.max(38, 44 + Math.floor(len / 14) + bonusTerms * 7));
      return {
        careerId: p.careerId,
        technicalExecution: base,
        analyticalReasoning: Math.min(95, base + 2),
        edgeCaseRigor: Math.max(35, base - 3 + bonusTerms * 2),
        clarity: Math.min(94, 48 + Math.floor(len / 16)),
        evidenceNote:
          bonusTerms >= 2
            ? `Identified key domain mechanics (${bonusTerms} domain signals detected) with clear explanation.`
            : `Provided baseline reasoning (${len} chars); strengthen edge-case specificity for stronger proof.`,
      };
    });
    const sorted = [...evaluations].sort(
      (a, b) =>
        b.technicalExecution + b.analyticalReasoning + b.edgeCaseRigor + b.clarity -
        (a.technicalExecution + a.analyticalReasoning + a.edgeCaseRigor + a.clarity)
    );
    const best = tasks.find((t) => t.careerId === sorted[0]?.careerId)?.careerTitle || 'Software Developer';
    return {
      evaluations,
      evidenceSummary: `Across unified criteria, strongest demonstrated performance appeared in ${best} based on edge-case rigor and analytical precision in your submissions.`,
    };
  };

  const { data } = await callGeminiJson(
    `Evaluate all 3 career tasks using strict unified scoring (Technical Execution, Analytical Reasoning, Edge-Case Rigor, Clarity from 30-98). Compare fairly and conservatively with concrete evidence — never promise career outcomes. ${getUserLanguageInstruction(params.userId)}`,
    `Evaluate submissions:\n${JSON.stringify(payloadForEval)}`,
    schema,
    fallbackEval
  );

  const updatedTasks: ParallelRoleTaskResult[] = tasks.map((t) => {
    const ev = (data.evaluations || []).find((e) => e.careerId === t.careerId) || fallbackEval().evaluations[0];
    const tech = Math.max(30, Math.min(98, Number(ev.technicalExecution) || 60));
    const ana = Math.max(30, Math.min(98, Number(ev.analyticalReasoning) || 60));
    const edge = Math.max(30, Math.min(98, Number(ev.edgeCaseRigor) || 60));
    const clar = Math.max(30, Math.min(98, Number(ev.clarity) || 60));
    const overallScore = Math.round((tech + ana + edge + clar) / 4);
    return {
      ...t,
      studentSubmission: (params.submissions[t.careerId] || '').trim(),
      technicalExecution: tech,
      analyticalReasoning: ana,
      edgeCaseRigor: edge,
      clarity: clar,
      overallScore,
      evidenceNote: ev.evidenceNote,
    };
  });

  const winner = [...updatedTasks].sort((a, b) => b.overallScore - a.overallScore)[0];
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      UPDATE parallel_career_challenges
      SET tasks = ?, recommended_career_id = ?, recommended_career_title = ?,
          evidence_summary = ?, status = 'completed', completed_at = ?
      WHERE id = ?
    `).run(
      JSON.stringify(updatedTasks),
      winner.careerId,
      winner.careerTitle,
      data.evidenceSummary,
      now,
      params.challengeId
    );

    db.prepare(`
      INSERT INTO progress_records (id, user_id, activity_type, skill_name, title, minutes_spent, score, recorded_at)
      VALUES (?, ?, 'assessment', ?, 'Parallel Career Discovery Challenge', 20, ?, ?)
    `).run(uid('pr'), params.userId, winner.careerTitle, winner.overallScore, now);
  })();

  const challenge: ParallelChallengeItem = {
    id: String(row.id),
    userId: params.userId,
    tasks: updatedTasks,
    recommendedCareerId: winner.careerId,
    recommendedCareerTitle: winner.careerTitle,
    evidenceSummary: data.evidenceSummary,
    disclaimer: String(row.disclaimer),
    status: 'completed',
    createdAt: String(row.created_at),
    completedAt: now,
  };

  const workspace = getLearnerWorkspace(params.userId)!;
  return { challenge, workspace };
}

// ============================================================================
// H. REVERSE TEACHING CHALLENGE (STUDENT TEACHES ZYRA + PROBING FOLLOW-UP)
// ============================================================================
export async function startReverseTeaching(params: {
  userId: string;
  skillName: string;
  conceptTitle: string;
  explanation: string;
}): Promise<{ session: ReverseTeachingItem; workspace: LearnerWorkspaceData }> {
  const schema = {
    type: Type.OBJECT,
    properties: {
      followUpQuestion: { type: Type.STRING },
    },
    required: ['followUpQuestion'],
  };

  const fallbackQuestion = () => ({
    followUpQuestion: `Thanks for explaining "${params.conceptTitle}" in ${params.skillName}! Suppose an edge case happens — invalid/empty input or concurrent requests. How does your explanation handle that failure boundary?`,
  });

  const { data } = await callGeminiJson<{ followUpQuestion: string }>(
    `You are Zyra acting as a curious student in Reverse Teaching Challenge. Read the learner's explanation of "${params.conceptTitle}" (${params.skillName}), spot 1 potential gap, edge case, or hidden assumption, and ask ONE crisp probing follow-up question to test true conceptual understanding. ${getUserLanguageInstruction(params.userId)}`,
    `Student Explanation:\n${params.explanation}`,
    schema,
    fallbackQuestion
  );

  const id = uid('rt');
  const now = new Date().toISOString();
  const question = data.followUpQuestion || fallbackQuestion().followUpQuestion;

  db.prepare(`
    INSERT INTO reverse_teaching_sessions (
      id, user_id, skill_name, concept_title, student_explanation, companion_followup_question,
      student_followup_answer, clarity_score, conceptual_depth_score, missing_concepts,
      misconceptions, feedback, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, '[]', '[]', NULL, 'awaiting_followup', ?)
  `).run(id, params.userId, params.skillName, params.conceptTitle, params.explanation, question, now);

  const session: ReverseTeachingItem = {
    id,
    userId: params.userId,
    skillName: params.skillName,
    conceptTitle: params.conceptTitle,
    studentExplanation: params.explanation,
    companionFollowUpQuestion: question,
    studentFollowUpAnswer: null,
    clarityScore: null,
    conceptualDepthScore: null,
    missingConcepts: [],
    misconceptions: [],
    feedback: null,
    status: 'awaiting_followup',
    createdAt: now,
  };

  const workspace = getLearnerWorkspace(params.userId)!;
  return { session, workspace };
}

export async function completeReverseTeaching(params: {
  userId: string;
  sessionId: string;
  followUpAnswer: string;
}): Promise<{ session: ReverseTeachingItem; workspace: LearnerWorkspaceData }> {
  const row = db
    .prepare('SELECT * FROM reverse_teaching_sessions WHERE id = ? AND user_id = ?')
    .get(params.sessionId, params.userId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Reverse Teaching session not found.');

  const skillName = String(row.skill_name);
  const conceptTitle = String(row.concept_title);
  const explanation = String(row.student_explanation);
  const followUpQ = String(row.companion_followup_question);

  const schema = {
    type: Type.OBJECT,
    properties: {
      clarityScore: { type: Type.INTEGER },
      conceptualDepthScore: { type: Type.INTEGER },
      missingConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
      misconceptions: { type: Type.ARRAY, items: { type: Type.STRING } },
      feedback: { type: Type.STRING },
    },
    required: ['clarityScore', 'conceptualDepthScore', 'missingConcepts', 'misconceptions', 'feedback'],
  };

  const fallback = () => {
    const combinedLen = explanation.trim().length + params.followUpAnswer.trim().length;
    const clarity = Math.min(92, Math.max(45, 50 + Math.floor(explanation.length / 12)));
    const depth = Math.min(94, Math.max(42, 46 + Math.floor(combinedLen / 18)));
    return {
      clarityScore: clarity,
      conceptualDepthScore: depth,
      missingConcepts: depth < 72 ? [`Failure boundary example for ${conceptTitle}`] : [],
      misconceptions: combinedLen < 70 ? ['Explanation needs concrete input->process->output mechanics rather than summary words'] : [],
      feedback:
        depth >= 75
          ? `Great teaching clarity on "${conceptTitle}"! You connected the core mechanism and handled the follow-up boundary well.`
          : `Good intuitive start on "${conceptTitle}", though your follow-up answer should walk through concrete runtime behavior step by step.`,
    };
  };

  const { data } = await callGeminiJson<{
    clarityScore: number;
    conceptualDepthScore: number;
    missingConcepts: string[];
    misconceptions: string[];
    feedback: string;
  }>(
    `Evaluate this Reverse Teaching session honestly. Score clarityScore and conceptualDepthScore (30-98), list concrete missingConcepts and misconceptions if any, and give warm, constructive feedback as Zyra. ${getUserLanguageInstruction(params.userId)}`,
    `Skill: ${skillName}\nConcept: ${conceptTitle}\nInitial Teaching: ${explanation}\nZyra Follow-Up Question: ${followUpQ}\nStudent Follow-Up Answer: ${params.followUpAnswer}`,
    schema,
    fallback
  );

  const clarityScore = Math.max(30, Math.min(98, Number(data.clarityScore) || 70));
  const conceptualDepthScore = Math.max(30, Math.min(98, Number(data.conceptualDepthScore) || 70));
  const avgScore = Math.round((clarityScore + conceptualDepthScore) / 2);
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      UPDATE reverse_teaching_sessions
      SET student_followup_answer = ?, clarity_score = ?, conceptual_depth_score = ?,
          missing_concepts = ?, misconceptions = ?, feedback = ?, status = 'completed'
      WHERE id = ?
    `).run(
      params.followUpAnswer,
      clarityScore,
      conceptualDepthScore,
      JSON.stringify(data.missingConcepts || []),
      JSON.stringify(data.misconceptions || []),
      data.feedback,
      params.sessionId
    );

    const existingSkill = db
      .prepare('SELECT * FROM learner_skills WHERE user_id = ? AND LOWER(skill_name) = LOWER(?)')
      .get(params.userId, skillName) as Record<string, unknown> | undefined;

    if (existingSkill) {
      const nextTheory = Math.round((Number(existingSkill.theory_score) + avgScore) / 2);
      const nextVerified = Math.min(96, Math.max(Number(existingSkill.verified_score), Math.round(avgScore * 0.9)));
      db.prepare(`
        UPDATE learner_skills
        SET theory_score = ?, verified_score = ?,
            retention_score = MIN(98, retention_score + 14),
            last_practiced_at = ?, decay_risk = 'low', updated_at = ?
        WHERE id = ?
      `).run(nextTheory, nextVerified, now, now, String(existingSkill.id));
    }

    if (avgScore >= 75) {
      db.prepare(`
        UPDATE failure_dna_records
        SET status = 'recovered', resolved_at = ?
        WHERE user_id = ? AND LOWER(skill_name) = LOWER(?) AND status != 'recovered'
      `).run(now, params.userId, skillName);
    }

    db.prepare(`
      INSERT INTO progress_records (id, user_id, activity_type, skill_name, title, minutes_spent, score, recorded_at)
      VALUES (?, ?, 'revision', ?, ?, 15, ?, ?)
    `).run(uid('pr'), params.userId, skillName, `Reverse Teaching: ${conceptTitle}`, avgScore, now);
  })();

  const session: ReverseTeachingItem = {
    id: String(row.id),
    userId: params.userId,
    skillName,
    conceptTitle,
    studentExplanation: explanation,
    companionFollowUpQuestion: followUpQ,
    studentFollowUpAnswer: params.followUpAnswer,
    clarityScore,
    conceptualDepthScore,
    missingConcepts: data.missingConcepts || [],
    misconceptions: data.misconceptions || [],
    feedback: data.feedback,
    status: 'completed',
    createdAt: String(row.created_at),
  };

  const workspace = getLearnerWorkspace(params.userId)!;
  return { session, workspace };
}

// ============================================================================
// J. REAL-WORLD COMMUNITY MISSIONS (VERIFIED -> LEARNER PROJECTS)
// ============================================================================
export async function submitCommunityMission(params: {
  userId: string;
  missionId: string;
  solutionSummary: string;
  implementationProof: string;
  repoOrDemoLink: string;
  impactNotes: string;
}): Promise<{ submission: CommunityMissionSubmission; workspace: LearnerWorkspaceData }> {
  const template = COMMUNITY_MISSIONS_CATALOG.find((m) => m.id === params.missionId);
  if (!template) throw new Error('Community mission template not found.');

  const verification = await verifyProjectWithAI({
    userId: params.userId,
    title: `Community Mission: ${template.title}`,
    skillName: template.skillFocus,
    description: `${template.problemStatement} Impact: ${params.impactNotes}`,
    submissionNotes: `${params.solutionSummary}\n\nImplementation Proof:\n${params.implementationProof}`,
    repoOrDemoLink: params.repoOrDemoLink,
  });

  const id = uid('cm');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO community_missions (
      id, user_id, mission_id, title, skill_name, career_id, solution_summary,
      implementation_proof, repo_or_demo_link, impact_notes, ai_score, ai_feedback,
      linked_project_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.userId,
    template.id,
    template.title,
    template.skillFocus,
    template.careerId,
    params.solutionSummary,
    params.implementationProof,
    params.repoOrDemoLink || '',
    params.impactNotes || '',
    verification.score ?? 75,
    verification.feedback || 'Verified community deliverable.',
    verification.projectId,
    now
  );

  const submission: CommunityMissionSubmission = {
    id,
    userId: params.userId,
    missionId: template.id,
    title: template.title,
    skillName: template.skillFocus,
    careerId: template.careerId,
    solutionSummary: params.solutionSummary,
    implementationProof: params.implementationProof,
    repoOrDemoLink: params.repoOrDemoLink || '',
    impactNotes: params.impactNotes || '',
    aiScore: verification.score ?? 75,
    aiFeedback: verification.feedback || 'Verified community deliverable.',
    linkedProjectId: verification.projectId,
    createdAt: now,
  };

  const workspace = getLearnerWorkspace(params.userId)!;
  return { submission, workspace };
}
