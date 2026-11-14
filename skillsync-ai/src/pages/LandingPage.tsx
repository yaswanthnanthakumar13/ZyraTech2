import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Languages,
  Moon,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import heroStudioImage from '../assets/images/hero_skillsync_studio_1794631428445.jpg';
import type { PageRoute } from '../lib/api';
import { LANGUAGE_OPTIONS, t } from '../lib/i18n';
import type { SupportedLanguage } from '../types';

interface LandingPageProps {
  onNavigate: (route: PageRoute, context?: { skill?: string; portal?: 'student' | 'admin' }) => void;
  onLaunchDemo: () => void;
  onLaunchAdminDemo: () => void;
  demoLoading: boolean;
  darkMode: boolean;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isAuthenticated: boolean;
  userRole?: 'student' | 'admin';
  language: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
}

export function LandingPage({
  onNavigate,
  onLaunchDemo,
  onLaunchAdminDemo,
  demoLoading,
  darkMode,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  isAuthenticated,
  userRole,
  language,
  onChangeLanguage,
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#F6F9F7] dark:bg-[#0E1311] text-[#18221D] dark:text-[#ECF2EE]">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#121916]/95 backdrop-blur-sm border-b border-[#DCE5DF] dark:border-[#24302A]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-[#18221D] dark:text-[#ECF2EE] whitespace-nowrap shrink-0"
          >
            ZyraTech
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5C6B63] dark:text-[#99A8A0]">
            <a href="#portals" className="hover:text-[#18221D] dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              University Portals
            </a>
            <a href="#credentials" className="hover:text-[#18221D] dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Credentials
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              onClick={() => onNavigate(isAuthenticated ? (userRole === 'admin' ? 'admin' : 'dashboard') : 'auth')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {isAuthenticated ? 'Open Portal' : 'Portal Sign In'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Workspace */}
      <section id="top" className="max-w-7xl mx-auto px-6 pt-8 pb-16 lg:pt-12 lg:pb-20">
        {/* Clean Workspace Preferences Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-8 mb-8 border-b border-[#DCE5DF] dark:border-[#24302A]">
          <div className="flex items-center gap-2 text-xs text-[#5C6B63] dark:text-[#99A8A0]">
            <span className="font-medium text-[#2D6A4F] dark:text-[#74C69D]">ZyraTech University Workspace</span>
            <span aria-hidden="true">·</span>
            <span>{t(language, 'tagline')}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] bg-white dark:bg-[#151C18]">
              <Languages className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D]" />
              <select
                value={language}
                onChange={(e) => onChangeLanguage(e.target.value as SupportedLanguage)}
                aria-label="Select Language"
                className="bg-transparent text-xs font-medium text-[#2E3A33] dark:text-[#D9E3DD] focus:outline-none cursor-pointer"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code} className="bg-white dark:bg-[#151C18]">
                    {opt.nativeLabel}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onToggleSound}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] bg-white dark:bg-[#151C18] text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] hover:bg-[#EDF4EF] dark:hover:bg-[#1B2520] transition-colors"
              aria-label={soundEnabled ? 'Mute pop sounds' : 'Enable pop sounds'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D]" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
            </button>

            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] bg-white dark:bg-[#151C18] text-[#5C6B63] dark:text-[#99A8A0] hover:bg-[#EDF4EF] dark:hover:bg-[#1B2520] transition-colors shrink-0"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#18221D] dark:text-[#ECF2EE] leading-[1.12] text-balance">
              Discover Your Skills. Experience Your Future.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-[#4B5952] dark:text-[#A9B7AF] leading-relaxed max-w-xl">
              An AI-powered career discovery, proctored assessment, and workplace simulation ecosystem under ZyraTech. Sign in with Roll No. (<span className="font-mono text-[#2D6A4F] dark:text-[#74C69D]">2501@zyra.in</span>), explore interactive career worlds, test real workdays, and learn in English, தமிழ், Tanglish, and 6 more Indian languages.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                data-sound="dashboard"
                onClick={onLaunchDemo}
                disabled={demoLoading}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-sm font-semibold transition-colors whitespace-nowrap disabled:opacity-60"
              >
                <GraduationCap className="w-4 h-4" />
                <span>{demoLoading ? 'Entering Student Portal...' : 'Student Demo (Roll 2501)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onLaunchAdminDemo}
                disabled={demoLoading}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[#C6DFCE] dark:border-[#2C4738] bg-[#EDF5F0] dark:bg-[#16231C] text-[#1B4332] dark:text-[#95D5B2] hover:bg-[#E1EFE6] dark:hover:bg-[#1D2E25] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Administrative Portal</span>
              </button>

              <button
                onClick={() => onNavigate('auth')}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] bg-white dark:bg-[#151C18] text-[#18221D] dark:text-[#ECF2EE] hover:bg-[#F1F6F3] dark:hover:bg-[#1D2621] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <span>Email / Roll No. Login</span>
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-[#DCE5DF] dark:border-[#24302A] flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#5C6B63] dark:text-[#99A8A0]">
              <span>Zyra Living Companion</span>
              <span aria-hidden="true">·</span>
              <span>Career Universe &amp; Workday Sim</span>
              <span aria-hidden="true">·</span>
              <span>Failure DNA &amp; Expert Council</span>
              <span aria-hidden="true">·</span>
              <span>Fullscreen Proctored Portal</span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[320px] rounded-xl overflow-hidden border border-[#DCE5DF] dark:border-[#24302A] bg-[#E8EFEA] dark:bg-[#151C18]">
              <img
                src={heroStudioImage}
                alt="ZyraTech University Adaptive Learning and Proctored Assessment Workspace"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-[#111915]/90 via-[#111915]/60 to-transparent">
                <p className="text-xs text-[#95D5B2] font-semibold">
                  Gemini AI First · Proctored Exam Integrity · Multilingual Guidance
                </p>
                <p className="text-sm text-white font-medium mt-1">
                  Faculty release proctored exams in the Admin Portal; students complete them in fullscreen mode with instant Skill DNA &amp; syllabus updates.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quantitative Metrics Strip */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-b border-[#DCE5DF] dark:border-[#24302A] py-6">
          <div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#18221D] dark:text-[#ECF2EE]">8 Languages</p>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
              English, Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali &amp; Marathi
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#18221D] dark:text-[#ECF2EE]">2 Portals</p>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
              Strictly isolated Student Portal &amp; Administrative Control Plane
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#18221D] dark:text-[#ECF2EE]">Max 3 Switches</p>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
              Fullscreen enforcement with live tab-switch warnings &amp; auto-return
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#18221D] dark:text-[#ECF2EE]">10 Career Tracks</p>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
              High-ROI roles with structured courses, guidance, &amp; AI syllabus picks
            </p>
          </div>
        </div>
      </section>

      {/* Dual Portal Architecture */}
      <section id="portals" className="border-t border-[#DCE5DF] dark:border-[#24302A] bg-white dark:bg-[#121916] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] mb-2">
              Dual-Portal University Architecture
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18221D] dark:text-[#ECF2EE]">
              Dedicated portals for Students and University Administrators
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-7 rounded-xl bg-[#F6F9F7] dark:bg-[#161E1A] border border-[#DCE5DF] dark:border-[#24302A] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                  PORTAL 01 · STUDENT ACCESS ONLY
                </span>
                <GraduationCap className="w-5 h-5 text-[#2D6A4F] dark:text-[#74C69D]" />
              </div>
              <h3 className="text-xl font-bold text-[#18221D] dark:text-[#ECF2EE]">
                Student Learning &amp; Assessment Portal
              </h3>
              <ul className="space-y-2.5 text-sm text-[#4B5952] dark:text-[#A9B7AF]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] mt-0.5 shrink-0" />
                  <span>Roll-number login (<span className="font-mono">2501@zyra.in</span>) isolated from admin tools.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] mt-0.5 shrink-0" />
                  <span>Fullscreen proctored tests with 3-switch guard and instant Dashboard warnings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] mt-0.5 shrink-0" />
                  <span>Worth-studying career guidance, role courses, and Gemini AI Upcoming Syllabus recommendations.</span>
                </li>
              </ul>
            </div>

            <div className="p-7 rounded-xl bg-[#F6F9F7] dark:bg-[#161E1A] border border-[#DCE5DF] dark:border-[#24302A] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-[#3D5247] dark:text-[#95D5B2]">
                  PORTAL 02 · UNIVERSITY ADMINISTRATION
                </span>
                <ShieldAlert className="w-5 h-5 text-[#2D6A4F] dark:text-[#74C69D]" />
              </div>
              <h3 className="text-xl font-bold text-[#18221D] dark:text-[#ECF2EE]">
                Administrative Exam &amp; Curriculum Control
              </h3>
              <ul className="space-y-2.5 text-sm text-[#4B5952] dark:text-[#A9B7AF]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] mt-0.5 shrink-0" />
                  <span>Ask Gemini AI to author exam questions and release proctored tests to students.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] mt-0.5 shrink-0" />
                  <span>Monitor roll-number wise scores, terminated exams, and live proctoring violation audit logs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] mt-0.5 shrink-0" />
                  <span>Publish or archive assessments and manage career-aligned syllabus courses.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* University & Admin Credentials Card */}
      <section id="credentials" className="border-t border-[#DCE5DF] dark:border-[#24302A] bg-white dark:bg-[#121916] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-8">
            <p className="text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D] mb-2">
              ZyraTech University Directory
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18221D] dark:text-[#ECF2EE]">
              Official Demo Credentials (Student Roll No. &amp; Admin)
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="p-5 rounded-xl bg-[#F6F9F7] dark:bg-[#161E1A] border border-[#DCE5DF] dark:border-[#24302A] space-y-2">
              <p className="text-xs font-mono text-[#2D6A4F] dark:text-[#74C69D]">STUDENT · ROLL 2501</p>
              <p className="text-base font-bold text-[#18221D] dark:text-[#ECF2EE]">Rahul Sharma</p>
              <p className="text-xs font-mono text-[#4B5952] dark:text-[#A9B7AF]">
                Email / Roll: <span className="font-semibold">2501@zyra.in</span> (or <span className="font-semibold">2501</span>)
              </p>
              <p className="text-xs font-mono text-[#4B5952] dark:text-[#A9B7AF]">
                Password: <span className="font-semibold">ZyraStudent@2026</span>
              </p>
              <button
                data-sound="dashboard"
                onClick={onLaunchDemo}
                disabled={demoLoading}
                className="mt-2 w-full py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold transition-colors"
              >
                Launch Roll 2501 Portal
              </button>
            </div>

            <div className="p-5 rounded-xl bg-[#F6F9F7] dark:bg-[#161E1A] border border-[#DCE5DF] dark:border-[#24302A] space-y-2">
              <p className="text-xs font-mono text-[#2D6A4F] dark:text-[#74C69D]">STUDENT · ROLL 2502</p>
              <p className="text-base font-bold text-[#18221D] dark:text-[#ECF2EE]">Priya Nair</p>
              <p className="text-xs font-mono text-[#4B5952] dark:text-[#A9B7AF]">
                Email / Roll: <span className="font-semibold">2502@zyra.in</span> (or <span className="font-semibold">2502</span>)
              </p>
              <p className="text-xs font-mono text-[#4B5952] dark:text-[#A9B7AF]">
                Password: <span className="font-semibold">ZyraStudent@2026</span>
              </p>
              <button
                onClick={() => onNavigate('auth', { portal: 'student' })}
                className="mt-2 w-full py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2D3B34] bg-white dark:bg-[#151C18] text-xs font-semibold hover:bg-[#EDF4EF] dark:hover:bg-[#1F2B25] transition-colors"
              >
                Sign In via Student Portal
              </button>
            </div>

            <div className="p-5 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] space-y-2">
              <p className="text-xs font-mono text-[#2D6A4F] dark:text-[#95D5B2]">UNIVERSITY ADMIN PORTAL</p>
              <p className="text-base font-bold text-[#18221D] dark:text-[#ECF2EE]">Dean of Assessments</p>
              <p className="text-xs font-mono text-[#4B5952] dark:text-[#A9B7AF]">
                Admin Email: <span className="font-semibold">admin@zyra.in</span>
              </p>
              <p className="text-xs font-mono text-[#4B5952] dark:text-[#A9B7AF]">
                Password: <span className="font-semibold">ZyraAdmin@2026</span>
              </p>
              <button
                onClick={onLaunchAdminDemo}
                disabled={demoLoading}
                className="mt-2 w-full py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold transition-colors"
              >
                Open Administrative Portal
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#DCE5DF] dark:border-[#24302A] py-8 px-6 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5C6B63] dark:text-[#99A8A0]">
        <span>ZyraTech University · AI Career Intelligence &amp; Proctored Assessment Ecosystem</span>
        <div className="flex items-center gap-6">
          <button onClick={() => onNavigate('auth')} className="hover:text-[#18221D] dark:hover:text-white">
            Student / Admin Login
          </button>
          <button data-sound="dashboard" onClick={onLaunchDemo} className="hover:text-[#18221D] dark:hover:text-white">
            Roll 2501 Demo
          </button>
        </div>
      </footer>
    </div>
  );
}
