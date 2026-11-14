import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BookOpenCheck, MessageCircleQuestion, RotateCcw, Send, ShieldAlert, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { playPopSound } from '../lib/sound';
import type { LearnerWorkspaceData } from '../types';

interface DomainDoubtAssistantProps {
  workspace: LearnerWorkspaceData;
}

interface DoubtMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  domain: string;
  refused?: boolean;
}

const BASE_DOMAINS = [
  'Full-Stack Web Development',
  'Python & Data Structures',
  'JavaScript & React',
  'SQL & Relational Databases',
  'Cybersecurity & Networking',
  'Cloud, Linux & DevOps',
  'Data Science & Machine Learning',
];

export function DomainDoubtAssistant({ workspace }: DomainDoubtAssistantProps) {
  const activeCareerTitle = workspace.compatibility?.career.title;
  const domainOptions = Array.from(
    new Set([...(activeCareerTitle ? [activeCareerTitle] : []), ...BASE_DOMAINS])
  );

  const [open, setOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string>(domainOptions[0]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<DoubtMessage[]>([
    {
      id: 'welcome-doubt',
      role: 'assistant',
      domain: domainOptions[0],
      content: `Ask any academic, coding, or syllabus doubt in ${domainOptions[0]}. This assistant answers educational questions only and stays hidden during assessments.`,
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeCareerTitle && !domainOptions.includes(selectedDomain)) {
      setSelectedDomain(activeCareerTitle);
    }
  }, [activeCareerTitle, domainOptions, selectedDomain]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const sendDoubt = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    playPopSound('action');
    setError(null);
    const userMsg: DoubtMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      domain: selectedDomain,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await apiFetch<{
        reply: string;
        domain: string;
        usedGemini: boolean;
        refused?: boolean;
      }>('/api/assistant/doubt', {
        method: 'POST',
        body: JSON.stringify({
          domain: selectedDomain,
          question: trimmed,
          history: nextMessages
            .filter((m) => m.id !== 'welcome-doubt')
            .slice(-6)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          domain: res.domain,
          refused: res.refused,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to clear doubt right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendDoubt(input);
  };

  const handleResetChat = () => {
    playPopSound('pop');
    setError(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        domain: selectedDomain,
        content: `Doubt session cleared. Active educational domain: ${selectedDomain}. What concept or coding bug can I help clarify?`,
      },
    ]);
  };

  const quickPrompts = [
    `Explain a core ${selectedDomain} concept simply`,
    `Common mistake students make in ${selectedDomain}?`,
    `How do I structure a daily project in ${selectedDomain}?`,
  ];

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {open && (
        <section
          aria-label="Educational Domain Doubt Assistant"
          className="mb-3 w-[calc(100vw-2rem)] sm:w-[400px] max-h-[76vh] flex flex-col rounded-2xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#2D6A4F] dark:bg-[#23533D] text-white flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-4 h-4 shrink-0" />
                <h2 className="text-sm font-bold truncate">AI Doubt Solver</h2>
              </div>
              <p className="text-[11px] text-emerald-100 truncate mt-0.5">
                Educational doubts in selected domain only
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                title="Reset doubt chat"
                aria-label="Reset doubt chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  playPopSound('pop');
                  setOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                title="Close Doubt Solver"
                aria-label="Close Doubt Solver"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Domain Selector */}
          <div className="px-4 py-2.5 bg-[#F6F9F7] dark:bg-[#121916] border-b border-[#DCE5DF] dark:border-[#24302A] shrink-0">
            <label className="block text-[11px] font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1">
              Selected Study Domain
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => {
                playPopSound('pop');
                setSelectedDomain(e.target.value);
              }}
              className="w-full px-3 py-1.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#18211C] text-xs font-semibold text-[#18221D] dark:text-[#ECF2EE] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            >
              {domainOptions.map((dom) => (
                <option key={dom} value={dom}>
                  {dom}
                </option>
              ))}
            </select>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFDFB] dark:bg-[#101613]"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white'
                      : msg.refused
                        ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                        : 'bg-white dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#25322C] text-[#18221D] dark:text-[#ECF2EE]'
                  }`}
                >
                  {msg.refused && (
                    <div className="flex items-center gap-1.5 font-semibold mb-1 text-rose-700 dark:text-rose-300">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>Educational Scope Guardrail</span>
                    </div>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#25322C] text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                  Solving {selectedDomain} doubt...
                </div>
              </div>
            )}

            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-[11px] text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Quick Educational Doubt Starters */}
          <div className="px-3 py-2 bg-[#F6F9F7] dark:bg-[#121916] border-t border-[#DCE5DF] dark:border-[#24302A] flex flex-wrap gap-1.5 shrink-0">
            {quickPrompts.map((qp) => (
              <button
                key={qp}
                type="button"
                disabled={loading}
                onClick={() => void sendDoubt(qp)}
                className="px-2.5 py-1 rounded-md border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#18211C] text-[11px] font-medium text-[#2E3A33] dark:text-[#C4D0C9] hover:border-[#2D6A4F] truncate max-w-full"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white dark:bg-[#151C18] border-t border-[#DCE5DF] dark:border-[#24302A] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask a ${selectedDomain} doubt...`}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-xs text-[#18221D] dark:text-[#ECF2EE] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center justify-center p-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white disabled:opacity-50 transition-colors"
              aria-label="Send doubt"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      )}

      {/* Floating Popup Trigger Button */}
      <button
        type="button"
        onClick={() => {
          playPopSound('action');
          setOpen((prev) => !prev);
        }}
        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold shadow-lg transition-colors whitespace-nowrap"
        aria-expanded={open}
        aria-label="Open Educational Domain Doubt Solver"
      >
        <MessageCircleQuestion className="w-4 h-4 shrink-0" />
        <span>{open ? 'Hide Doubt Solver' : 'AI Doubt Solver'}</span>
      </button>
    </div>
  );
}
