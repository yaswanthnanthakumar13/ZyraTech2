import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'zyratech.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function ensureColumn(table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      roll_number TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      is_demo INTEGER NOT NULL DEFAULT 0,
      avatar_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learner_profiles (
      user_id TEXT PRIMARY KEY,
      education_level TEXT NOT NULL DEFAULT 'Undergraduate',
      institution TEXT NOT NULL DEFAULT 'ZyraTech University',
      university TEXT NOT NULL DEFAULT 'ZyraTech University',
      github_url TEXT NOT NULL DEFAULT '',
      linkedin_url TEXT NOT NULL DEFAULT '',
      non_technical_skills TEXT NOT NULL DEFAULT '[]',
      certifications TEXT NOT NULL DEFAULT '[]',
      previous_projects TEXT NOT NULL DEFAULT '[]',
      work_experience TEXT NOT NULL DEFAULT '',
      career_interests TEXT NOT NULL DEFAULT '[]',
      target_career_id TEXT NOT NULL DEFAULT 'full-stack-developer',
      daily_learning_minutes INTEGER NOT NULL DEFAULT 60,
      preferred_learning_style TEXT NOT NULL DEFAULT 'interactive_coding',
      resume_text TEXT NOT NULL DEFAULT '',
      streak_days INTEGER NOT NULL DEFAULT 1,
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS career_roles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      median_salary_range TEXT NOT NULL,
      demand_outlook TEXT NOT NULL,
      career_guidance TEXT NOT NULL DEFAULT '',
      required_soft_skills TEXT NOT NULL,
      recommended_tools TEXT NOT NULL,
      relevant_certifications TEXT NOT NULL,
      project_expectations TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS career_skill_requirements (
      id TEXT PRIMARY KEY,
      career_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      required_level INTEGER NOT NULL,
      importance TEXT NOT NULL,
      category TEXT NOT NULL,
      FOREIGN KEY (career_id) REFERENCES career_roles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS role_courses (
      id TEXT PRIMARY KEY,
      career_id TEXT NOT NULL,
      course_code TEXT NOT NULL,
      title TEXT NOT NULL,
      level TEXT NOT NULL,
      credits INTEGER NOT NULL,
      hours INTEGER NOT NULL,
      description TEXT NOT NULL,
      syllabus_modules TEXT NOT NULL DEFAULT '[]',
      prerequisites TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (career_id) REFERENCES career_roles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learner_skills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      category TEXT NOT NULL,
      self_declared_score INTEGER NOT NULL DEFAULT 0,
      verified_score INTEGER NOT NULL DEFAULT 0,
      verification_status TEXT NOT NULL DEFAULT 'self_declared',
      theory_score INTEGER NOT NULL DEFAULT 0,
      practical_score INTEGER NOT NULL DEFAULT 0,
      problem_solving_score INTEGER NOT NULL DEFAULT 0,
      project_score INTEGER NOT NULL DEFAULT 0,
      retention_score INTEGER NOT NULL DEFAULT 50,
      last_practiced_at TEXT NOT NULL,
      decay_risk TEXT NOT NULL DEFAULT 'low',
      weak_concepts TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, skill_name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_assessments (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      career_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      course_code TEXT NOT NULL DEFAULT '',
      difficulty TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 25,
      passing_score INTEGER NOT NULL DEFAULT 70,
      max_tab_switches INTEGER NOT NULL DEFAULT 3,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL,
      questions TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skill_assessments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      admin_assessment_id TEXT,
      title TEXT NOT NULL DEFAULT '',
      skill_name TEXT NOT NULL,
      career_id TEXT NOT NULL,
      course_code TEXT NOT NULL DEFAULT '',
      module_code TEXT NOT NULL DEFAULT '',
      assessment_mode TEXT NOT NULL DEFAULT 'practice_workplace',
      difficulty TEXT NOT NULL,
      assessment_type TEXT NOT NULL,
      status TEXT NOT NULL,
      score INTEGER,
      total_questions INTEGER NOT NULL,
      correct_count INTEGER,
      tab_switch_count INTEGER NOT NULL DEFAULT 0,
      weak_concepts TEXT NOT NULL DEFAULT '[]',
      feedback TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assessment_questions (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      question_index INTEGER NOT NULL,
      question_type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      code_snippet TEXT,
      options TEXT NOT NULL DEFAULT '[]',
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      career_logic TEXT NOT NULL DEFAULT '',
      concept_tag TEXT NOT NULL,
      user_answer TEXT,
      is_correct INTEGER,
      ai_evaluation TEXT,
      FOREIGN KEY (assessment_id) REFERENCES skill_assessments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS proctoring_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      assessment_id TEXT NOT NULL,
      assessment_title TEXT NOT NULL,
      switch_count INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS syllabus_recommendations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      career_id TEXT NOT NULL,
      course_code TEXT NOT NULL,
      course_title TEXT NOT NULL,
      module_code TEXT NOT NULL,
      recommended_module_title TEXT NOT NULL,
      skill_focus TEXT NOT NULL,
      rationale TEXT NOT NULL,
      topics TEXT NOT NULL DEFAULT '[]',
      estimated_hours INTEGER NOT NULL,
      priority TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_roadmaps (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      career_id TEXT NOT NULL,
      career_title TEXT NOT NULL,
      status TEXT NOT NULL,
      compatibility_score INTEGER NOT NULL,
      readiness_estimate INTEGER NOT NULL,
      estimated_total_hours INTEGER NOT NULL,
      adaptation_reason TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS roadmap_milestones (
      id TEXT PRIMARY KEY,
      roadmap_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      stage_order INTEGER NOT NULL,
      skill_name TEXT NOT NULL,
      title TEXT NOT NULL,
      learning_objective TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      estimated_hours INTEGER NOT NULL,
      status TEXT NOT NULL,
      completion_criteria TEXT NOT NULL,
      practical_exercise TEXT NOT NULL,
      mini_project TEXT NOT NULL,
      is_reusable_transfer INTEGER NOT NULL DEFAULT 0,
      assessment_required INTEGER NOT NULL DEFAULT 1,
      last_assessment_score INTEGER,
      adapted_note TEXT,
      FOREIGN KEY (roadmap_id) REFERENCES learning_roadmaps(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_resources (
      id TEXT PRIMARY KEY,
      skill_name TEXT NOT NULL,
      title TEXT NOT NULL,
      provider TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      learning_style TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT NOT NULL,
      estimated_minutes INTEGER NOT NULL,
      is_verified_url INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user_resource_bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, resource_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (resource_id) REFERENCES learning_resources(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS progress_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      title TEXT NOT NULL,
      minutes_spent INTEGER NOT NULL,
      score INTEGER,
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_agent_decisions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      trigger_event TEXT NOT NULL,
      orchestrator_summary TEXT NOT NULL,
      agent_outputs TEXT NOT NULL,
      next_action TEXT NOT NULL,
      explanation TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS career_goal_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      from_career_id TEXT,
      to_career_id TEXT NOT NULL,
      compatibility_before INTEGER NOT NULL,
      compatibility_after INTEGER NOT NULL,
      preserved_skills TEXT NOT NULL DEFAULT '[]',
      changed_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mentor_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      context_tag TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS revision_schedules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      urgency TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learner_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      career_id TEXT NOT NULL,
      description TEXT NOT NULL,
      submission_notes TEXT NOT NULL,
      repo_or_demo_link TEXT NOT NULL,
      ai_verification_score INTEGER,
      ai_feedback TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mock_interviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      career_id TEXT NOT NULL,
      interview_type TEXT NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]',
      evaluation TEXT,
      readiness_score INTEGER,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workplace_simulations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      sim_kind TEXT NOT NULL,
      career_id TEXT NOT NULL,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      current_stage INTEGER NOT NULL DEFAULT 0,
      total_stages INTEGER NOT NULL DEFAULT 3,
      stages TEXT NOT NULL DEFAULT '[]',
      rubric TEXT,
      overall_score INTEGER,
      summary_feedback TEXT,
      skill_applied TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS parallel_career_challenges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tasks TEXT NOT NULL DEFAULT '[]',
      recommended_career_id TEXT NOT NULL DEFAULT '',
      recommended_career_title TEXT NOT NULL DEFAULT '',
      evidence_summary TEXT NOT NULL DEFAULT '',
      disclaimer TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS failure_dna_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      concept_tag TEXT NOT NULL,
      failure_pattern TEXT NOT NULL,
      occurrence_count INTEGER NOT NULL DEFAULT 1,
      repeated_after_revision INTEGER NOT NULL DEFAULT 0,
      diagnostic_note TEXT NOT NULL,
      recovery_mission_title TEXT NOT NULL,
      recovery_mission_task TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      last_detected_at TEXT NOT NULL,
      resolved_at TEXT,
      UNIQUE(user_id, skill_name, concept_tag),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expert_council_reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      members TEXT NOT NULL DEFAULT '[]',
      agreements TEXT NOT NULL DEFAULT '[]',
      disagreements TEXT NOT NULL DEFAULT '[]',
      orchestrator_verdict TEXT NOT NULL,
      applied_system_updates TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reverse_teaching_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      concept_title TEXT NOT NULL,
      student_explanation TEXT NOT NULL,
      companion_followup_question TEXT NOT NULL,
      student_followup_answer TEXT,
      clarity_score INTEGER,
      conceptual_depth_score INTEGER,
      missing_concepts TEXT NOT NULL DEFAULT '[]',
      misconceptions TEXT NOT NULL DEFAULT '[]',
      feedback TEXT,
      status TEXT NOT NULL DEFAULT 'awaiting_followup',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS community_missions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mission_id TEXT NOT NULL,
      title TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      career_id TEXT NOT NULL,
      solution_summary TEXT NOT NULL,
      implementation_proof TEXT NOT NULL,
      repo_or_demo_link TEXT NOT NULL DEFAULT '',
      impact_notes TEXT NOT NULL DEFAULT '',
      ai_score INTEGER NOT NULL,
      ai_feedback TEXT NOT NULL,
      linked_project_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  ensureColumn('learner_profiles', 'university', "TEXT NOT NULL DEFAULT 'ZyraTech University'");
  ensureColumn('learner_profiles', 'github_url', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('learner_profiles', 'linkedin_url', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('skill_assessments', 'course_code', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('skill_assessments', 'module_code', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('skill_assessments', 'assessment_mode', "TEXT NOT NULL DEFAULT 'practice_workplace'");
  ensureColumn('assessment_questions', 'career_logic', "TEXT NOT NULL DEFAULT ''");
}
