import { useState, type FormEvent } from 'react';
import {
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Languages,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Target,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { apiFetch, formatVerificationStatus, type PageRoute } from '../lib/api';
import { LANGUAGE_OPTIONS } from '../lib/i18n';
import { playPopSound } from '../lib/sound';
import type { CareerRole, LearnerWorkspaceData, LearningStyle, SupportedLanguage } from '../types';

interface ProfileSettingsPageProps {
  workspace: LearnerWorkspaceData;
  careers: CareerRole[];
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
  onNavigate: (route: PageRoute, context?: { skill?: string; careerId?: string }) => void;
  onResetDemo: () => void;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function ProfileSettingsPage({
  workspace,
  careers,
  onWorkspaceUpdate,
  onNavigate,
  onResetDemo,
  onChangeLanguage,
  darkMode,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
}: ProfileSettingsPageProps) {
  const { user, profile, careerHistory, skills } = workspace;

  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [rollNumber, setRollNumber] = useState(user.rollNumber);
  const [university, setUniversity] = useState(profile.university || profile.institution || '');
  const [institution, setInstitution] = useState(profile.institution || '');
  const [educationLevel, setEducationLevel] = useState(profile.educationLevel || '');
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl || '');
  const [workExperience, setWorkExperience] = useState(profile.workExperience || '');
  const [certificationsText, setCertificationsText] = useState(profile.certifications.join(', '));
  const [nonTechText, setNonTechText] = useState(profile.nonTechnicalSkills.join(', '));
  const [dailyMinutes, setDailyMinutes] = useState(profile.dailyLearningMinutes);
  const [learningStyle, setLearningStyle] = useState<LearningStyle>(profile.preferredLearningStyle);

  // Add/apply skill form
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Programming');
  const [newSkillScore, setNewSkillScore] = useState(65);
  const [addingSkill, setAddingSkill] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    playPopSound('profile');
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const ws = await apiFetch<LearnerWorkspaceData>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          email,
          rollNumber,
          university,
          institution,
          educationLevel,
          githubUrl,
          linkedinUrl,
          workExperience,
          dailyLearningMinutes: dailyMinutes,
          preferredLearningStyle: learningStyle,
          certifications: certificationsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          nonTechnicalSkills: nonTechText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      onWorkspaceUpdate(ws);
      setSavedMsg('Academic & career profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddKnownSkill = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    playPopSound('action');
    setAddingSkill(true);
    setError(null);
    try {
      const ws = await apiFetch<LearnerWorkspaceData>('/api/skills/upsert', {
        method: 'POST',
        body: JSON.stringify({
          skillName: newSkillName.trim(),
          category: newSkillCategory,
          score: newSkillScore,
        }),
      });
      onWorkspaceUpdate(ws);
      setNewSkillName('');
      setSavedMsg(`Added "${newSkillName.trim()}" to your skills inventory. Verify it via Assessment to boost career readiness.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add skill');
    } finally {
      setAddingSkill(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-[#18221D] dark:text-[#ECF2EE]">
          Professional Student Profile &amp; Applicable Skills Portfolio
        </h2>
        <p className="text-sm text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
          Manage your university identity, GitHub &amp; LinkedIn links, personal login email, and apply the skills you already know to matching career tracks.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {savedMsg && (
        <div className="p-3.5 rounded-lg bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] text-xs text-[#2D6A4F] dark:text-[#74C69D]">
          {savedMsg}
        </div>
      )}

      {/* Personal, Academic & Developer Links Form */}
      <form
        onSubmit={handleSave}
        className="p-6 sm:p-8 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E4ECE7] dark:border-[#24302A]">
          <h3 className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE]">
            Personal &amp; University Credentials
          </h3>
          <div className="flex items-center gap-3 text-xs">
            {githubUrl.trim() && (
              <a
                href={githubUrl.startsWith('http') ? githubUrl : `https://${githubUrl}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {linkedinUrl.trim() && (
              <a
                href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
              >
                <span>LinkedIn</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              Login Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              University Roll No.
            </label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              University Name
            </label>
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="e.g. ZyraTech Institute of Technology"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              Department / Campus
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. School of Computer Science"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              Degree &amp; Semester
            </label>
            <input
              type="text"
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              GitHub Profile URL
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              Preferred Language (UI + AI)
            </label>
            <div className="relative">
              <Languages className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={user.preferredLanguage}
                onChange={(e) => onChangeLanguage(e.target.value as SupportedLanguage)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.nativeLabel} ({opt.englishLabel})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              Daily Study Target (minutes)
            </label>
            <input
              type="number"
              min={15}
              max={480}
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              Preferred Learning Style
            </label>
            <select
              value={learningStyle}
              onChange={(e) => setLearningStyle(e.target.value as LearningStyle)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            >
              <option value="interactive_coding">Interactive Coding</option>
              <option value="hands_on_projects">Hands-On Projects</option>
              <option value="video_tutorials">Video Tutorials</option>
              <option value="documentation_reading">Documentation &amp; Articles</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              Certifications (comma separated)
            </label>
            <input
              type="text"
              value={certificationsText}
              onChange={(e) => setCertificationsText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              Non-Technical / Soft Skills (comma separated)
            </label>
            <input
              type="text"
              value={nonTechText}
              onChange={(e) => setNonTechText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
              Work, Lab &amp; Internship Experience
            </label>
            <input
              type="text"
              value={workExperience}
              onChange={(e) => setWorkExperience(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#DCE5DF] dark:border-[#24302A]">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              data-sound="profile"
              onClick={onToggleSound}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#F1F6F3] dark:bg-[#1A221E] text-xs font-semibold text-[#18221D] dark:text-[#ECF2EE]"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D]" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>Pop Sound: {soundEnabled ? 'On' : 'Muted'}</span>
            </button>

            <button
              type="button"
              data-sound="profile"
              onClick={onToggleTheme}
              className="px-3.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-xs font-semibold"
            >
              Theme: {darkMode ? 'Dark Sage' : 'Light Mint & Grey'}
            </button>

            {user.isDemo && (
              <button
                type="button"
                data-sound="profile"
                onClick={onResetDemo}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-300 dark:border-amber-800 text-xs font-semibold text-amber-700 dark:text-amber-300"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Roll 2501 Baseline</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            data-sound="profile"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold disabled:opacity-60 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Academic Profile'}</span>
          </button>
        </div>
      </form>

      {/* Skills You Know & Can Apply */}
      <div className="p-6 sm:p-8 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#18221D] dark:text-[#ECF2EE]">
              Skills You Know &amp; Where You Can Apply Them
            </h3>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
              Add skills you already know, verify them in Assessments, and see which ZyraTech career roles accept each skill right now.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-[#2D6A4F] dark:text-[#74C69D] tabular-nums">
            {skills.length} skills registered
          </span>
        </div>

        {/* Add Skill Row */}
        <form onSubmit={handleAddKnownSkill} className="grid sm:grid-cols-12 gap-3 p-4 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#E4ECE7] dark:border-[#24302A]">
          <input
            type="text"
            required
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            placeholder="Skill name you know (e.g. Python, SQL, React, Docker)"
            className="sm:col-span-5 px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#101613] text-xs"
          />
          <select
            value={newSkillCategory}
            onChange={(e) => setNewSkillCategory(e.target.value)}
            className="sm:col-span-3 px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#101613] text-xs"
          >
            <option value="Programming">Programming</option>
            <option value="Frontend">Frontend</option>
            <option value="Backend">Backend</option>
            <option value="Databases">Databases</option>
            <option value="Cloud">Cloud &amp; DevOps</option>
            <option value="AI & ML">AI &amp; ML</option>
            <option value="Security">Cybersecurity</option>
          </select>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="number"
              min={10}
              max={100}
              value={newSkillScore}
              onChange={(e) => setNewSkillScore(Number(e.target.value))}
              className="w-full px-2.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#101613] text-xs font-mono"
            />
            <span className="text-xs text-[#5C6B63]">%</span>
          </div>
          <button
            type="submit"
            disabled={addingSkill}
            className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] text-white text-xs font-semibold disabled:opacity-60"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Apply Skill</span>
          </button>
        </form>

        {/* Skills + Applicable Roles Matrix */}
        <div className="divide-y divide-[#E4ECE7] dark:divide-[#24302A]">
          {skills.map((s) => {
            const matchingRoles = careers.filter((c) =>
              c.requirements.some((req) => req.skillName.toLowerCase() === s.skillName.toLowerCase())
            );
            const isVerified = s.verificationStatus !== 'self_declared';
            return (
              <div key={s.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                      {s.skillName}
                    </span>
                    <span className="text-xs font-mono font-semibold tabular-nums text-[#2D6A4F] dark:text-[#74C69D]">
                      {s.verifiedScore}%
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                      {isVerified ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D]" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      {formatVerificationStatus(s.verificationStatus)}
                    </span>
                  </div>
                  <p className="text-xs text-[#4B5952] dark:text-[#A9B7AF] flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#5C6B63] shrink-0" />
                    <span>
                      Applicable Roles:{' '}
                      {matchingRoles.length > 0
                        ? matchingRoles.map((r) => r.title).join(' · ')
                        : 'General Software Engineering'}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {matchingRoles[0] && (
                    <button
                      type="button"
                      onClick={() => onNavigate('syllabus', { careerId: matchingRoles[0].id })}
                      className="px-3 py-1.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] text-xs font-semibold hover:bg-[#F1F6F3] dark:hover:bg-[#1D2822]"
                    >
                      Related Courses
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigate('assessments', { skill: s.skillName })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D]"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>{isVerified ? 'Re-Verify' : 'Verify Skill'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Career Goal History */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A]">
        <h3 className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE] mb-4">
          Career Goal History &amp; Skill Transfers
        </h3>
        <div className="divide-y divide-[#DCE5DF] dark:divide-[#24302A]">
          {careerHistory.map((h) => (
            <div key={h.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                  {h.fromCareerId ? `${h.fromCareerId} -> ${h.toCareerId}` : `Initial Goal: ${h.toCareerId}`}
                </p>
                <p className="text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
                  Preserved skills: {h.preservedSkills.join(', ') || 'Baseline setup'}
                </p>
              </div>
              <span className="font-mono tabular-nums text-[#5C6B63] dark:text-[#99A8A0]">
                {new Date(h.changedAt).toLocaleDateString()} · Match {h.compatibilityAfter}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
