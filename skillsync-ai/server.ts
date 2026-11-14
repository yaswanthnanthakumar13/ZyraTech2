import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, initializeDatabase } from './server/db';
import { resetRahulDemoData, seedDatabase, uid } from './server/seed';
import {
  clearSessionCookie,
  extractTokenFromRequest,
  getUserById,
  isValidEmailFormat,
  normalizeStudentLoginEmail,
  requireAdmin,
  requireAuth,
  requireStudent,
  setSessionCookie,
  verifySessionToken,
  type AuthedRequest,
} from './server/auth';
import {
  computeCareerCompatibility,
  getAdminDashboardData,
  getAllCareers,
  getAllResources,
  getLearnerWorkspace,
  getMentorHistory,
  mapAdminAssessmentRow,
} from './server/workspace';
import {
  evaluateAssessmentSubmission,
  generateAdminTestWithAI,
  generateSkillAssessment,
  generateUpcomingSyllabusWithAI,
  getAssessmentWithQuestions,
  handleMockInterviewTurn,
  orchestrateLearningEvent,
  parseResumeWithAI,
  recordProctoringEvent,
  runAIMentorChat,
  runDomainDoubtAssistant,
  startAdminAssessmentAttempt,
  startMockInterviewSession,
  verifyProjectWithAI,
} from './server/agents';
import {
  advanceWorkplaceSimulationStage,
  completeFailureRecoveryMission,
  completeReverseTeaching,
  conveneExpertCouncil,
  getCareerUniverseCatalog,
  scanFailureDNA,
  startParallelChallenge,
  startReverseTeaching,
  startWorkplaceSimulation,
  submitCommunityMission,
  submitParallelChallenge,
} from './server/zyra_innovations';
import type { CompanionChatMode, SupportedLanguage } from './src/types';

initializeDatabase();
seedDatabase();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use('/src/assets/images', express.static(path.resolve(process.cwd(), 'src/assets/images')));

const ALLOWED_LANGUAGES: SupportedLanguage[] = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'bn', 'mr'];

// ============================================================================
// AUTHENTICATION ROUTES (ROLL NO STUDENT PORTAL & SEPARATE ADMIN PORTAL)
// ============================================================================
app.post('/api/auth/signup', (req, res) => {
  try {
    const { fullName, email, rollNumber, password, preferredLanguage, university } = req.body || {};
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      res.status(400).json({ error: 'Please provide your full name (at least 2 characters).' });
      return;
    }

    const rawEmail = String(email || '').trim().toLowerCase();
    const rawRoll = String(rollNumber || '').trim();
    const rawIdentifier = rawEmail || rawRoll.toLowerCase();
    if (!rawIdentifier) {
      res.status(400).json({ error: 'Please enter a valid email address or university Roll No.' });
      return;
    }

    const normalizedEmail = normalizeStudentLoginEmail(rawIdentifier);
    if (!isValidEmailFormat(normalizedEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address (e.g. you@university.edu) or Roll No. (e.g. 2503).' });
      return;
    }
    if (normalizedEmail === 'admin@zyra.in') {
      res.status(403).json({ error: 'admin@zyra.in is reserved for University Administration.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    // Determine unique roll number: either explicitly provided / @zyra.in prefix, or auto-assigned next roll >= 2503
    let assignedRoll = rawRoll.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!assignedRoll && normalizedEmail.endsWith('@zyra.in')) {
      assignedRoll = normalizedEmail.split('@')[0];
    }
    if (!assignedRoll) {
      const rolls = db.prepare("SELECT roll_number FROM users WHERE role = 'student'").all() as Array<{ roll_number: string }>;
      const maxNum = rolls.reduce((max, r) => {
        const n = parseInt(r.roll_number, 10);
        return Number.isFinite(n) && n > max ? n : max;
      }, 2502);
      assignedRoll = String(maxNum + 1);
    }

    const lang: SupportedLanguage = ALLOWED_LANGUAGES.includes(preferredLanguage) ? preferredLanguage : 'en';
    const userId = uid('student');
    const now = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(password, 10);
    const uniName = String(university || 'ZyraTech University').trim() || 'ZyraTech University';

    db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, email, roll_number, role, password_hash, full_name, preferred_language, is_demo, avatar_url, created_at)
        VALUES (?, ?, ?, 'student', ?, ?, ?, 0, NULL, ?)
      `).run(userId, normalizedEmail, assignedRoll, passwordHash, fullName.trim(), lang, now);

      db.prepare(`
        INSERT INTO learner_profiles (
          user_id, institution, university, target_career_id, daily_learning_minutes, preferred_learning_style,
          streak_days, onboarding_completed, updated_at
        ) VALUES (?, ?, ?, 'full-stack-developer', 60, 'interactive_coding', 1, 0, ?)
      `).run(userId, uniName, uniName, now);
    })();

    const token = setSessionCookie(req, res, userId);
    res.status(201).json({ user: getUserById(userId), onboardingCompleted: false, token });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Unable to create student account right now.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password, portalType } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Roll No. / Email and password are required.' });
      return;
    }
    const normalizedEmail = normalizeStudentLoginEmail(String(email));
    const row = db
      .prepare('SELECT id, role, password_hash FROM users WHERE email = ?')
      .get(normalizedEmail) as { id: string; role: string; password_hash: string } | undefined;

    if (!row || !bcrypt.compareSync(String(password), row.password_hash)) {
      res.status(401).json({ error: 'Invalid university credentials.' });
      return;
    }

    if (portalType === 'student' && row.role !== 'student') {
      res.status(403).json({
        error: 'Administrator accounts cannot sign in on the Student Portal. Switch to the Administrative Portal tab.',
      });
      return;
    }
    if (portalType === 'admin' && row.role !== 'admin') {
      res.status(403).json({
        error: 'Student roll-number accounts cannot access the Administrative Portal. Please sign in on the Student Portal tab.',
      });
      return;
    }

    const token = setSessionCookie(req, res, row.id);
    const user = getUserById(row.id);

    if (row.role === 'admin') {
      res.json({ user, onboardingCompleted: true, token });
      return;
    }

    const workspace = getLearnerWorkspace(row.id);
    res.json({
      user,
      onboardingCompleted: workspace?.profile.onboardingCompleted ?? false,
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/api/auth/demo-rahul', (req, res) => {
  try {
    if (req.query.reset === '1' || req.body?.reset === true) {
      resetRahulDemoData();
    }
    const token = setSessionCookie(req, res, 'student-2501');
    const workspace = getLearnerWorkspace('student-2501');
    res.json({ user: workspace?.user, onboardingCompleted: true, token });
  } catch (err) {
    console.error('Demo student login error:', err);
    res.status(500).json({ error: 'Unable to launch demo student account.' });
  }
});

app.post('/api/auth/demo-admin', (req, res) => {
  try {
    const user = getUserById('admin-zyra');
    if (!user) {
      res.status(404).json({ error: 'Admin account not initialized.' });
      return;
    }
    const token = setSessionCookie(req, res, 'admin-zyra');
    res.json({ user, onboardingCompleted: true, token });
  } catch (err) {
    console.error('Demo admin login error:', err);
    res.status(500).json({ error: 'Unable to launch admin portal.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(req, res);
  res.json({ ok: true });
});

app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Please enter your Roll No. or university email.' });
      return;
    }
    const normalized = normalizeStudentLoginEmail(email);
    const row = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(normalized) as { id: string } | undefined;

    if (!row) {
      res.json({
        message: 'If a university account matches that identifier, a reset token has been generated.',
      });
      return;
    }

    const token = uid('rst').toUpperCase();
    const expiresAt = new Date(Date.now() + 30 * 60000).toISOString();
    db.prepare(`
      INSERT INTO password_resets (id, user_id, token, expires_at, used)
      VALUES (?, ?, ?, ?, 0)
    `).run(uid('prst'), row.id, token, expiresAt);

    res.json({
      message: 'Password reset token generated (local university preview mode).',
      resetTokenPreview: token,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Could not initiate password reset.' });
  }
});

app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'Valid reset token and a new password (min 6 chars) are required.' });
      return;
    }
    const row = db
      .prepare('SELECT id, user_id, expires_at, used FROM password_resets WHERE token = ?')
      .get(String(token).trim()) as
      | { id: string; user_id: string; expires_at: string; used: number }
      | undefined;

    if (!row || row.used === 1 || new Date(row.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'Invalid or expired reset token.' });
      return;
    }

    const hash = bcrypt.hashSync(String(newPassword), 10);
    db.transaction(() => {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.user_id);
      db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(row.id);
    })();

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Password reset failed.' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

app.patch('/api/user/language', requireAuth, (req: AuthedRequest, res) => {
  const { language } = req.body || {};
  if (!ALLOWED_LANGUAGES.includes(language)) {
    res.status(400).json({ error: 'Unsupported language code.' });
    return;
  }
  db.prepare('UPDATE users SET preferred_language = ? WHERE id = ?').run(language, req.user!.id);
  const updatedUser = getUserById(req.user!.id);
  res.json({ user: updatedUser });
});

// ============================================================================
// STUDENT WORKSPACE & ONBOARDING ROUTES
// ============================================================================
app.get('/api/workspace', requireStudent, (req: AuthedRequest, res) => {
  const workspace = getLearnerWorkspace(req.user!.id);
  if (!workspace) {
    res.status(404).json({ error: 'Student workspace not found.' });
    return;
  }
  res.json(workspace);
});

app.post('/api/demo/reset-rahul', requireStudent, (req: AuthedRequest, res) => {
  if (!req.user!.isDemo) {
    res.status(403).json({ error: 'Reset is only available for demo student Roll 2501.' });
    return;
  }
  resetRahulDemoData();
  res.json(getLearnerWorkspace('student-2501'));
});

app.post('/api/onboarding/parse-resume', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const { resumeText } = req.body || {};
    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 15) {
      res.status(400).json({ error: 'Please paste or upload at least a short resume summary.' });
      return;
    }
    const parsed = await parseResumeWithAI(resumeText);
    res.json(parsed);
  } catch (err) {
    console.error('Resume parse error:', err);
    res.status(500).json({ error: 'Unable to parse resume text.' });
  }
});

app.post('/api/onboarding', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      fullName,
      educationLevel,
      institution,
      technicalSkills,
      nonTechnicalSkills,
      certifications,
      previousProjects,
      workExperience,
      careerInterests,
      targetCareerId,
      dailyLearningMinutes,
      preferredLearningStyle,
      resumeText,
    } = req.body || {};

    if (!targetCareerId) {
      res.status(400).json({ error: 'Target career role is required.' });
      return;
    }

    const now = new Date().toISOString();
    db.transaction(() => {
      if (fullName && typeof fullName === 'string' && fullName.trim().length >= 2) {
        db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(fullName.trim(), userId);
      }

      db.prepare(`
        UPDATE learner_profiles
        SET education_level = ?, institution = ?, non_technical_skills = ?, certifications = ?,
            previous_projects = ?, work_experience = ?, career_interests = ?, target_career_id = ?,
            daily_learning_minutes = ?, preferred_learning_style = ?, resume_text = ?,
            onboarding_completed = 1, updated_at = ?
        WHERE user_id = ?
      `).run(
        String(educationLevel || 'Undergraduate'),
        String(institution || 'ZyraTech University'),
        JSON.stringify(Array.isArray(nonTechnicalSkills) ? nonTechnicalSkills : []),
        JSON.stringify(Array.isArray(certifications) ? certifications : []),
        JSON.stringify(Array.isArray(previousProjects) ? previousProjects : []),
        String(workExperience || ''),
        JSON.stringify(Array.isArray(careerInterests) ? careerInterests : []),
        String(targetCareerId),
        Math.max(15, Math.min(480, Number(dailyLearningMinutes) || 60)),
        String(preferredLearningStyle || 'interactive_coding'),
        String(resumeText || ''),
        now,
        userId
      );

      if (Array.isArray(technicalSkills)) {
        const upsertSkill = db.prepare(`
          INSERT INTO learner_skills (
            id, user_id, skill_name, category, self_declared_score, verified_score,
            verification_status, theory_score, practical_score, problem_solving_score,
            project_score, retention_score, last_practiced_at, decay_risk, weak_concepts, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'self_declared', ?, ?, ?, ?, 60, ?, 'low', '[]', ?)
          ON CONFLICT(user_id, skill_name) DO UPDATE SET
            self_declared_score = excluded.self_declared_score,
            verified_score = CASE WHEN learner_skills.verification_status = 'self_declared' THEN excluded.verified_score ELSE learner_skills.verified_score END,
            updated_at = excluded.updated_at
        `);

        for (const sk of technicalSkills) {
          if (!sk?.skillName) continue;
          const val = Math.max(0, Math.min(100, Number(sk.score) || 0));
          upsertSkill.run(
            uid('skill'),
            userId,
            String(sk.skillName).trim(),
            String(sk.category || 'Technical'),
            val,
            val,
            Math.round(val * 0.9),
            Math.round(val * 0.8),
            Math.round(val * 0.8),
            Math.round(val * 0.5),
            now,
            now
          );
        }
      }

      db.prepare(`
        INSERT INTO career_goal_history (
          id, user_id, from_career_id, to_career_id, compatibility_before, compatibility_after, preserved_skills, changed_at
        ) VALUES (?, ?, NULL, ?, 0, 0, '[]', ?)
      `).run(uid('cgh'), userId, String(targetCareerId), now);
    })();

    const decision = await orchestrateLearningEvent({
      userId,
      triggerEvent: 'ONBOARDING_COMPLETE',
      context: { targetCareerId },
    });
    await generateUpcomingSyllabusWithAI(userId);

    const workspace = getLearnerWorkspace(userId);
    res.json({ workspace, decision });
  } catch (err) {
    console.error('Onboarding error:', err);
    res.status(500).json({ error: 'Failed to complete onboarding.' });
  }
});

app.patch('/api/profile', requireStudent, (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      fullName,
      email,
      rollNumber,
      university,
      githubUrl,
      linkedinUrl,
      educationLevel,
      institution,
      workExperience,
      dailyLearningMinutes,
      preferredLearningStyle,
      nonTechnicalSkills,
      certifications,
    } = req.body || {};
    const now = new Date().toISOString();

    if (fullName && typeof fullName === 'string' && fullName.trim().length >= 2) {
      db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(fullName.trim(), userId);
    }

    if (email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      if (!isValidEmailFormat(cleanEmail) || cleanEmail === 'admin@zyra.in') {
        res.status(400).json({ error: 'Please provide a valid non-admin email address.' });
        return;
      }
      const conflict = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(cleanEmail, userId);
      if (conflict) {
        res.status(409).json({ error: 'That email address is already registered to another account.' });
        return;
      }
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(cleanEmail, userId);
    }

    if (rollNumber && typeof rollNumber === 'string' && rollNumber.trim().length >= 2) {
      db.prepare('UPDATE users SET roll_number = ? WHERE id = ?').run(rollNumber.trim(), userId);
    }

    db.prepare(`
      UPDATE learner_profiles
      SET education_level = COALESCE(?, education_level),
          institution = COALESCE(?, institution),
          university = COALESCE(?, university),
          github_url = COALESCE(?, github_url),
          linkedin_url = COALESCE(?, linkedin_url),
          work_experience = COALESCE(?, work_experience),
          daily_learning_minutes = COALESCE(?, daily_learning_minutes),
          preferred_learning_style = COALESCE(?, preferred_learning_style),
          non_technical_skills = COALESCE(?, non_technical_skills),
          certifications = COALESCE(?, certifications),
          updated_at = ?
      WHERE user_id = ?
    `).run(
      educationLevel ?? null,
      institution ?? university ?? null,
      university ?? institution ?? null,
      githubUrl ?? null,
      linkedinUrl ?? null,
      workExperience ?? null,
      dailyLearningMinutes ? Number(dailyLearningMinutes) : null,
      preferredLearningStyle ?? null,
      Array.isArray(nonTechnicalSkills) ? JSON.stringify(nonTechnicalSkills) : null,
      Array.isArray(certifications) ? JSON.stringify(certifications) : null,
      now,
      userId
    );

    res.json(getLearnerWorkspace(userId));
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Unable to update profile.' });
  }
});

// ============================================================================
// CAREERS, COURSES, UPCOMING SYLLABUS & WHAT-IF SIMULATOR ROUTES
// ============================================================================
app.get('/api/careers', (req: AuthedRequest, res) => {
  const careers = getAllCareers();
  const token = extractTokenFromRequest(req);
  const userId = verifySessionToken(token);
  if (!userId) {
    res.json({ careers, compatibilities: [] });
    return;
  }
  const user = getUserById(userId);
  if (!user || user.role !== 'student') {
    res.json({ careers, compatibilities: [] });
    return;
  }
  const compatibilities = careers
    .map((c) => computeCareerCompatibility(userId, c.id))
    .filter(Boolean);
  res.json({ careers, compatibilities });
});

app.post('/api/careers/switch', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { targetCareerId } = req.body || {};
    if (!targetCareerId) {
      res.status(400).json({ error: 'targetCareerId is required.' });
      return;
    }
    const workspaceBefore = getLearnerWorkspace(userId);
    if (!workspaceBefore) {
      res.status(404).json({ error: 'Workspace not found.' });
      return;
    }
    const fromCareerId = workspaceBefore.profile.targetCareerId;
    const compatBefore = workspaceBefore.compatibility?.compatibilityScore ?? 0;
    const compatAfterObj = computeCareerCompatibility(userId, String(targetCareerId));
    if (!compatAfterObj) {
      res.status(404).json({ error: 'Target career role not found.' });
      return;
    }

    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare('UPDATE learner_profiles SET target_career_id = ?, updated_at = ? WHERE user_id = ?').run(
        String(targetCareerId),
        now,
        userId
      );

      db.prepare(`
        INSERT INTO career_goal_history (
          id, user_id, from_career_id, to_career_id, compatibility_before, compatibility_after, preserved_skills, changed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uid('cgh'),
        userId,
        fromCareerId,
        String(targetCareerId),
        compatBefore,
        compatAfterObj.compatibilityScore,
        JSON.stringify(compatAfterObj.transferableSkills),
        now
      );
    })();

    const decision = await orchestrateLearningEvent({
      userId,
      triggerEvent: 'CAREER_GOAL_CHANGED',
      context: {
        fromCareerId,
        toCareerId: targetCareerId,
        compatibilityBefore: compatBefore,
        compatibilityAfter: compatAfterObj.compatibilityScore,
        preservedSkills: compatAfterObj.transferableSkills,
      },
    });

    await generateUpcomingSyllabusWithAI(userId);

    res.json({ workspace: getLearnerWorkspace(userId), decision });
  } catch (err) {
    console.error('Switch career error:', err);
    res.status(500).json({ error: 'Unable to switch career goal.' });
  }
});

app.post('/api/syllabus/recommend', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const recommendations = await generateUpcomingSyllabusWithAI(req.user!.id);
    res.json({ recommendations, workspace: getLearnerWorkspace(req.user!.id) });
  } catch (err) {
    console.error('Syllabus recommendation error:', err);
    res.status(500).json({ error: 'Unable to generate upcoming syllabus recommendations.' });
  }
});

// ============================================================================
// SKILL DNA & PROJECT VERIFICATION ROUTES
// ============================================================================
app.post('/api/skills/upsert', requireStudent, (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { skillName, category, score } = req.body || {};
    if (!skillName || typeof skillName !== 'string') {
      res.status(400).json({ error: 'skillName is required.' });
      return;
    }
    const val = Math.max(0, Math.min(100, Number(score) || 0));
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO learner_skills (
        id, user_id, skill_name, category, self_declared_score, verified_score,
        verification_status, theory_score, practical_score, problem_solving_score,
        project_score, retention_score, last_practiced_at, decay_risk, weak_concepts, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'self_declared', ?, ?, ?, ?, 65, ?, 'low', '[]', ?)
      ON CONFLICT(user_id, skill_name) DO UPDATE SET
        self_declared_score = excluded.self_declared_score,
        verified_score = CASE WHEN learner_skills.verification_status = 'self_declared' THEN excluded.verified_score ELSE learner_skills.verified_score END,
        updated_at = excluded.updated_at
    `).run(
      uid('skill'),
      userId,
      skillName.trim(),
      String(category || 'Technical'),
      val,
      val,
      Math.round(val * 0.9),
      Math.round(val * 0.8),
      Math.round(val * 0.8),
      Math.round(val * 0.5),
      now,
      now
    );

    res.json(getLearnerWorkspace(userId));
  } catch (err) {
    console.error('Skill upsert error:', err);
    res.status(500).json({ error: 'Unable to save skill.' });
  }
});

app.post('/api/projects/verify', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const { title, skillName, description, submissionNotes, repoOrDemoLink } = req.body || {};
    if (!title || !skillName || !description || !submissionNotes) {
      res.status(400).json({ error: 'Title, skill, description, and implementation notes are required.' });
      return;
    }
    const result = await verifyProjectWithAI({
      userId: req.user!.id,
      title: String(title),
      skillName: String(skillName),
      description: String(description),
      submissionNotes: String(submissionNotes),
      repoOrDemoLink: String(repoOrDemoLink || ''),
    });
    res.json({ result, workspace: getLearnerWorkspace(req.user!.id) });
  } catch (err) {
    console.error('Project verify error:', err);
    res.status(500).json({ error: 'Project verification failed.' });
  }
});

// ============================================================================
// PROCTORED ASSESSMENT ENGINE ROUTES (STUDENT PORTAL)
// ============================================================================
app.post('/api/assessments/generate', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const { skillName, difficulty, assessmentType, courseCode, moduleCode, assessmentMode } = req.body || {};
    if (!skillName) {
      res.status(400).json({ error: 'skillName is required.' });
      return;
    }
    const assessment = await generateSkillAssessment({
      userId: req.user!.id,
      skillName: String(skillName),
      difficulty: difficulty || 'beginner',
      assessmentType: assessmentType || 'mixed',
      courseCode: courseCode ? String(courseCode) : undefined,
      moduleCode: moduleCode ? String(moduleCode) : undefined,
      assessmentMode: assessmentMode === 'daily_portal' ? 'daily_portal' : 'practice_workplace',
    });
    res.json(assessment);
  } catch (err) {
    console.error('Generate assessment error:', err);
    res.status(500).json({ error: 'Failed to generate skill assessment.' });
  }
});

app.post('/api/assessments/start-admin/:adminAssessmentId', requireStudent, (req: AuthedRequest, res) => {
  try {
    const assessment = startAdminAssessmentAttempt(req.user!.id, String(req.params.adminAssessmentId));
    res.json(assessment);
  } catch (err) {
    console.error('Start admin assessment error:', err);
    res.status(404).json({ error: err instanceof Error ? err.message : 'Unable to start university test.' });
  }
});

app.post('/api/assessments/:id/proctoring-event', requireStudent, (req: AuthedRequest, res) => {
  try {
    const { eventType, details } = req.body || {};
    const validEvents = ['tab_switch', 'fullscreen_exit', 'window_blur'];
    const evt = validEvents.includes(eventType) ? eventType : 'tab_switch';
    const result = recordProctoringEvent({
      userId: req.user!.id,
      assessmentId: String(req.params.id),
      eventType: evt,
      details: details ? String(details) : undefined,
    });
    res.json({
      ...result,
      workspace: getLearnerWorkspace(req.user!.id),
    });
  } catch (err) {
    console.error('Proctoring event error:', err);
    res.status(500).json({ error: 'Failed to record proctoring event.' });
  }
});

app.get('/api/assessments/:id', requireStudent, (req: AuthedRequest, res) => {
  const assessment = getAssessmentWithQuestions(String(req.params.id), req.user!.id);
  if (!assessment) {
    res.status(404).json({ error: 'Assessment not found.' });
    return;
  }
  res.json(assessment);
});

app.post('/api/assessments/:id/submit', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const { answers } = req.body || {};
    if (!answers || typeof answers !== 'object') {
      res.status(400).json({ error: 'Answers map is required.' });
      return;
    }
    const result = await evaluateAssessmentSubmission({
      userId: req.user!.id,
      assessmentId: String(req.params.id),
      answers: answers as Record<string, string>,
    });
    res.json({
      ...result,
      workspace: getLearnerWorkspace(req.user!.id),
    });
  } catch (err) {
    console.error('Submit assessment error:', err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to evaluate assessment submission.' });
  }
});

// ============================================================================
// ADMINISTRATIVE PORTAL ROUTES (SEPARATE FROM STUDENT PORTAL)
// ============================================================================
app.get('/api/admin/dashboard', requireAdmin, (req: AuthedRequest, res) => {
  const data = getAdminDashboardData(req.user!.id);
  if (!data) {
    res.status(404).json({ error: 'Admin dashboard unavailable.' });
    return;
  }
  res.json(data);
});

app.post('/api/admin/assessments/generate-ai', requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const { title, careerId, skillName, courseCode, difficulty, questionCount, assessmentType } = req.body || {};
    if (!title || !skillName) {
      res.status(400).json({ error: 'Test title and skillName are required for Gemini generation.' });
      return;
    }
    const validType = assessmentType === 'mcq' || assessmentType === 'coding' ? assessmentType : 'mixed';
    const generated = await generateAdminTestWithAI({
      title: String(title),
      careerId: String(careerId || 'full-stack-developer'),
      skillName: String(skillName),
      courseCode: String(courseCode || ''),
      difficulty: difficulty || 'intermediate',
      questionCount: Number(questionCount) || 5,
      assessmentType: validType,
    });
    res.json(generated);
  } catch (err) {
    console.error('Admin AI test generation error:', err);
    res.status(500).json({ error: 'Failed to generate test questions with AI.' });
  }
});

app.post('/api/admin/assessments', requireAdmin, (req: AuthedRequest, res) => {
  try {
    const {
      title,
      careerId,
      skillName,
      courseCode,
      difficulty,
      durationMinutes,
      passingScore,
      maxTabSwitches,
      isPublished,
      questions,
    } = req.body || {};

    if (!title || !skillName || !Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: 'Title, skillName, and at least 1 question are required.' });
      return;
    }

    const id = uid('adm-test');
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO admin_assessments (
        id, title, career_id, skill_name, course_code, difficulty,
        duration_minutes, passing_score, max_tab_switches, is_published, created_by, questions, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      String(title),
      String(careerId || 'full-stack-developer'),
      String(skillName),
      String(courseCode || ''),
      String(difficulty || 'intermediate'),
      Math.max(5, Number(durationMinutes) || 25),
      Math.max(40, Math.min(100, Number(passingScore) || 70)),
      Math.max(1, Number(maxTabSwitches) || 3),
      isPublished === false ? 0 : 1,
      req.user!.email,
      JSON.stringify(questions),
      now
    );

    const created = db.prepare('SELECT * FROM admin_assessments WHERE id = ?').get(id) as Record<string, unknown>;
    res.status(201).json({
      assessment: mapAdminAssessmentRow(created),
      dashboard: getAdminDashboardData(req.user!.id),
    });
  } catch (err) {
    console.error('Admin create assessment error:', err);
    res.status(500).json({ error: 'Failed to release assessment.' });
  }
});

app.patch('/api/admin/assessments/:id/publish', requireAdmin, (req: AuthedRequest, res) => {
  const { isPublished } = req.body || {};
  db.prepare('UPDATE admin_assessments SET is_published = ? WHERE id = ?').run(
    isPublished ? 1 : 0,
    String(req.params.id)
  );
  res.json(getAdminDashboardData(req.user!.id));
});

app.delete('/api/admin/assessments/:id', requireAdmin, (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM admin_assessments WHERE id = ?').run(String(req.params.id));
  res.json(getAdminDashboardData(req.user!.id));
});

app.post('/api/admin/courses', requireAdmin, (req: AuthedRequest, res) => {
  try {
    const { careerId, courseCode, title, level, credits, hours, description, moduleTitle, skillFocus, topics } =
      req.body || {};
    if (!careerId || !courseCode || !title) {
      res.status(400).json({ error: 'careerId, courseCode, and title are required.' });
      return;
    }
    const id = uid('crs');
    const modules = [
      {
        moduleCode: 'M1',
        title: String(moduleTitle || title),
        topics: Array.isArray(topics) && topics.length ? topics : [String(skillFocus || title)],
        skillFocus: String(skillFocus || 'JavaScript'),
      },
    ];
    db.prepare(`
      INSERT INTO role_courses (id, career_id, course_code, title, level, credits, hours, description, syllabus_modules, prerequisites)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')
    `).run(
      id,
      String(careerId),
      String(courseCode),
      String(title),
      String(level || 'Core'),
      Math.max(1, Number(credits) || 3),
      Math.max(5, Number(hours) || 20),
      String(description || ''),
      JSON.stringify(modules)
    );
    res.status(201).json({ careers: getAllCareers() });
  } catch (err) {
    console.error('Admin add course error:', err);
    res.status(500).json({ error: 'Failed to add course module.' });
  }
});

// ============================================================================
// ROADMAP & LEARNING RESOURCES ROUTES
// ============================================================================
app.post('/api/roadmap/milestone/:id/status', requireStudent, (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { status } = req.body || {};
    const allowed = ['available', 'in_progress', 'needs_revision', 'completed'];
    if (!allowed.includes(String(status))) {
      res.status(400).json({ error: 'Invalid milestone status.' });
      return;
    }
    const ms = db
      .prepare('SELECT * FROM roadmap_milestones WHERE id = ? AND user_id = ?')
      .get(String(req.params.id), userId) as Record<string, unknown> | undefined;
    if (!ms) {
      res.status(404).json({ error: 'Milestone not found.' });
      return;
    }
    db.prepare('UPDATE roadmap_milestones SET status = ? WHERE id = ? AND user_id = ?').run(
      String(status),
      String(req.params.id),
      userId
    );
    if (status === 'completed') {
      db.prepare(`
        INSERT INTO progress_records (id, user_id, activity_type, skill_name, title, minutes_spent, score, recorded_at)
        VALUES (?, ?, 'roadmap_stage', ?, ?, 45, NULL, ?)
      `).run(uid('pr'), userId, String(ms.skill_name), `Completed Stage: ${String(ms.title)}`, new Date().toISOString());
    }
    res.json(getLearnerWorkspace(userId));
  } catch (err) {
    console.error('Milestone update error:', err);
    res.status(500).json({ error: 'Failed to update milestone status.' });
  }
});

app.post('/api/roadmap/resync', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const decision = await orchestrateLearningEvent({
      userId: req.user!.id,
      triggerEvent: 'MANUAL_SYNC',
    });
    res.json({ workspace: getLearnerWorkspace(req.user!.id), decision });
  } catch (err) {
    console.error('Roadmap resync error:', err);
    res.status(500).json({ error: 'Unable to resync roadmap.' });
  }
});

app.get('/api/resources', requireStudent, (req: AuthedRequest, res) => {
  res.json(getAllResources(req.user!.id));
});

app.post('/api/resources/:id/bookmark', requireStudent, (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const resourceId = String(req.params.id);
  const existing = db
    .prepare('SELECT id FROM user_resource_bookmarks WHERE user_id = ? AND resource_id = ?')
    .get(userId, resourceId) as { id: string } | undefined;
  if (existing) {
    db.prepare('DELETE FROM user_resource_bookmarks WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO user_resource_bookmarks (id, user_id, resource_id, created_at) VALUES (?, ?, ?, ?)').run(
      uid('bm'),
      userId,
      resourceId,
      new Date().toISOString()
    );
  }
  res.json({ resources: getAllResources(userId), workspace: getLearnerWorkspace(userId) });
});

app.post('/api/progress/log', requireStudent, (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const { skillName, title, minutesSpent, activityType } = req.body || {};
  if (!skillName || !title) {
    res.status(400).json({ error: 'skillName and title are required.' });
    return;
  }
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO progress_records (id, user_id, activity_type, skill_name, title, minutes_spent, score, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
  `).run(uid('pr'), userId, String(activityType || 'resource'), String(skillName), String(title), Number(minutesSpent) || 30, now);

  db.prepare(`
    UPDATE learner_skills SET last_practiced_at = ?, retention_score = MIN(98, retention_score + 6), decay_risk = 'low', updated_at = ?
    WHERE user_id = ? AND LOWER(skill_name) = LOWER(?)
  `).run(now, now, userId, String(skillName));

  res.json(getLearnerWorkspace(userId));
});

app.post('/api/learning-hub/checkpoint', requireStudent, (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { skillName, title, minutesSpent, takeawayNote } = req.body || {};
    if (!skillName || !title) {
      res.status(400).json({ error: 'skillName and title are required.' });
      return;
    }
    if (!takeawayNote || String(takeawayNote).trim().length < 12) {
      res.status(400).json({ error: 'Write at least a short 1-sentence key takeaway (12+ characters) to verify your knowledge gain.' });
      return;
    }

    const mins = Math.max(10, Math.min(240, Number(minutesSpent) || 35));
    const now = new Date().toISOString();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO progress_records (id, user_id, activity_type, skill_name, title, minutes_spent, score, recorded_at)
        VALUES (?, ?, 'resource', ?, ?, ?, 100, ?)
      `).run(uid('pr'), userId, String(skillName), `${String(title)} — Verified Takeaway`, mins, now);

      const existing = db
        .prepare('SELECT id FROM learner_skills WHERE user_id = ? AND LOWER(skill_name) = LOWER(?)')
        .get(userId, String(skillName)) as { id: string } | undefined;

      if (existing) {
        db.prepare(`
          UPDATE learner_skills
          SET last_practiced_at = ?,
              retention_score = MIN(98, MAX(retention_score + 10, 78)),
              theory_score = MIN(100, theory_score + 4),
              verified_score = CASE WHEN verification_status = 'self_declared' THEN MIN(65, verified_score + 5) ELSE verified_score END,
              decay_risk = 'low',
              updated_at = ?
          WHERE id = ?
        `).run(now, now, existing.id);
      }
    })();

    res.json({ workspace: getLearnerWorkspace(userId), message: `Verified +${mins}m study & retention boost in ${String(skillName)}.` });
  } catch (err) {
    console.error('Learning checkpoint error:', err);
    res.status(500).json({ error: 'Failed to save learning checkpoint.' });
  }
});

// ============================================================================
// LEARNING DECAY MONITOR ROUTES
// ============================================================================
app.post('/api/decay/check', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const decision = await orchestrateLearningEvent({
      userId: req.user!.id,
      triggerEvent: 'DECAY_CHECK',
    });
    res.json({ workspace: getLearnerWorkspace(req.user!.id), decision });
  } catch (err) {
    console.error('Decay check error:', err);
    res.status(500).json({ error: 'Unable to run decay scan.' });
  }
});

app.post('/api/decay/revision/:id/complete', requireStudent, (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const rev = db
    .prepare('SELECT * FROM revision_schedules WHERE id = ? AND user_id = ?')
    .get(String(req.params.id), userId) as Record<string, unknown> | undefined;
  if (!rev) {
    res.status(404).json({ error: 'Revision item not found.' });
    return;
  }
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare("UPDATE revision_schedules SET status = 'completed' WHERE id = ?").run(String(rev.id));
    db.prepare(`
      UPDATE learner_skills
      SET retention_score = MIN(96, retention_score + 22), last_practiced_at = ?, decay_risk = 'low', updated_at = ?
      WHERE user_id = ? AND LOWER(skill_name) = LOWER(?)
    `).run(now, now, userId, String(rev.skill_name));
    db.prepare(`
      INSERT INTO progress_records (id, user_id, activity_type, skill_name, title, minutes_spent, score, recorded_at)
      VALUES (?, ?, 'revision', ?, ?, 20, NULL, ?)
    `).run(uid('pr'), userId, String(rev.skill_name), `Spaced Revision: ${String(rev.skill_name)}`, now);
  })();
  res.json(getLearnerWorkspace(userId));
});

// ============================================================================
// AI MENTOR & MOCK INTERVIEW ROUTES
// ============================================================================
app.get('/api/mentor/history', requireStudent, (req: AuthedRequest, res) => {
  res.json(getMentorHistory(req.user!.id));
});

app.post('/api/mentor/chat', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const { message, companionMode } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }
    const safeMode: CompanionChatMode | undefined =
      companionMode === 'english' || companionMode === 'tamil' || companionMode === 'tanglish'
        ? companionMode
        : undefined;
    const result = await runAIMentorChat({
      userId: req.user!.id,
      message: message.trim(),
      companionMode: safeMode,
    });
    res.json({
      ...result,
      history: getMentorHistory(req.user!.id),
      workspace: getLearnerWorkspace(req.user!.id),
    });
  } catch (err) {
    console.error('Mentor chat error:', err);
    res.status(500).json({ error: 'AI Companion failed to respond.' });
  }
});

app.post('/api/assistant/doubt', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const { domain, question, history } = req.body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      res.status(400).json({ error: 'Please enter an educational doubt or question.' });
      return;
    }
    const result = await runDomainDoubtAssistant({
      userId: req.user!.id,
      domain: String(domain || 'Full-Stack Web Development'),
      question: question.trim(),
      history: Array.isArray(history) ? history : [],
    });
    res.json(result);
  } catch (err) {
    console.error('Domain doubt assistant error:', err);
    res.status(500).json({ error: 'Unable to process educational doubt right now.' });
  }
});

app.post('/api/interviews/start', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const { careerId, interviewType } = req.body || {};
    const session = await startMockInterviewSession({
      userId: req.user!.id,
      careerId: String(careerId || 'full-stack-developer'),
      interviewType: interviewType || 'technical',
    });
    res.json({ session, workspace: getLearnerWorkspace(req.user!.id) });
  } catch (err) {
    console.error('Interview start error:', err);
    res.status(500).json({ error: 'Failed to start mock interview.' });
  }
});

app.post('/api/interviews/:id/respond', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const { answer, eyeContactScore, screenFocusScore } = req.body || {};
    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      res.status(400).json({ error: 'Interview response cannot be empty.' });
      return;
    }
    const result = await handleMockInterviewTurn({
      userId: req.user!.id,
      interviewId: String(req.params.id),
      answer: answer.trim(),
      eyeContactScore: typeof eyeContactScore === 'number' ? eyeContactScore : undefined,
      screenFocusScore: typeof screenFocusScore === 'number' ? screenFocusScore : undefined,
    });
    res.json({ session: result, workspace: getLearnerWorkspace(req.user!.id) });
  } catch (err) {
    console.error('Interview turn error:', err);
    res.status(500).json({ error: 'Failed to evaluate interview response.' });
  }
});

// ============================================================================
// ZYRATECH CAREER DISCOVERY, WORKPLACE SIMS, FAILURE DNA & COUNCIL ROUTES
// ============================================================================
app.get('/api/universe', requireStudent, (_req: AuthedRequest, res) => {
  res.json(getCareerUniverseCatalog());
});

app.post('/api/failure-dna/scan', requireStudent, (req: AuthedRequest, res) => {
  try {
    const records = scanFailureDNA(req.user!.id);
    res.json({ failureDna: records, workspace: getLearnerWorkspace(req.user!.id) });
  } catch (err) {
    console.error('Failure DNA scan error:', err);
    res.status(500).json({ error: 'Unable to scan Failure DNA.' });
  }
});

app.post('/api/failure-dna/:id/recover', requireStudent, (req: AuthedRequest, res) => {
  try {
    const workspace = completeFailureRecoveryMission(req.user!.id, String(req.params.id));
    res.json({ workspace });
  } catch (err) {
    console.error('Failure DNA recovery error:', err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to complete recovery mission.' });
  }
});

app.post('/api/expert-council/convene', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const result = await conveneExpertCouncil(req.user!.id);
    res.json(result);
  } catch (err) {
    console.error('Expert council error:', err);
    res.status(500).json({ error: 'Unable to convene AI Expert Council.' });
  }
});

app.post('/api/simulations/start', requireStudent, (req: AuthedRequest, res) => {
  try {
    const { simKind, careerId } = req.body || {};
    const validKinds = ['workday', 'boss_challenge', 'escape_room', 'ethical_arena'];
    const kind = validKinds.includes(simKind) ? simKind : 'workday';
    const simulation = startWorkplaceSimulation({
      userId: req.user!.id,
      simKind: kind,
      careerId: typeof careerId === 'string' && careerId ? careerId : undefined,
    });
    res.json({ simulation, workspace: getLearnerWorkspace(req.user!.id) });
  } catch (err) {
    console.error('Simulation start error:', err);
    res.status(500).json({ error: 'Failed to launch workplace simulation.' });
  }
});

app.post('/api/simulations/:id/respond', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const { response, elapsedSeconds } = req.body || {};
    if (!response || typeof response !== 'string' || response.trim().length < 5) {
      res.status(400).json({ error: 'Please provide a concrete response before submitting.' });
      return;
    }
    const result = await advanceWorkplaceSimulationStage({
      userId: req.user!.id,
      simId: String(req.params.id),
      response: response.trim(),
      elapsedSeconds: typeof elapsedSeconds === 'number' ? elapsedSeconds : undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('Simulation respond error:', err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to evaluate stage.' });
  }
});

app.post('/api/parallel-challenge/start', requireStudent, (req: AuthedRequest, res) => {
  try {
    const challenge = startParallelChallenge(req.user!.id);
    res.json({ challenge, workspace: getLearnerWorkspace(req.user!.id) });
  } catch (err) {
    console.error('Parallel challenge start error:', err);
    res.status(500).json({ error: 'Failed to start Parallel Career Challenge.' });
  }
});

app.post('/api/parallel-challenge/:id/submit', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const { submissions } = req.body || {};
    if (!submissions || typeof submissions !== 'object') {
      res.status(400).json({ error: 'Submissions for each role are required.' });
      return;
    }
    const result = await submitParallelChallenge({
      userId: req.user!.id,
      challengeId: String(req.params.id),
      submissions: submissions as Record<string, string>,
    });
    res.json(result);
  } catch (err) {
    console.error('Parallel challenge submit error:', err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to grade Parallel Challenge.' });
  }
});

app.post('/api/reverse-teaching/start', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const { skillName, conceptTitle, explanation } = req.body || {};
    if (!skillName || !conceptTitle || !explanation || String(explanation).trim().length < 15) {
      res.status(400).json({ error: 'Provide skill, concept title, and a clear explanation (min 15 chars).' });
      return;
    }
    const result = await startReverseTeaching({
      userId: req.user!.id,
      skillName: String(skillName).trim(),
      conceptTitle: String(conceptTitle).trim(),
      explanation: String(explanation).trim(),
    });
    res.json(result);
  } catch (err) {
    console.error('Reverse teaching start error:', err);
    res.status(500).json({ error: 'Failed to start Reverse Teaching session.' });
  }
});

app.post('/api/reverse-teaching/:id/respond', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const { followUpAnswer } = req.body || {};
    if (!followUpAnswer || String(followUpAnswer).trim().length < 8) {
      res.status(400).json({ error: 'Please answer Zyra’s probing follow-up question clearly.' });
      return;
    }
    const result = await completeReverseTeaching({
      userId: req.user!.id,
      sessionId: String(req.params.id),
      followUpAnswer: String(followUpAnswer).trim(),
    });
    res.json(result);
  } catch (err) {
    console.error('Reverse teaching complete error:', err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to grade Reverse Teaching.' });
  }
});

app.post('/api/community-missions/submit', requireStudent, async (req: AuthedRequest, res) => {
  try {
    const { missionId, solutionSummary, implementationProof, repoOrDemoLink, impactNotes } = req.body || {};
    if (!missionId || !solutionSummary || String(solutionSummary).trim().length < 15) {
      res.status(400).json({ error: 'Select a community mission and explain your solution (min 15 chars).' });
      return;
    }
    const result = await submitCommunityMission({
      userId: req.user!.id,
      missionId: String(missionId),
      solutionSummary: String(solutionSummary).trim(),
      implementationProof: String(implementationProof || solutionSummary).trim(),
      repoOrDemoLink: String(repoOrDemoLink || '').trim(),
      impactNotes: String(impactNotes || '').trim(),
    });
    res.json(result);
  } catch (err) {
    console.error('Community mission submit error:', err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to submit community mission.' });
  }
});

// ============================================================================
// SERVER STARTUP (VITE DEV MIDDLEWARE OR PRODUCTION DIST)
// ============================================================================
async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZyraTech server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
