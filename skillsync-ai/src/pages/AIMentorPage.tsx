import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BookOpenCheck, Mic, MicOff, Send, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import zyraAvatar from '../assets/images/companion_zyra_avatar_1794644121430.jpg';
import { apiFetch } from '../lib/api';
import { playPopSound } from '../lib/sound';
import type { CompanionChatMode, LearnerWorkspaceData, MentorMessage } from '../types';

interface AIMentorPageProps {
  workspace: LearnerWorkspaceData;
  onWorkspaceUpdate?: (ws: LearnerWorkspaceData) => void;
}

interface SpeechRecognitionCtor {
  new (): {
    lang: string;
    interimResults: boolean;
    onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  };
}

const PROMPTS_BY_MODE: Record<CompanionChatMode, string[]> = {
  english: [
    'Explain JavaScript closures and async/await using Python analogies.',
    'Give me a step-by-step career guidance roadmap for my target role.',
    'Help me debug a recursive backtracking algorithm in DSA.',
    'Review my active Failure DNA concepts and plan a 15-minute fix.',
  ],
  tanglish: [
    'Ennoda Skill DNA & Failure DNA paathutu next enna pannanum sollu Zyra!',
    'JavaScript async/await concept-a Python maari easy-aa Tanglish-la explain pannu.',
    'Ennoda weakest course module-ku oru 15-minute study plan kudu.',
    'Workday simulation and interview-ku eppadi prepare panradhu?',
  ],
  tamil: [
    'என் Skill DNA மற்றும் தொழில் இலக்குக்கு ஏற்ப அடுத்த படி என்ன?',
    'JavaScript async/await கருத்தை எளிய தமிழில் விளக்குங்கள்.',
    'என் பலவீனமான பாடத்திற்கு 15 நிமிட பயிற்சி திட்டம் கொடுங்கள்.',
    'தொழில்நுட்ப நேர்காணலுக்கு எப்படித் தயாராவது?',
  ],
};

export function AIMentorPage({ workspace, onWorkspaceUpdate }: AIMentorPageProps) {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [mode, setMode] = useState<CompanionChatMode>('english');
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  const speechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    apiFetch<MentorMessage[]>('/api/mentor/history')
      .then((data) => setMessages(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load companion history'))
      .finally(() => setLoadingHistory(false));
  }, [workspace.user.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
        if (ttsSupported) window.speechSynthesis.cancel();
      } catch {
        // ignore cleanup
      }
    };
  }, [ttsSupported]);

  const speakText = (text: string) => {
    if (!ttsSupported || !speakReplies) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = mode === 'tamil' ? 'ta-IN' : 'en-IN';
      window.speechSynthesis.speak(u);
    } catch {
      // ignore tts failures
    }
  };

  const handleToggleMic = () => {
    if (!speechSupported) {
      setError('Voice input is not supported in this browser; please type your question.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = ((window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition) as SpeechRecognitionCtor;
    const rec = new Ctor();
    rec.lang = mode === 'tamil' ? 'ta-IN' : 'en-IN';
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const spoken = ev.results?.[0]?.[0]?.transcript || '';
      if (spoken) setInput((prev) => (prev ? `${prev} ${spoken}` : spoken));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    playPopSound('action');
    setError(null);
    setSending(true);
    const optimistic: MentorMessage = {
      id: `temp-${Date.now()}`,
      userId: workspace.user.id,
      role: 'user',
      content: text.trim(),
      contextTag: `companion_${mode}`,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');

    try {
      const res = await apiFetch<{
        reply: string;
        history: MentorMessage[];
        workspace?: LearnerWorkspaceData;
      }>('/api/mentor/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text.trim(), companionMode: mode }),
      });
      setMessages(res.history);
      if (res.workspace && onWorkspaceUpdate) onWorkspaceUpdate(res.workspace);
      speakText(res.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zyra Companion could not respond');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const weakConcepts = workspace.skills.flatMap((s) => s.weakConcepts).slice(0, 6);
  const activeFailures = workspace.failureDna.filter((f) => f.status !== 'recovered');

  return (
    <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-8.5rem)] min-h-[560px]">
      {/* Zyra Companion Identity & Memory Sidebar */}
      <aside className="lg:col-span-4 p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col justify-between overflow-y-auto">
        <div className="space-y-5">
          <div className="flex items-start gap-3.5">
            <img
              src={zyraAvatar}
              alt="Zyra Living AI Companion"
              className="w-14 h-14 rounded-xl object-cover border border-[#CFE2D6] dark:border-[#2D4739] shrink-0"
            />
            <div>
              <p className="text-xs font-medium text-[#2D6A4F] dark:text-[#74C69D]">
                Living AI Career Companion
              </p>
              <h2 className="text-lg font-bold text-[#18221D] dark:text-[#ECF2EE]">
                Zyra · Adaptive Mentor
              </h2>
              <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] mt-0.5 leading-relaxed">
                Remembers your Skill DNA, Failure DNA, streak, and simulations in English, தமிழ், or Tanglish.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] space-y-1.5 text-xs">
            <p className="font-semibold text-[#1B4332] dark:text-[#95D5B2] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Strict Educational-Only Scope</span>
            </p>
            <p className="text-[#4B5952] dark:text-[#A9B7AF] leading-relaxed">
              Answers strictly cover career guidance, coding, university courses, simulations, Failure DNA, and study plans.
            </p>
          </div>

          <div className="pt-4 border-t border-[#DCE5DF] dark:border-[#24302A] space-y-2 text-xs">
            <p className="font-semibold text-[#18221D] dark:text-[#ECF2EE]">Remembered Student Context</p>
            <p className="text-[#4B5952] dark:text-[#A9B7AF]">
              Target Career: {workspace.compatibility?.career.title || workspace.profile.targetCareerId} ({workspace.compatibility?.compatibilityScore ?? 0}%)
            </p>
            <p className="text-[#4B5952] dark:text-[#A9B7AF]">
              Failure DNA Active: {activeFailures.length > 0 ? activeFailures.map((f) => f.conceptTag).slice(0, 3).join(', ') : 'None flagged'}
            </p>
            <p className="text-[#4B5952] dark:text-[#A9B7AF]">
              Focus Concepts: {weakConcepts.length > 0 ? weakConcepts.join(', ') : 'All fundamentals healthy'}
            </p>
          </div>

          <div className="pt-4 border-t border-[#DCE5DF] dark:border-[#24302A] space-y-2">
            <p className="text-xs font-semibold text-[#18221D] dark:text-[#ECF2EE]">
              Suggested Prompts ({mode === 'tamil' ? 'தமிழ்' : mode === 'tanglish' ? 'Tanglish' : 'English'})
            </p>
            <div className="space-y-2">
              {PROMPTS_BY_MODE[mode].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  disabled={sending}
                  className="w-full text-left p-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#24302A] hover:border-[#2D6A4F] dark:hover:border-[#52B788] text-xs text-[#18221D] dark:text-[#ECF2EE] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Conversation Area */}
      <div className="lg:col-span-8 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-[#DCE5DF] dark:border-[#24302A] bg-[#FAFDFB] dark:bg-[#121815] flex flex-wrap items-center justify-between gap-3 text-xs text-[#5C6B63] dark:text-[#99A8A0]">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#2D6A4F] dark:text-[#74C69D]">
            <BookOpenCheck className="w-3.5 h-3.5" />
            <span>Zyra Companion · English / தமிழ் / Tanglish</span>
          </span>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#101613] p-0.5">
              {(['english', 'tamil', 'tanglish'] as CompanionChatMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    playPopSound('pop');
                    setMode(m);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                    mode === m
                      ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white'
                      : 'text-[#5C6B63] dark:text-[#99A8A0]'
                  }`}
                >
                  {m === 'tamil' ? 'தமிழ்' : m === 'tanglish' ? 'Tanglish' : 'English'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSpeakReplies((s) => !s)}
              disabled={!ttsSupported}
              className="p-1.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#101613] disabled:opacity-40"
              title="Toggle voice synthesis playback"
            >
              {speakReplies ? <Volume2 className="w-3.5 h-3.5 text-[#2D6A4F]" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {loadingHistory ? (
            <p className="text-sm text-[#5C6B63]">Loading companion memory...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-[#5C6B63]">
              Vanakkam! Ask Zyra in English, தமிழ், or Tanglish about coding, coursework, or your career path.
            </p>
          ) : (
            messages.map((m) => {
              const isRefusal = m.role === 'assistant' && m.contextTag === 'guardrail_refusal';
              return (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white'
                        : isRefusal
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                          : 'bg-[#F3F7F4] dark:bg-[#19221D] text-[#18221D] dark:text-[#ECF2EE] border border-[#DCE5DF] dark:border-[#24302A]'
                    }`}
                  >
                    {isRefusal && (
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-1">
                        Educational Scope Guardrail
                      </p>
                    )}
                    {m.content}
                  </div>
                </div>
              );
            })
          )}
          {sending && (
            <div className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">
              Zyra is reviewing your Skill DNA and Failure DNA to compose your response...
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <div className="px-5 py-2 text-xs text-red-600 dark:text-red-400 border-t border-[#DCE5DF] dark:border-[#24302A]">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-[#DCE5DF] dark:border-[#24302A] flex items-center gap-2.5"
        >
          <button
            type="button"
            onClick={handleToggleMic}
            className={`p-2.5 rounded-lg border transition-colors shrink-0 ${
              listening
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-600'
                : 'border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-[#5C6B63]'
            }`}
            title={speechSupported ? 'Voice input' : 'Speech recognition unavailable'}
            aria-label="Toggle voice input"
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'tanglish'
                ? 'Ask Zyra in Tanglish (e.g., "En SQL join error eppadi fix panradhu?")...'
                : mode === 'tamil'
                  ? 'தமிழில் கல்வி அல்லது குறியீடு கேள்வி கேளுங்கள்...'
                  : 'Ask Zyra about coding, studies, simulations, or career guidance...'
            }
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-sm font-semibold disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
