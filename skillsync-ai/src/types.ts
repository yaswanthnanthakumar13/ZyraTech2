export type VerificationStatus =
  | 'self_declared'
  | 'assessment_verified'
  | 'project_verified';

export type DecayRisk = 'low' | 'moderate' | 'high';

export type LearningStyle =
  | 'hands_on_projects'
  | 'interactive_coding'
  | 'video_tutorials'
  | 'documentation_reading';

export type UserRole = 'student' | 'admin';

export type SupportedLanguage = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'bn' | 'mr';

export interface User {
  id: string;
  email: string;
  rollNumber: string;
  role: UserRole;
  fullName: string;
  preferredLanguage: SupportedLanguage;
  isDemo: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

export interface LearnerProfile {
  userId: string;
  educationLevel: string;
  institution: string;
  university: string;
  githubUrl: string;
  linkedinUrl: string;
  nonTechnicalSkills: string[];
  certifications: string[];
  previousProjects: Array<{
    title: string;
    description: string;
    technologies: string[];
  }>;
  workExperience: string;
  careerInterests: string[];
  targetCareerId: string;
  dailyLearningMinutes: number;
  preferredLearningStyle: LearningStyle;
  resumeText: string;
  streakDays: number;
  onboardingCompleted: boolean;
  updatedAt: string;
}

export interface SkillDNA {
  id: string;
  userId: string;
  skillName: string;
  category: string;
  selfDeclaredScore: number;
  verifiedScore: number;
  verificationStatus: VerificationStatus;
  theoryScore: number;
  practicalScore: number;
  problemSolvingScore: number;
  projectScore: number;
  retentionScore: number;
  lastPracticedAt: string;
  decayRisk: DecayRisk;
  weakConcepts: string[];
  updatedAt: string;
}

export interface CareerSkillRequirement {
  skillName: string;
  requiredLevel: number;
  importance: 'core' | 'important' | 'nice_to_have';
  category: string;
}

export interface RoleCourse {
  id: string;
  careerId: string;
  courseCode: string;
  title: string;
  level: 'Foundation' | 'Core' | 'Applied' | 'Capstone';
  credits: number;
  hours: number;
  description: string;
  syllabusModules: Array<{
    moduleCode: string;
    title: string;
    topics: string[];
    skillFocus: string;
    codingExercise?: {
      title: string;
      prompt: string;
      starterCode: string;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
    };
  }>;
  prerequisites: string[];
}

export interface CareerRole {
  id: string;
  title: string;
  category: string;
  description: string;
  medianSalaryRange: string;
  demandOutlook: string;
  careerGuidance: string;
  requiredSoftSkills: string[];
  recommendedTools: string[];
  relevantCertifications: string[];
  projectExpectations: string[];
  requirements: CareerSkillRequirement[];
  courses: RoleCourse[];
}

export interface CareerCompatibility {
  career: CareerRole;
  compatibilityScore: number;
  indicativeReadinessEstimate: number;
  metSkills: Array<{
    skillName: string;
    currentScore: number;
    requiredLevel: number;
    verificationStatus: VerificationStatus;
  }>;
  missingSkills: Array<{
    skillName: string;
    currentScore: number;
    requiredLevel: number;
    gap: number;
    importance: string;
  }>;
  transferableSkills: string[];
  estimatedLearningHours: number;
}

export interface AssessmentQuestion {
  id: string;
  questionIndex: number;
  questionType: 'mcq' | 'coding' | 'conceptual' | 'debugging' | 'scenario';
  prompt: string;
  codeSnippet: string | null;
  options: string[];
  correctAnswer?: string;
  explanation?: string;
  careerLogic?: string;
  conceptTag: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
  aiEvaluation: string | null;
}

export interface SkillAssessment {
  id: string;
  userId: string;
  adminAssessmentId: string | null;
  title: string;
  skillName: string;
  careerId: string;
  courseCode: string;
  moduleCode: string;
  assessmentMode: 'daily_portal' | 'practice_workplace';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  assessmentType: 'mixed' | 'mcq' | 'coding' | 'conceptual' | 'debugging' | 'scenario' | 'project_coding';
  status: 'in_progress' | 'completed' | 'terminated_proctoring';
  score: number | null;
  totalQuestions: number;
  correctCount: number | null;
  tabSwitchCount: number;
  weakConcepts: string[];
  feedback: string | null;
  createdAt: string;
  completedAt: string | null;
  questions?: AssessmentQuestion[];
}

export interface AdminAssessment {
  id: string;
  title: string;
  careerId: string;
  skillName: string;
  courseCode: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationMinutes: number;
  passingScore: number;
  maxTabSwitches: number;
  isPublished: boolean;
  createdBy: string;
  questions: Array<{
    questionType: 'mcq' | 'coding' | 'conceptual' | 'debugging' | 'scenario';
    prompt: string;
    codeSnippet?: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    careerLogic?: string;
    conceptTag: string;
  }>;
  createdAt: string;
}

export interface ProctoringLog {
  id: string;
  userId: string;
  studentName?: string;
  rollNumber?: string;
  assessmentId: string;
  assessmentTitle: string;
  switchCount: number;
  eventType: 'tab_switch' | 'fullscreen_exit' | 'window_blur' | 'terminated';
  details: string;
  createdAt: string;
}

export interface SyllabusRecommendation {
  id: string;
  userId: string;
  careerId: string;
  courseCode: string;
  courseTitle: string;
  moduleCode: string;
  recommendedModuleTitle: string;
  skillFocus: string;
  rationale: string;
  topics: string[];
  estimatedHours: number;
  priority: 'critical' | 'recommended' | 'enrichment';
  createdAt: string;
}

export interface RoadmapMilestone {
  id: string;
  roadmapId: string;
  stageOrder: number;
  skillName: string;
  title: string;
  learningObjective: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  status: 'locked' | 'available' | 'in_progress' | 'needs_revision' | 'completed';
  completionCriteria: string;
  practicalExercise: string;
  miniProject: string;
  isReusableTransfer: boolean;
  assessmentRequired: boolean;
  lastAssessmentScore: number | null;
  adaptedNote: string | null;
}

export interface LearningRoadmap {
  id: string;
  userId: string;
  careerId: string;
  careerTitle: string;
  status: string;
  compatibilityScore: number;
  readinessEstimate: number;
  estimatedTotalHours: number;
  adaptationReason: string;
  createdAt: string;
  updatedAt: string;
  milestones: RoadmapMilestone[];
}

export interface LearningResource {
  id: string;
  skillName: string;
  title: string;
  provider: string;
  resourceType: 'youtube' | 'documentation' | 'course' | 'practice' | 'opensource' | 'article';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learningStyle: LearningStyle;
  url: string;
  description: string;
  estimatedMinutes: number;
  isVerifiedUrl: boolean;
  bookmarked?: boolean;
}

export interface ProgressRecord {
  id: string;
  userId: string;
  activityType: 'assessment' | 'roadmap_stage' | 'revision' | 'project' | 'resource' | 'interview';
  skillName: string;
  title: string;
  minutesSpent: number;
  score: number | null;
  recordedAt: string;
}

export interface AgentOutputRecord {
  agentName: string;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
}

export interface AIAgentDecision {
  id: string;
  userId: string;
  triggerEvent: string;
  orchestratorSummary: string;
  agentOutputs: AgentOutputRecord[];
  nextAction: string;
  explanation: string;
  createdAt: string;
}

export interface CareerGoalHistoryItem {
  id: string;
  userId: string;
  fromCareerId: string | null;
  toCareerId: string;
  compatibilityBefore: number;
  compatibilityAfter: number;
  preservedSkills: string[];
  changedAt: string;
}

export interface MentorMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  contextTag: string | null;
  createdAt: string;
}

export interface RevisionScheduleItem {
  id: string;
  userId: string;
  skillName: string;
  reason: string;
  urgency: 'low' | 'moderate' | 'high';
  dueDate: string;
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface LearnerProject {
  id: string;
  userId: string;
  title: string;
  skillName: string;
  careerId: string;
  description: string;
  submissionNotes: string;
  repoOrDemoLink: string;
  aiVerificationScore: number | null;
  aiFeedback: string | null;
  status: 'in_progress' | 'verified';
  createdAt: string;
}

export interface MockInterviewMessage {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: string;
}

export interface MockInterviewEvaluation {
  technicalAccuracy: number;
  problemSolvingApproach: number;
  explanationQuality: number;
  communicationStructure: number;
  responseClarityIndicator: number;
  eyeContactScore?: number;
  screenFocusScore?: number;
  strengths: string[];
  improvementAreas: string[];
  summary: string;
  disclaimer: string;
}

export interface MockInterview {
  id: string;
  userId: string;
  careerId: string;
  interviewType: 'technical' | 'coding' | 'behavioral' | 'career_specific';
  messages: MockInterviewMessage[];
  evaluation: MockInterviewEvaluation | null;
  readinessScore: number | null;
  status: 'active' | 'completed';
  createdAt: string;
}

export interface ModuleProgressItem {
  courseCode: string;
  courseTitle: string;
  moduleCode: string;
  moduleTitle: string;
  skillFocus: string;
  completionPercent: number;
  attended: boolean;
  latestScore: number | null;
}

export type CompanionChatMode = 'english' | 'tamil' | 'tanglish';

export interface CompanionBriefing {
  companionName: string;
  mood: 'celebrating' | 'encouraging' | 'focused';
  greeting: string;
  memoryHighlight: string;
  suggestedActionLabel: string;
  suggestedRoute: string;
  recentAchievement: string | null;
}

export interface SimulationTwistEvent {
  speaker: 'AI Manager' | 'AI Client' | 'AI Teammate' | 'System Alert';
  roleLabel: string;
  message: string;
  requirementChange: string;
}

export interface SimulationRubricScores {
  problemSolving: number;
  technicalAccuracy: number;
  decisionMaking: number;
  communication: number;
  timeManagement: number;
  safetyAwareness?: number;
  fairness?: number;
  privacyAwareness?: number;
  professionalResponsibility?: number;
}

export interface WorkplaceSimulationStage {
  stageNumber: number;
  title: string;
  deadlineSeconds: number;
  briefing: string;
  artifactSnippet: string;
  twist?: SimulationTwistEvent | null;
  promptQuestion: string;
  options?: string[];
  studentResponse?: string;
  elapsedSeconds?: number;
  stageFeedback?: string;
  stageScore?: number;
}

export interface WorkplaceSimulationItem {
  id: string;
  userId: string;
  simKind: 'workday' | 'boss_challenge' | 'escape_room' | 'ethical_arena';
  careerId: string;
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  currentStage: number;
  totalStages: number;
  stages: WorkplaceSimulationStage[];
  rubric: SimulationRubricScores | null;
  overallScore: number | null;
  summaryFeedback: string | null;
  skillApplied: string;
  status: 'active' | 'completed';
  createdAt: string;
  completedAt: string | null;
}

export interface ParallelRoleTaskResult {
  careerId: string;
  careerTitle: string;
  taskTitle: string;
  taskPrompt: string;
  codeOrContext: string;
  studentSubmission: string;
  technicalExecution: number;
  analyticalReasoning: number;
  edgeCaseRigor: number;
  clarity: number;
  overallScore: number;
  evidenceNote: string;
}

export interface ParallelChallengeItem {
  id: string;
  userId: string;
  tasks: ParallelRoleTaskResult[];
  recommendedCareerId: string;
  recommendedCareerTitle: string;
  evidenceSummary: string;
  disclaimer: string;
  status: 'active' | 'completed';
  createdAt: string;
  completedAt: string | null;
}

export interface FailureDNAItem {
  id: string;
  userId: string;
  skillName: string;
  conceptTag: string;
  failurePattern:
    | 'repeated_mistake'
    | 'problem_solving_failure'
    | 'misunderstood_concept'
    | 'excessive_assistance'
    | 'slow_improvement'
    | 'post_revision_repeat';
  occurrenceCount: number;
  repeatedAfterRevision: boolean;
  diagnosticNote: string;
  recoveryMissionTitle: string;
  recoveryMissionTask: string;
  status: 'active' | 'recovered' | 'relapsed';
  lastDetectedAt: string;
  resolvedAt: string | null;
}

export interface ExpertCouncilMemberFinding {
  agentRole:
    | 'Career Coach Agent'
    | 'Technical Expert Agent'
    | 'Learning Observer Agent'
    | 'Industry Mentor Agent';
  focusArea: string;
  score: number;
  stance: 'advance' | 'reinforce' | 'pivot_explore';
  findings: string[];
  recommendation: string;
}

export interface ExpertCouncilReport {
  id: string;
  userId: string;
  members: ExpertCouncilMemberFinding[];
  agreements: string[];
  disagreements: string[];
  orchestratorVerdict: string;
  appliedSystemUpdates: string[];
  createdAt: string;
}

export interface ReverseTeachingItem {
  id: string;
  userId: string;
  skillName: string;
  conceptTitle: string;
  studentExplanation: string;
  companionFollowUpQuestion: string;
  studentFollowUpAnswer: string | null;
  clarityScore: number | null;
  conceptualDepthScore: number | null;
  missingConcepts: string[];
  misconceptions: string[];
  feedback: string | null;
  status: 'awaiting_followup' | 'completed';
  createdAt: string;
}

export interface CommunityMissionTemplate {
  id: string;
  title: string;
  category: string;
  skillFocus: string;
  careerId: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  problemStatement: string;
  deliverableChecklist: string[];
  estimatedHours: number;
}

export interface CommunityMissionSubmission {
  id: string;
  userId: string;
  missionId: string;
  title: string;
  skillName: string;
  careerId: string;
  solutionSummary: string;
  implementationProof: string;
  repoOrDemoLink: string;
  impactNotes: string;
  aiScore: number;
  aiFeedback: string;
  linkedProjectId: string | null;
  createdAt: string;
}

export interface LearnerWorkspaceData {
  user: User;
  profile: LearnerProfile;
  skills: SkillDNA[];
  roadmap: LearningRoadmap | null;
  assessments: SkillAssessment[];
  publishedTests: AdminAssessment[];
  upcomingSyllabus: SyllabusRecommendation[];
  proctoringLogs: ProctoringLog[];
  progressRecords: ProgressRecord[];
  agentDecisions: AIAgentDecision[];
  careerHistory: CareerGoalHistoryItem[];
  revisions: RevisionScheduleItem[];
  projects: LearnerProject[];
  bookmarks: string[];
  interviews: MockInterview[];
  compatibility: CareerCompatibility | null;
  moduleProgress: ModuleProgressItem[];
  workplaceSimulations: WorkplaceSimulationItem[];
  parallelChallenges: ParallelChallengeItem[];
  failureDna: FailureDNAItem[];
  expertCouncil: ExpertCouncilReport | null;
  reverseTeaching: ReverseTeachingItem[];
  communityMissions: CommunityMissionSubmission[];
  companionBriefing: CompanionBriefing;
}

export interface AdminDashboardData {
  admin: User;
  assessments: AdminAssessment[];
  students: Array<{
    id: string;
    rollNumber: string;
    email: string;
    fullName: string;
    targetCareerId: string;
    completedAssessments: number;
    avgScore: number;
    proctoringViolations: number;
    terminatedTests: number;
  }>;
  proctoringLogs: ProctoringLog[];
  recentSubmissions: Array<{
    id: string;
    studentName: string;
    rollNumber: string;
    title: string;
    skillName: string;
    score: number | null;
    status: string;
    tabSwitchCount: number;
    completedAt: string | null;
  }>;
}
