export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const TOKEN_KEY = 'zyratech_auth_token';
let memoryToken: string | null = null;

function readStoredAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setStoredAuthToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore iframe storage restrictions
  }
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = readStoredAuthToken();
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || 'Unexpected server response' };
  }

  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: string }).error)
        : `Request failed with status ${res.status}`;
    throw new ApiError(msg, res.status);
  }

  return data as T;
}

export type PageRoute =
  | 'landing'
  | 'auth'
  | 'onboarding'
  | 'dashboard'
  | 'skill-dna'
  | 'careers'
  | 'syllabus'
  | 'simulator'
  | 'assessments'
  | 'roadmap'
  | 'learning-hub'
  | 'mentor'
  | 'analytics'
  | 'decay'
  | 'interview'
  | 'profile'
  | 'workplace-sim'
  | 'career-arena'
  | 'admin';

export interface AssessmentLaunchContext {
  skill?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  assessmentType?: 'mixed' | 'mcq' | 'coding' | 'conceptual' | 'debugging' | 'scenario' | 'project_coding';
  assessmentMode?: 'daily_portal' | 'practice_workplace';
  courseCode?: string;
  moduleCode?: string;
  arenaTab?: 'parallel' | 'reverse-teaching' | 'escape-room' | 'community' | 'ethical';
  careerId?: string;
  simKind?: 'workday' | 'boss_challenge' | 'escape_room' | 'ethical_arena';
}

export function formatLearningStyle(style: string): string {
  switch (style) {
    case 'interactive_coding':
      return 'Interactive Coding';
    case 'hands_on_projects':
      return 'Hands-On Projects';
    case 'video_tutorials':
      return 'Video Tutorials';
    case 'documentation_reading':
      return 'Documentation & Guides';
    default:
      return style;
  }
}

export function formatVerificationStatus(status: string): string {
  switch (status) {
    case 'project_verified':
      return 'Project Verified';
    case 'assessment_verified':
      return 'Assessment Verified';
    default:
      return 'Self-Declared';
  }
}

export function formatRelativeDays(isoDate: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000));
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}
