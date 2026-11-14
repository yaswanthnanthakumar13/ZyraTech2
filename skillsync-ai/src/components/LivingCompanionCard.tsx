import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import zyraAvatar from '../assets/images/companion_zyra_avatar_1794644121430.jpg';
import { apiFetch, type AssessmentLaunchContext, type PageRoute } from '../lib/api';
import { playPopSound } from '../lib/sound';
import type { CompanionChatMode, LearnerWorkspaceData } from '../types';

interface LivingCompanionCardProps {
  workspace: LearnerWorkspaceData;
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
  onNavigate: (
    route: PageRoute,
    context?: AssessmentLaunchContext & { careerId?: string }
  ) => void;
}

interface SpeechRecognitionCtor {
  new (): {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  };
}

export function LivingCompanionCard({
  workspace,
  onWorkspaceUpdate,
  onNavigate,
}: LivingCompanionCardProps) {
  const briefing = workspace.companionBriefing;
  const [mode, setMode] = useState<CompanionChatMode>('tanglish');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [latestReply, setLatestReply] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  const speechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
        if (ttsSupported) window.speechSynthesis.cancel();
      } catch {
        // ignore cleanup errors
      }
    };
  }, [ttsSupported]);

  const speakText = (text: string, chatMode: CompanionChatMode) => {
    if (!ttsSupported || !speakReplies) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = chatMode === 'tamil' ? 'ta-IN' : 'en-IN';
      utter.rate = 1.0;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore speech synthesis failures
    }
  };

  const handleToggleMic = () => {
    if (!speechSupported) {
      setError('Voice recognition is not supported in this browser; please type your message.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    setError(null);
    const Ctor = ((window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition) as SpeechRecognitionCtor;
    const rec = new Ctor();
    rec.lang = mode === 'tamil' ? 'ta-IN' : 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const spoken = ev.results?.[0]?.[0]?.transcript || '';
      if (spoken) setQuickPrompt((prev) => (prev ? `${prev} ${spoken}` : spoken));
    };
    rec.onerror = () => {
      setListening(false);
      setError('Microphone capture failed or permission denied.');
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const handleAskCompanion = async (text: string) => {
    const clean = text.trim();
    if (!clean || sending) return;
    playPopSound('action');
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch<{
        reply: string;
        workspace?: LearnerWorkspaceData;
      }>('/api/mentor/chat', {
        method: 'POST',
        body: JSON.stringify({ message: clean, companionMode: mode }),
      });
      setLatestReply(res.reply);
      setQuickPrompt('');
      if (res.workspace) onWorkspaceUpdate(res.workspace);
      speakText(res.reply, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zyra Companion could not reply.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleAskCompanion(quickPrompt);
  };

  const moodTone =
    briefing.mood === 'celebrating'
      ? 'text-[#2D6A4F] dark:text-[#74C69D]'
      : briefing.mood === 'encouraging'
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-[#2D6A4F] dark:text-[#95D5B2]';

  const moodLabel =
    briefing.mood === 'celebrating'
      ? 'Celebrating Momentum'
      : briefing.mood === 'encouraging'
        ? 'Recovery & Encouragement'
        : 'Focused Guidance';

  const quickChips: Array<{ label: string; prompt: string }> =
    mode === 'tanglish'
      ? [
          {
            label: 'En next step enna?',
            prompt: 'Zyra, ennoda Skill DNA and Failure DNA paathutu next best step Tanglish-la sollu!',
          },
          {
            label: 'Motivate me da',
            prompt: 'Ennoda recent progress paathutu honest feedback and motivation Tanglish-la kudu.',
          },
        ]
      : mode === 'tamil'
        ? [
            {
              label: 'அடுத்த படி என்ன?',
              prompt: 'என் திறன் DNA மற்றும் இலக்குக்கு ஏற்ப அடுத்த முக்கிய படி என்ன?',
            },
            {
              label: 'பாடத் திட்டம் உதவு',
              prompt: 'என் பலவீனமான பாடத்தை எளிமையாகப் புரியவைக்கவும்.',
            },
          ]
        : [
            {
              label: 'What should I tackle next?',
              prompt: 'Based on my Skill DNA and recent progress, what single action should I focus on today?',
            },
            {
              label: 'Turn weak concepts into strengths',
              prompt: 'Explain how I can clear my weakest concepts step by step.',
            },
          ];

  return (
    <section className="p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          <img
            src={zyraAvatar}
            alt="Zyra — Living AI Career Companion"
            className="w-16 h-16 rounded-xl object-cover border border-[#CFE2D6] dark:border-[#2D4739] shrink-0"
          />
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`font-semibold inline-flex items-center gap-1 ${moodTone}`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zyra · Living AI Career Companion</span>
              </span>
              <span aria-hidden="true" className="text-[#94A39B]">·</span>
              <span className="text-[#5C6B63] dark:text-[#99A8A0] font-medium">{moodLabel}</span>
              {briefing.recentAchievement && (
                <>
                  <span aria-hidden="true" className="text-[#94A39B]">·</span>
                  <span className="text-[#2D6A4F] dark:text-[#74C69D] font-medium">
                    {briefing.recentAchievement}
                  </span>
                </>
              )}
            </div>

            <p className="text-base font-semibold text-[#18221D] dark:text-[#ECF2EE] leading-snug">
              {briefing.greeting}
            </p>
            <p className="text-xs text-[#5C6B63] dark:text-[#99A8A0] leading-relaxed">
              {briefing.memoryHighlight}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#F6F9F7] dark:bg-[#101613] p-0.5 text-xs">
            {(['english', 'tamil', 'tanglish'] as CompanionChatMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  playPopSound('pop');
                  setMode(m);
                }}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors whitespace-nowrap ${
                  mode === m
                    ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white'
                    : 'text-[#4B5952] dark:text-[#A9B7AF] hover:text-[#18221D] dark:hover:text-white'
                }`}
              >
                {m === 'tamil' ? 'தமிழ்' : m === 'tanglish' ? 'Tanglish' : 'English'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onNavigate((briefing.suggestedRoute as PageRoute) || 'workplace-sim')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] text-xs font-semibold text-[#1B4332] dark:text-[#95D5B2] hover:bg-[#E1EFE6] dark:hover:bg-[#1E2E26] transition-colors whitespace-nowrap"
          >
            <span>{briefing.suggestedActionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline Living Companion Conversation Bar */}
      <div className="pt-4 border-t border-[#E4ECE7] dark:border-[#24302A] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {quickChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                disabled={sending}
                onClick={() => handleAskCompanion(chip.prompt)}
                className="px-3 py-1.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-xs font-medium text-[#18221D] dark:text-[#ECF2EE] hover:border-[#2D6A4F] dark:hover:border-[#52B788] transition-colors whitespace-nowrap disabled:opacity-60"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setSpeakReplies((s) => !s)}
              disabled={!ttsSupported}
              className="inline-flex items-center gap-1 text-[#5C6B63] dark:text-[#99A8A0] hover:text-[#2D6A4F] dark:hover:text-[#74C69D] disabled:opacity-40 whitespace-nowrap"
              title={ttsSupported ? 'Toggle spoken responses' : 'Speech output unavailable in this browser'}
            >
              {speakReplies ? <Volume2 className="w-3.5 h-3.5 text-[#2D6A4F]" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{speakReplies ? 'Voice Reply On' : 'Voice Reply Off'}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('mentor')}
              className="font-semibold text-[#2D6A4F] dark:text-[#74C69D] hover:underline whitespace-nowrap"
            >
              Full Companion Chat
            </button>
          </div>
        </div>

        {latestReply && (
          <div className="p-3.5 rounded-lg bg-[#F6F9F7] dark:bg-[#19221D] border border-[#DCE5DF] dark:border-[#24302A] text-xs sm:text-sm text-[#18221D] dark:text-[#ECF2EE] leading-relaxed whitespace-pre-wrap">
            <span className="font-semibold text-[#2D6A4F] dark:text-[#74C69D] mr-1.5">Zyra:</span>
            {latestReply}
          </div>
        )}

        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleMic}
            className={`p-2.5 rounded-lg border transition-colors shrink-0 ${
              listening
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                : 'border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-[#5C6B63] hover:text-[#2D6A4F]'
            }`}
            title={speechSupported ? 'Voice input' : 'Voice recognition unavailable in this browser'}
            aria-label="Toggle voice input"
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            placeholder={
              mode === 'tanglish'
                ? 'Ask Zyra in Tanglish (e.g., "JavaScript async bug eppadi fix panradhu?")...'
                : mode === 'tamil'
                  ? 'தமிழில் கேளுங்கள் (கல்வி, குறியீடு, தொழில் வழிகாட்டுதல்)...'
                  : 'Ask Zyra anything about your courses, code bugs, or career goals...'
            }
            className="flex-1 px-3.5 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
          />

          <button
            type="submit"
            disabled={sending || !quickPrompt.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold whitespace-nowrap disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Thinking...' : 'Ask Zyra'}</span>
          </button>
        </form>
      </div>
    </section>
  );
}
