import { useState, type ReactNode } from 'react';
import {
  Activity,
  BookOpen,
  Briefcase,
  Compass,
  Cpu,
  Dna,
  GitCompare,
  GraduationCap,
  Languages,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Mic,
  Moon,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sun,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { PageRoute } from '../lib/api';
import { LANGUAGE_OPTIONS, t } from '../lib/i18n';
import { playPopSound } from '../lib/sound';
import type { LearnerWorkspaceData, SupportedLanguage } from '../types';

interface AppShellProps {
  workspace: LearnerWorkspaceData;
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onLogout: () => void;
  onResetDemo?: () => void;
  onOpenLatestTrace: () => void;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  children: ReactNode;
}

export function AppShell({
  workspace,
  currentRoute,
  onNavigate,
  onLogout,
  onResetDemo,
  onOpenLatestTrace,
  onChangeLanguage,
  darkMode,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const lang = workspace.user.preferredLanguage || 'en';

  const navGroups: Array<{
    label: string;
    items: Array<{ route: PageRoute; label: string; icon: typeof LayoutDashboard }>;
  }> = [
    {
      label: 'Student Workspace',
      items: [
        { route: 'dashboard', label: t(lang, 'dashboard'), icon: LayoutDashboard },
        { route: 'assessments', label: t(lang, 'assessments'), icon: ShieldCheck },
        { route: 'syllabus', label: t(lang, 'syllabusCourses'), icon: GraduationCap },
        { route: 'skill-dna', label: t(lang, 'skillDna'), icon: Dna },
        { route: 'roadmap', label: t(lang, 'roadmap'), icon: MapIcon },
      ],
    },
    {
      label: 'Careers & Practice',
      items: [
        { route: 'careers', label: t(lang, 'careers'), icon: Compass },
        { route: 'workplace-sim', label: t(lang, 'workplaceSim'), icon: Briefcase },
        { route: 'career-arena', label: t(lang, 'careerArena'), icon: Trophy },
        { route: 'simulator', label: t(lang, 'simulator'), icon: GitCompare },
        { route: 'learning-hub', label: t(lang, 'learningHub'), icon: BookOpen },
        { route: 'decay', label: t(lang, 'decayMonitor'), icon: Timer },
      ],
    },
    {
      label: 'Coaching & Account',
      items: [
        { route: 'mentor', label: t(lang, 'mentor'), icon: MessageSquare },
        { route: 'interview', label: t(lang, 'interview'), icon: Mic },
        { route: 'analytics', label: t(lang, 'analytics'), icon: Activity },
        { route: 'profile', label: t(lang, 'profile'), icon: Settings },
      ],
    },
  ];

  const routeTitles: Record<PageRoute, string> = {
    landing: 'ZyraTech',
    auth: 'Sign In',
    onboarding: 'Onboarding',
    dashboard: t(lang, 'dashboard'),
    'skill-dna': t(lang, 'skillDna'),
    careers: t(lang, 'careers'),
    syllabus: t(lang, 'syllabusCourses'),
    simulator: t(lang, 'simulator'),
    assessments: t(lang, 'assessments'),
    roadmap: t(lang, 'roadmap'),
    'learning-hub': t(lang, 'learningHub'),
    mentor: t(lang, 'mentor'),
    analytics: t(lang, 'analytics'),
    decay: t(lang, 'decayMonitor'),
    interview: t(lang, 'interview'),
    profile: t(lang, 'profile'),
    'workplace-sim': t(lang, 'workplaceSim'),
    'career-arena': t(lang, 'careerArena'),
    admin: t(lang, 'adminPortal'),
  };

  const handleNav = (route: PageRoute) => {
    if (route === 'profile') {
      playPopSound('profile');
    } else if (route === 'dashboard') {
      playPopSound('dashboard');
    } else {
      playPopSound('nav');
    }
    onNavigate(route);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#F1F6F3] dark:bg-[#121916] border-r border-[#DCE5DF] dark:border-[#24302A]">
      <div className="px-5 h-16 flex items-center justify-between border-b border-[#DCE5DF] dark:border-[#24302A] shrink-0">
        <button
          data-sound="dashboard"
          onClick={() => handleNav('dashboard')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap"
        >
          <div className="w-7 h-7 rounded-lg bg-[#2D6A4F] dark:bg-[#3B8263] flex items-center justify-center text-white text-xs font-bold shrink-0">
            ZT
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-[#18221D] dark:text-[#ECF2EE] leading-none">
              ZyraTech
            </p>
            <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0] mt-0.5 font-mono">
              Roll {workspace.user.rollNumber}
            </p>
          </div>
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-md text-[#5C6B63] hover:text-[#18221D] dark:hover:text-white"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Primary Sidebar">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[11px] font-medium text-[#6B7A72] dark:text-[#7E8F86]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = currentRoute === item.route;
                const soundAttr =
                  item.route === 'profile'
                    ? 'profile'
                    : item.route === 'dashboard'
                      ? 'dashboard'
                      : 'nav';
                return (
                  <button
                    key={item.route}
                    data-sound={soundAttr}
                    onClick={() => handleNav(item.route)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white'
                        : 'text-[#3E4C45] dark:text-[#C4D0C9] hover:bg-[#E4EDE7] dark:hover:bg-[#1B2520] hover:text-[#18221D] dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3.5 border-t border-[#DCE5DF] dark:border-[#24302A] space-y-2.5 shrink-0">
        {workspace.user.isDemo && (
          <div className="p-2.5 rounded-lg bg-white dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#25322C] text-xs">
            <p className="font-medium text-[#18221D] dark:text-[#ECF2EE] font-mono text-[11px]">
              {workspace.user.email}
            </p>
            {onResetDemo && (
              <button
                onClick={onResetDemo}
                className="mt-1.5 inline-flex items-center gap-1.5 text-[#2D6A4F] dark:text-[#74C69D] hover:underline font-medium text-[11px]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Roll 2501 Baseline</span>
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            data-sound="profile"
            onClick={() => handleNav('profile')}
            className="flex items-center gap-2.5 min-w-0 text-left rounded-lg p-1 -ml-1 hover:bg-[#E4EDE7] dark:hover:bg-[#1B2520] transition-colors flex-1"
            title="Open Student Profile"
          >
            {workspace.user.avatarUrl ? (
              <img
                src={workspace.user.avatarUrl}
                alt={workspace.user.fullName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-[#DCE5DF] dark:border-[#2D3B34] shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#2D6A4F] dark:bg-[#3B8263] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                {workspace.user.fullName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#18221D] dark:text-[#ECF2EE] truncate">
                {workspace.user.fullName}
              </p>
              <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0] truncate">
                {workspace.compatibility?.career.title || 'Student'}
              </p>
            </div>
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-[#5C6B63] hover:text-[#18221D] dark:text-[#99A8A0] dark:hover:text-white hover:bg-[#E4EDE7] dark:hover:bg-[#1B2520] transition-colors shrink-0"
            title={t(lang, 'signOut')}
            aria-label={t(lang, 'signOut')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F6F9F7] dark:bg-[#0E1311] text-[#18221D] dark:text-[#ECF2EE]">
      <aside className="hidden lg:block w-62 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">{sidebarContent}</aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-8 bg-white/95 dark:bg-[#121916]/95 backdrop-blur-sm border-b border-[#DCE5DF] dark:border-[#24302A] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#5C6B63] dark:text-[#99A8A0] hover:bg-[#EDF4EF] dark:hover:bg-[#1B2520]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <button
                type="button"
                data-sound="dashboard"
                onClick={() => handleNav('dashboard')}
                className="text-[#5C6B63] dark:text-[#99A8A0] hover:text-[#2D6A4F] dark:hover:text-[#74C69D] hidden sm:inline whitespace-nowrap transition-colors"
              >
                ZyraTech · {t(lang, 'studentPortal')}
              </button>
              <span className="text-[#C8D4CD] dark:text-[#33413A] hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-[#18221D] dark:text-[#ECF2EE] truncate">
                {routeTitles[currentRoute]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] bg-[#F8FBF9] dark:bg-[#17201C]">
              <Languages className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D] shrink-0" />
              <select
                value={lang}
                onChange={(e) => onChangeLanguage(e.target.value as SupportedLanguage)}
                aria-label="Select Indian Language"
                className="bg-transparent text-xs font-medium text-[#2E3A33] dark:text-[#D9E3DD] focus:outline-none cursor-pointer"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code} className="bg-white dark:bg-[#151C18]">
                    {opt.nativeLabel} ({opt.englishLabel})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onOpenLatestTrace}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#DCE5DF] dark:border-[#25322C] bg-[#F8FBF9] dark:bg-[#17201C] text-[#2E3A33] dark:text-[#D9E3DD] hover:bg-[#EBF3EE] dark:hover:bg-[#1F2B25] transition-colors whitespace-nowrap shrink-0"
            >
              <Cpu className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D]" />
              <span className="hidden md:inline">{t(lang, 'agentDecisions')}</span>
            </button>

            <button
              onClick={onToggleSound}
              className="p-2 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] bg-[#F8FBF9] dark:bg-[#17201C] text-[#5C6B63] dark:text-[#99A8A0] hover:bg-[#EBF3EE] dark:hover:bg-[#1F2B25] transition-colors shrink-0"
              aria-label={soundEnabled ? 'Mute pop sounds' : 'Enable pop sounds'}
              title={soundEnabled ? 'Pop Sounds On (Click to mute)' : 'Pop Sounds Muted (Click to enable)'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D]" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] bg-[#F8FBF9] dark:bg-[#17201C] text-[#5C6B63] dark:text-[#99A8A0] hover:bg-[#EBF3EE] dark:hover:bg-[#1F2B25] transition-colors shrink-0"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              data-sound="profile"
              onClick={() => handleNav('profile')}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] bg-[#F8FBF9] dark:bg-[#17201C] text-xs font-medium text-[#2E3A33] dark:text-[#D9E3DD] hover:bg-[#EBF3EE] dark:hover:bg-[#1F2B25] transition-colors whitespace-nowrap shrink-0"
              title="Open Profile"
            >
              <Settings className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D]" />
              <span>{t(lang, 'profile')}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1380px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
