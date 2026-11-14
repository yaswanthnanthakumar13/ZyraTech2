import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Languages,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { apiFetch, setStoredAuthToken, type PageRoute } from '../lib/api';
import { LANGUAGE_OPTIONS } from '../lib/i18n';
import type { SupportedLanguage, User } from '../types';

interface AuthPageProps {
  initialPortal?: 'student' | 'admin';
  onSuccess: (user: User, onboardingCompleted: boolean) => void;
  onNavigate: (route: PageRoute) => void;
  onLaunchDemo: () => void;
  onLaunchAdminDemo: () => void;
  demoLoading: boolean;
  darkMode: boolean;
  onToggleTheme: () => void;
  language: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';
type PortalType = 'student' | 'admin';

export function AuthPage({
  initialPortal = 'student',
  onSuccess,
  onNavigate,
  onLaunchDemo,
  onLaunchAdminDemo,
  demoLoading,
  darkMode,
  onToggleTheme,
  language,
  onChangeLanguage,
}: AuthPageProps) {
  const [portalType, setPortalType] = useState<PortalType>(initialPortal);
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [university, setUniversity] = useState('ZyraTech University');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchPortal = (p: PortalType) => {
    setPortalType(p);
    setMode('login');
    setError(null);
    setStatusMessage(null);
    if (p === 'admin' && email.endsWith('@zyra.in') && email !== 'admin@zyra.in') {
      setEmail('');
      setPassword('');
    }
  };

  const quickFill = (p: PortalType, id: string, pass: string) => {
    setPortalType(p);
    setMode('login');
    setEmail(id);
    setPassword(pass);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await apiFetch<{ user: User; onboardingCompleted: boolean; token?: string }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password, portalType }),
        });
        if (res.token) setStoredAuthToken(res.token);
        onSuccess(res.user, res.onboardingCompleted);
      } else if (mode === 'signup') {
        const res = await apiFetch<{ user: User; onboardingCompleted: boolean; token?: string }>('/api/auth/signup', {
          method: 'POST',
          body: JSON.stringify({
            fullName,
            email,
            rollNumber: rollNumber.trim() || undefined,
            university: university.trim() || 'ZyraTech University',
            password,
            preferredLanguage: language,
          }),
        });
        if (res.token) setStoredAuthToken(res.token);
        onSuccess(res.user, res.onboardingCompleted);
      } else if (mode === 'forgot') {
        if (!tokenPreview) {
          const res = await apiFetch<{ message: string; resetTokenPreview?: string }>(
            '/api/auth/forgot-password',
            {
              method: 'POST',
              body: JSON.stringify({ email }),
            }
          );
          setStatusMessage(res.message);
          if (res.resetTokenPreview) {
            setTokenPreview(res.resetTokenPreview);
            setResetToken(res.resetTokenPreview);
          }
        } else {
          const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token: resetToken, newPassword }),
          });
          setStatusMessage(res.message);
          setTokenPreview(null);
          setMode('login');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9F7] dark:bg-[#0E1311] text-[#18221D] dark:text-[#ECF2EE] flex flex-col">
      <header className="px-6 h-16 flex items-center justify-between border-b border-[#DCE5DF] dark:border-[#24302A] bg-white dark:bg-[#121916]">
        <button
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#3E4C45] dark:text-[#C4D0C9] hover:text-[#18221D] dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ZyraTech University</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] bg-[#F8FBF9] dark:bg-[#17201C]">
            <Languages className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D]" />
            <select
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as SupportedLanguage)}
              aria-label="Language"
              className="bg-transparent text-xs font-medium text-[#2E3A33] dark:text-[#D9E3DD] focus:outline-none"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code} className="bg-white dark:bg-[#151C18]">
                  {opt.nativeLabel}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-[#DCE5DF] dark:border-[#25322C] text-[#5C6B63] dark:text-[#99A8A0] hover:bg-[#EDF4EF] dark:hover:bg-[#1B2520]"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-6 items-start">
          {/* Left: Professional Auth Card */}
          <div className="lg:col-span-7 bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] rounded-2xl p-6 sm:p-8">
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#EFF4F0] dark:bg-[#1A221E] rounded-lg mb-5">
              <button
                type="button"
                onClick={() => switchPortal('student')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-semibold transition-colors ${
                  portalType === 'student'
                    ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white'
                    : 'text-[#5C6B63] dark:text-[#99A8A0] hover:text-[#18221D] dark:hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Student Portal</span>
              </button>
              <button
                type="button"
                onClick={() => switchPortal('admin')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-semibold transition-colors ${
                  portalType === 'admin'
                    ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white'
                    : 'text-[#5C6B63] dark:text-[#99A8A0] hover:text-[#18221D] dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Administrative Portal</span>
              </button>
            </div>

            {portalType === 'student' && (
              <div className="flex items-center gap-1 p-1 bg-[#EFF4F0] dark:bg-[#1A221E] rounded-lg mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    mode === 'login'
                      ? 'bg-white dark:bg-[#151C18] text-[#18221D] dark:text-white'
                      : 'text-[#5C6B63] dark:text-[#99A8A0]'
                  }`}
                >
                  Email / Roll Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    mode === 'signup'
                      ? 'bg-white dark:bg-[#151C18] text-[#18221D] dark:text-white'
                      : 'text-[#5C6B63] dark:text-[#99A8A0]'
                  }`}
                >
                  Create Student Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    mode === 'forgot'
                      ? 'bg-white dark:bg-[#151C18] text-[#18221D] dark:text-white'
                      : 'text-[#5C6B63] dark:text-[#99A8A0]'
                  }`}
                >
                  Reset Password
                </button>
              </div>
            )}

            <h1 className="text-xl font-bold text-[#18221D] dark:text-[#ECF2EE]">
              {portalType === 'admin'
                ? 'University Administrative Sign In'
                : mode === 'login'
                  ? 'Sign in with Email or Roll No.'
                  : mode === 'signup'
                    ? 'Create Your Real-Time Student Credentials'
                    : 'Recover Student Access'}
            </h1>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
              {portalType === 'admin'
                ? 'Release university proctored exams, author questions with Gemini AI, and audit proctoring logs.'
                : mode === 'login'
                  ? 'Sign in with your personal/university email (e.g. name@college.edu) or Roll No. (e.g. 2501).'
                  : 'Register with any valid email address. A unique university Roll No. will be linked to your profile.'}
            </p>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {statusMessage && (
              <div className="mt-4 p-3 rounded-lg bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] text-xs text-[#2D6A4F] dark:text-[#74C69D]">
                {statusMessage}
                {tokenPreview && <p className="mt-1 font-mono font-semibold">Reset Token: {tokenPreview}</p>}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {portalType === 'student' && mode === 'signup' && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#3E4C45] dark:text-[#C4D0C9] mb-1.5">
                      Student Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ananya Verma"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#3E4C45] dark:text-[#C4D0C9] mb-1.5">
                      University / Institution
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[#6B7A72] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        placeholder="e.g. ZyraTech University"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className={portalType === 'student' && mode === 'signup' ? 'grid sm:grid-cols-3 gap-4' : ''}>
                <div className={portalType === 'student' && mode === 'signup' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-medium text-[#3E4C45] dark:text-[#C4D0C9] mb-1.5">
                    {portalType === 'admin'
                      ? 'Administrator Email'
                      : mode === 'signup'
                        ? 'Email Address (Real Email or @zyra.in)'
                        : 'Email Address or Roll Number'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#6B7A72] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={mode === 'signup' ? 'email' : 'text'}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        portalType === 'admin'
                          ? 'admin@zyra.in'
                          : mode === 'signup'
                            ? 'you@university.edu'
                            : 'you@university.edu or 2501'
                      }
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                    />
                  </div>
                </div>

                {portalType === 'student' && mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-[#3E4C45] dark:text-[#C4D0C9] mb-1.5">
                      Roll No. (Optional)
                    </label>
                    <input
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="Auto-assigned"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                    />
                  </div>
                )}
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-xs font-medium text-[#3E4C45] dark:text-[#C4D0C9] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A72] hover:text-[#18221D] dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'forgot' && tokenPreview && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#3E4C45] dark:text-[#C4D0C9] mb-1.5">
                      Reset Token
                    </label>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#3E4C45] dark:text-[#C4D0C9] mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {loading
                  ? 'Authenticating...'
                  : portalType === 'admin'
                    ? 'Enter Administrative Portal'
                    : mode === 'login'
                      ? 'Sign In & Open Student Portal'
                      : mode === 'signup'
                        ? 'Create Account & Start Onboarding'
                        : tokenPreview
                          ? 'Confirm Password Reset'
                          : 'Generate Reset Token'}
              </button>
            </form>
          </div>

          {/* Right: University & Admin Credentials Directory */}
          <div className="lg:col-span-5 bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] rounded-2xl p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                ZyraTech University Directory
              </p>
              <h2 className="text-base font-bold text-[#18221D] dark:text-[#ECF2EE] mt-0.5">
                Official Credentials &amp; Instant Access
              </h2>
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-1">
                Sign up with any real email or use these official university demo credentials.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#25322C]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                    Rahul Sharma · Roll 2501
                  </span>
                  <button
                    type="button"
                    onClick={() => quickFill('student', '2501@zyra.in', 'ZyraStudent@2026')}
                    className="text-[11px] font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
                  >
                    Auto-fill
                  </button>
                </div>
                <p className="text-xs font-mono text-[#4B5952] dark:text-[#A9B7AF] mt-1">
                  2501@zyra.in / ZyraStudent@2026
                </p>
                <button
                  type="button"
                  data-sound="dashboard"
                  onClick={onLaunchDemo}
                  disabled={demoLoading}
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{demoLoading ? 'Launching...' : 'Instant Student Demo (2501)'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#25322C]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                    Priya Nair · Roll 2502
                  </span>
                  <button
                    type="button"
                    onClick={() => quickFill('student', '2502@zyra.in', 'ZyraStudent@2026')}
                    className="text-[11px] font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
                  >
                    Auto-fill
                  </button>
                </div>
                <p className="text-xs font-mono text-[#4B5952] dark:text-[#A9B7AF] mt-1">
                  2502@zyra.in / ZyraStudent@2026
                </p>
                <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0] mt-1">
                  Cybersecurity Track · Default Language: Tamil
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                    University Administrator
                  </span>
                  <button
                    type="button"
                    onClick={() => quickFill('admin', 'admin@zyra.in', 'ZyraAdmin@2026')}
                    className="text-[11px] font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline"
                  >
                    Auto-fill
                  </button>
                </div>
                <p className="text-xs font-mono text-[#4B5952] dark:text-[#A9B7AF] mt-1">
                  admin@zyra.in / ZyraAdmin@2026
                </p>
                <button
                  type="button"
                  onClick={onLaunchAdminDemo}
                  disabled={demoLoading}
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Instant Admin Portal Login</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
