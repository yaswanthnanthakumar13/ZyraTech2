import { useCallback, useEffect, useState } from 'react';
import { AgentTraceDrawer } from './components/AgentTraceDrawer';
import { AppShell } from './components/AppShell';
import { DomainDoubtAssistant } from './components/DomainDoubtAssistant';
import { apiFetch, setStoredAuthToken, type AssessmentLaunchContext, type PageRoute } from './lib/api';
import { isSoundEnabled, playPopSound, setSoundEnabled } from './lib/sound';
import { AdminPortalPage } from './pages/AdminPortalPage';
import { AIMentorPage } from './pages/AIMentorPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { AuthPage } from './pages/AuthPage';
import { CareerExplorerPage } from './pages/CareerExplorerPage';
import { CareerSimulatorPage } from './pages/CareerSimulatorPage';
import { CoursesSyllabusPage } from './pages/CoursesSyllabusPage';
import { DashboardPage } from './pages/DashboardPage';
import { DecayMonitorPage } from './pages/DecayMonitorPage';
import { LandingPage } from './pages/LandingPage';
import { LearningHubPage } from './pages/LearningHubPage';
import { MockInterviewPage } from './pages/MockInterviewPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { SkillDNAPage } from './pages/SkillDNAPage';
import { WorkplaceSimPage } from './pages/WorkplaceSimPage';
import { CareerArenaPage } from './pages/CareerArenaPage';
import type {
  AdminDashboardData,
  AIAgentDecision,
  CareerCompatibility,
  CareerRole,
  LearnerWorkspaceData,
  LearningResource,
  SupportedLanguage,
  User,
} from './types';

function safeGetStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage errors in restricted iframes
  }
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = safeGetStorage('zyratech_theme_v2');
    return saved ? saved === 'dark' : false;
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => isSoundEnabled());

  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    const saved = safeGetStorage('zyratech_lang') as SupportedLanguage | null;
    return saved || 'en';
  });

  const [route, setRoute] = useState<PageRoute>('landing');
  const [authInitialPortal, setAuthInitialPortal] = useState<'student' | 'admin'>('student');
  const [assessmentLaunchContext, setAssessmentLaunchContext] = useState<AssessmentLaunchContext | undefined>(undefined);
  const [syllabusCareerId, setSyllabusCareerId] = useState<string | undefined>(undefined);
  const [proctoringWarning, setProctoringWarning] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<LearnerWorkspaceData | null>(null);
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null);
  const [careers, setCareers] = useState<CareerRole[]>([]);
  const [compatibilities, setCompatibilities] = useState<CareerCompatibility[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [inspectedDecision, setInspectedDecision] = useState<AIAgentDecision | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      safeSetStorage('zyratech_theme_v2', 'dark');
    } else {
      root.classList.remove('dark');
      safeSetStorage('zyratech_theme_v2', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleInteractiveClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest('button, [role="button"], a[href], select');
      if (!interactive) return;
      if ((interactive as HTMLButtonElement).disabled) return;
      const explicitSound = interactive.getAttribute('data-sound');
      if (explicitSound === 'profile') {
        playPopSound('profile');
      } else if (explicitSound === 'dashboard') {
        playPopSound('dashboard');
      } else if (interactive.tagName === 'BUTTON' || interactive.getAttribute('role') === 'button') {
        playPopSound('pop');
      } else {
        playPopSound('nav');
      }
    };
    document.addEventListener('click', handleInteractiveClick, true);
    return () => document.removeEventListener('click', handleInteractiveClick, true);
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    setSoundEnabled(next);
    if (next) {
      playPopSound('action');
    }
  };

  const loadStudentWorkspace = useCallback(async () => {
    const [ws, careerData, resList] = await Promise.all([
      apiFetch<LearnerWorkspaceData>('/api/workspace'),
      apiFetch<{ careers: CareerRole[]; compatibilities: CareerCompatibility[] }>('/api/careers'),
      apiFetch<LearningResource[]>('/api/resources'),
    ]);
    setCurrentUser(ws.user);
    setLanguage(ws.user.preferredLanguage || 'en');
    setWorkspace(ws);
    setAdminData(null);
    setCareers(careerData.careers);
    setCompatibilities(careerData.compatibilities);
    setResources(resList);
    return ws;
  }, []);

  const loadAdminPortal = useCallback(async () => {
    const [adm, careerData] = await Promise.all([
      apiFetch<AdminDashboardData>('/api/admin/dashboard'),
      apiFetch<{ careers: CareerRole[] }>('/api/careers'),
    ]);
    setCurrentUser(adm.admin);
    setLanguage(adm.admin.preferredLanguage || 'en');
    setAdminData(adm);
    setWorkspace(null);
    setCareers(careerData.careers);
    return adm;
  }, []);

  const refreshCareerCompatibilities = useCallback(async () => {
    try {
      const careerData = await apiFetch<{
        careers: CareerRole[];
        compatibilities: CareerCompatibility[];
      }>('/api/careers');
      setCareers(careerData.careers);
      setCompatibilities(careerData.compatibilities);
    } catch {
      // ignore if unauthenticated
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await apiFetch<{ user: User }>('/api/auth/me');
        setCurrentUser(me.user);
        setLanguage(me.user.preferredLanguage || 'en');
        if (me.user.role === 'admin') {
          await loadAdminPortal();
          setRoute('admin');
        } else {
          const ws = await loadStudentWorkspace();
          setRoute(ws.profile.onboardingCompleted ? 'dashboard' : 'onboarding');
        }
      } catch {
        try {
          const careerData = await apiFetch<{ careers: CareerRole[] }>('/api/careers');
          setCareers(careerData.careers);
        } catch {
          // ignore
        }
      } finally {
        setBooting(false);
      }
    })();
  }, [loadAdminPortal, loadStudentWorkspace]);

  const handleWorkspaceUpdate = (ws: LearnerWorkspaceData) => {
    setWorkspace(ws);
    setCurrentUser(ws.user);
    refreshCareerCompatibilities();
  };

  const handleChangeLanguage = async (nextLang: SupportedLanguage) => {
    playPopSound('pop');
    setLanguage(nextLang);
    safeSetStorage('zyratech_lang', nextLang);
    if (currentUser) {
      try {
        const res = await apiFetch<{ user: User }>('/api/user/language', {
          method: 'PATCH',
          body: JSON.stringify({ language: nextLang }),
        });
        setCurrentUser(res.user);
        setWorkspace((prev) => (prev ? { ...prev, user: res.user } : null));
        setAdminData((prev) => (prev ? { ...prev, admin: res.user } : null));
      } catch {
        // ignore transient error
      }
    }
  };

  const handleNavigate = (
    nextRoute: PageRoute,
    context?: AssessmentLaunchContext & { portal?: 'student' | 'admin'; careerId?: string }
  ) => {
    if (nextRoute === 'profile') {
      playPopSound('profile');
    } else if (nextRoute === 'dashboard') {
      playPopSound('dashboard');
    } else {
      playPopSound('nav');
    }
    if (
      context &&
      (context.skill ||
        context.difficulty ||
        context.assessmentType ||
        context.assessmentMode ||
        context.courseCode ||
        context.moduleCode ||
        context.arenaTab ||
        context.simKind ||
        context.careerId)
    ) {
      setAssessmentLaunchContext({
        skill: context.skill,
        difficulty: context.difficulty,
        assessmentType: context.assessmentType,
        assessmentMode: context.assessmentMode,
        courseCode: context.courseCode,
        moduleCode: context.moduleCode,
        arenaTab: context.arenaTab,
        simKind: context.simKind,
        careerId: context.careerId,
      });
    }
    if (context?.careerId) {
      setSyllabusCareerId(context.careerId);
    }
    if (context?.portal) setAuthInitialPortal(context.portal);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = async (user: User, onboardingCompleted: boolean) => {
    playPopSound('action');
    setCurrentUser(user);
    setLanguage(user.preferredLanguage || 'en');
    if (user.role === 'admin') {
      await loadAdminPortal();
      setRoute('admin');
    } else {
      const ws = await loadStudentWorkspace();
      setRoute(onboardingCompleted || ws.profile.onboardingCompleted ? 'dashboard' : 'onboarding');
    }
  };

  const handleLaunchDemo = async () => {
    playPopSound('dashboard');
    setDemoLoading(true);
    try {
      const res = await apiFetch<{ token?: string }>('/api/auth/demo-rahul', { method: 'POST' });
      if (res.token) setStoredAuthToken(res.token);
      await loadStudentWorkspace();
      setRoute('dashboard');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleLaunchAdminDemo = async () => {
    playPopSound('action');
    setDemoLoading(true);
    try {
      const res = await apiFetch<{ token?: string }>('/api/auth/demo-admin', { method: 'POST' });
      if (res.token) setStoredAuthToken(res.token);
      await loadAdminPortal();
      setRoute('admin');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleResetDemo = async () => {
    playPopSound('action');
    const ws = await apiFetch<LearnerWorkspaceData>('/api/demo/reset-rahul', { method: 'POST' });
    setWorkspace(ws);
    setProctoringWarning(null);
    await refreshCareerCompatibilities();
    setRoute('dashboard');
  };

  const handleLogout = async () => {
    playPopSound('nav');
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setStoredAuthToken(null);
    setCurrentUser(null);
    setWorkspace(null);
    setAdminData(null);
    setProctoringWarning(null);
    setRoute('landing');
  };

  const handleProctoringTermination = (warningMessage: string) => {
    setProctoringWarning(warningMessage);
    setRoute('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F9F7] dark:bg-[#0E1311] text-[#5C6B63] dark:text-[#99A8A0] text-sm">
        Initializing ZyraTech University Ecosystem...
      </div>
    );
  }

  if (route === 'landing') {
    return (
      <LandingPage
        onNavigate={handleNavigate}
        onLaunchDemo={handleLaunchDemo}
        onLaunchAdminDemo={handleLaunchAdminDemo}
        demoLoading={demoLoading}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((d) => !d)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        isAuthenticated={Boolean(currentUser)}
        userRole={currentUser?.role}
        language={language}
        onChangeLanguage={handleChangeLanguage}
      />
    );
  }

  if (route === 'auth' || !currentUser) {
    return (
      <AuthPage
        initialPortal={authInitialPortal}
        onSuccess={handleAuthSuccess}
        onNavigate={handleNavigate}
        onLaunchDemo={handleLaunchDemo}
        onLaunchAdminDemo={handleLaunchAdminDemo}
        demoLoading={demoLoading}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((d) => !d)}
        language={language}
        onChangeLanguage={handleChangeLanguage}
      />
    );
  }

  // Strictly isolated Administrative Portal
  if (currentUser.role === 'admin' && adminData) {
    return (
      <AdminPortalPage
        adminData={adminData}
        careers={careers}
        onRefresh={async () => {
          await loadAdminPortal();
        }}
        onCareersRefresh={refreshCareerCompatibilities}
        onLogout={handleLogout}
        onChangeLanguage={handleChangeLanguage}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((d) => !d)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F9F7] dark:bg-[#0E1311] text-[#5C6B63] dark:text-[#99A8A0] text-sm">
        Loading Student Portal...
      </div>
    );
  }

  if (route === 'onboarding' || !workspace.profile.onboardingCompleted) {
    return (
      <OnboardingPage
        userFullName={workspace.user.fullName}
        userEmail={workspace.user.email}
        careers={careers}
        onComplete={(ws) => {
          handleWorkspaceUpdate(ws);
          setRoute('dashboard');
        }}
      />
    );
  }

  // Strictly isolated Student Portal
  return (
    <>
      <AppShell
        workspace={workspace}
        currentRoute={route}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onResetDemo={workspace.user.isDemo ? handleResetDemo : undefined}
        onOpenLatestTrace={() => setInspectedDecision(workspace.agentDecisions[0] || null)}
        onChangeLanguage={handleChangeLanguage}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((d) => !d)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      >
        {route === 'dashboard' && (
          <DashboardPage
            workspace={workspace}
            proctoringWarning={proctoringWarning}
            onDismissProctoringWarning={() => setProctoringWarning(null)}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onNavigate={handleNavigate}
            onInspectDecision={setInspectedDecision}
          />
        )}
        {route === 'skill-dna' && (
          <SkillDNAPage
            workspace={workspace}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onNavigate={handleNavigate}
          />
        )}
        {route === 'careers' && (
          <CareerExplorerPage
            workspace={workspace}
            compatibilities={compatibilities}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onNavigate={handleNavigate}
          />
        )}
        {route === 'workplace-sim' && (
          <WorkplaceSimPage
            workspace={workspace}
            careers={careers}
            initialCareerId={assessmentLaunchContext?.careerId || syllabusCareerId}
            initialSimKind={assessmentLaunchContext?.simKind}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onNavigate={handleNavigate}
          />
        )}
        {route === 'career-arena' && (
          <CareerArenaPage
            workspace={workspace}
            careers={careers}
            initialTab={assessmentLaunchContext?.arenaTab}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onNavigate={handleNavigate}
          />
        )}
        {route === 'syllabus' && (
          <CoursesSyllabusPage
            workspace={workspace}
            careers={careers}
            initialCareerId={syllabusCareerId}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onNavigate={handleNavigate}
          />
        )}
        {route === 'simulator' && (
          <CareerSimulatorPage
            workspace={workspace}
            compatibilities={compatibilities}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onNavigate={handleNavigate}
          />
        )}
        {route === 'assessments' && (
          <AssessmentPage
            workspace={workspace}
            launchContext={assessmentLaunchContext}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onInspectDecision={setInspectedDecision}
            onNavigate={handleNavigate}
            onProctoringTermination={handleProctoringTermination}
          />
        )}
        {route === 'roadmap' && (
          <RoadmapPage
            workspace={workspace}
            resources={resources}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onNavigate={handleNavigate}
            onInspectDecision={setInspectedDecision}
          />
        )}
        {route === 'learning-hub' && (
          <LearningHubPage
            workspace={workspace}
            resources={resources}
            onResourcesUpdate={setResources}
            onWorkspaceUpdate={handleWorkspaceUpdate}
          />
        )}
        {route === 'mentor' && (
          <AIMentorPage workspace={workspace} onWorkspaceUpdate={handleWorkspaceUpdate} />
        )}
        {route === 'analytics' && (
          <AnalyticsPage
            workspace={workspace}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onNavigate={handleNavigate}
          />
        )}
        {route === 'decay' && (
          <DecayMonitorPage
            workspace={workspace}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onNavigate={handleNavigate}
          />
        )}
        {route === 'interview' && (
          <MockInterviewPage
            workspace={workspace}
            careers={careers}
            onWorkspaceUpdate={handleWorkspaceUpdate}
          />
        )}
        {route === 'profile' && (
          <ProfileSettingsPage
            workspace={workspace}
            careers={careers}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onNavigate={handleNavigate}
            onResetDemo={handleResetDemo}
            onChangeLanguage={handleChangeLanguage}
            darkMode={darkMode}
            onToggleTheme={() => setDarkMode((d) => !d)}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
          />
        )}
      </AppShell>

      {route !== 'assessments' && <DomainDoubtAssistant workspace={workspace} />}

      <AgentTraceDrawer
        decision={inspectedDecision}
        onClose={() => setInspectedDecision(null)}
      />
    </>
  );
}
