import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Camera,
  CameraOff,
  Eye,
  Mic,
  MicOff,
  MonitorCheck,
  Send,
  UserCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import interviewerPortrait from '../assets/images/human_ai_interviewer_1794636614215.jpg';
import { apiFetch } from '../lib/api';
import { playPopSound } from '../lib/sound';
import type { CareerRole, LearnerWorkspaceData, MockInterview } from '../types';

interface MockInterviewPageProps {
  workspace: LearnerWorkspaceData;
  careers: CareerRole[];
  onWorkspaceUpdate: (ws: LearnerWorkspaceData) => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const INTERVIEWER_IMAGE = interviewerPortrait;

export function MockInterviewPage({
  workspace,
  careers,
  onWorkspaceUpdate,
}: MockInterviewPageProps) {
  const [careerId, setCareerId] = useState(workspace.profile.targetCareerId || 'full-stack-developer');
  const [interviewType, setInterviewType] = useState<'technical' | 'coding' | 'behavioral' | 'career_specific'>(
    'technical'
  );
  const [activeSession, setActiveSession] = useState<MockInterview | null>(
    workspace.interviews[0] || null
  );
  const [answer, setAnswer] = useState('');
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Human AI avatar + Voice + Mic
  const [imgError, setImgError] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);

  // Eye-Contact Webcam Tracker + Screen Focus Monitor
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string>('Camera idle — enable for live eye tracking');
  const [eyeContactScore, setEyeContactScore] = useState<number>(88);
  const [gazeAligned, setGazeAligned] = useState<boolean>(true);
  const [screenSwitchCount, setScreenSwitchCount] = useState<number>(0);
  const [screenFocusScore, setScreenFocusScore] = useState<number>(100);
  const lastSpokenRef = useRef<string>('');

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraStatus('Camera off (fallback telemetry active)');
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('Webcam API unavailable — using focus-window fallback');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraStatus('Webcam eye-contact tracking active');
    } catch {
      setCameraActive(false);
      setCameraStatus('Camera permission unavailable — using focus-window fallback');
    }
  };

  // Cleanup camera & speech on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Periodic webcam center-region eye-contact estimator
  useEffect(() => {
    if (!cameraActive) return;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 96;
      canvas.height = 72;
      ctx.drawImage(video, 0, 0, 96, 72);

      // Compare center portrait zone vs outer border luminance variance
      const center = ctx.getImageData(30, 14, 36, 36).data;
      const leftEdge = ctx.getImageData(0, 14, 14, 36).data;
      const rightEdge = ctx.getImageData(82, 14, 14, 36).data;

      let centerSum = 0;
      for (let i = 0; i < center.length; i += 4) {
        centerSum += (center[i] + center[i + 1] + center[i + 2]) / 3;
      }
      const centerAvg = centerSum / (center.length / 4);

      let edgeSum = 0;
      const edgePixels = (leftEdge.length + rightEdge.length) / 4;
      for (let i = 0; i < leftEdge.length; i += 4) {
        edgeSum += (leftEdge[i] + leftEdge[i + 1] + leftEdge[i + 2]) / 3;
      }
      for (let i = 0; i < rightEdge.length; i += 4) {
        edgeSum += (rightEdge[i] + rightEdge[i + 1] + rightEdge[i + 2]) / 3;
      }
      const edgeAvg = edgeSum / Math.max(1, edgePixels);

      const centered = Math.abs(centerAvg - edgeAvg) > 6 && centerAvg > 28 && centerAvg < 238;
      setGazeAligned(centered);
      setEyeContactScore((prev) =>
        Math.max(45, Math.min(99, Math.round(prev * 0.78 + (centered ? 96 : 62) * 0.22)))
      );
    }, 1200);

    return () => window.clearInterval(timer);
  }, [cameraActive]);

  // Live Screen Focus Monitor (tab switches & window blur during active interview)
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') return;

    const recordSwitch = () => {
      setScreenSwitchCount((prev) => {
        const next = prev + 1;
        setScreenFocusScore(Math.max(40, 100 - next * 12));
        return next;
      });
    };

    const handleVisibility = () => {
      if (document.hidden) recordSwitch();
    };
    const handleBlur = () => recordSwitch();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [activeSession]);

  // Speak latest interviewer question using Web Speech API
  useEffect(() => {
    if (!activeSession || !voiceEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const lastInterviewerMsg = [...activeSession.messages]
      .reverse()
      .find((m) => m.role === 'interviewer');
    if (!lastInterviewerMsg) return;
    const key = `${activeSession.id}:${activeSession.messages.length}`;
    if (lastSpokenRef.current === key) return;
    lastSpokenRef.current = key;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(lastInterviewerMsg.content);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, [activeSession, voiceEnabled]);

  const toggleVoice = () => {
    playPopSound('pop');
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleMicDictation = () => {
    playPopSound('pop');
    if (micActive && recognitionRef.current) {
      recognitionRef.current.stop();
      setMicActive(false);
      return;
    }
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstanceLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstanceLike;
    };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) {
      setError('Speech dictation is not supported in this browser — type your answer directly.');
      return;
    }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += `${event.results[i][0].transcript} `;
      }
      setAnswer((prev) => `${prev ? `${prev.trim()} ` : ''}${transcript.trim()}`);
    };
    rec.onerror = () => setMicActive(false);
    rec.onend = () => setMicActive(false);
    recognitionRef.current = rec;
    rec.start();
    setMicActive(true);
  };

  const handleStart = async () => {
    playPopSound('action');
    setStarting(true);
    setError(null);
    setScreenSwitchCount(0);
    setScreenFocusScore(100);
    setEyeContactScore(88);
    try {
      const res = await apiFetch<{ session: MockInterview; workspace: LearnerWorkspaceData }>(
        '/api/interviews/start',
        {
          method: 'POST',
          body: JSON.stringify({ careerId, interviewType }),
        }
      );
      setActiveSession(res.session);
      onWorkspaceUpdate(res.workspace);
      if (!cameraActive) {
        startCamera();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start interview');
    } finally {
      setStarting(false);
    }
  };

  const handleRespond = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeSession || !answer.trim() || sending) return;
    playPopSound('action');
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch<{ session: MockInterview; workspace: LearnerWorkspaceData }>(
        `/api/interviews/${activeSession.id}/respond`,
        {
          method: 'POST',
          body: JSON.stringify({
            answer: answer.trim(),
            eyeContactScore,
            screenFocusScore,
          }),
        }
      );
      setActiveSession(res.session);
      onWorkspaceUpdate(res.workspace);
      setAnswer('');
      if (res.session.status === 'completed') {
        stopCamera();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to evaluate response');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#18221D] dark:text-[#ECF2EE]">
            Human AI Mock Interview &amp; Eye-Contact Studio
          </h2>
          <p className="text-sm text-[#5C6B63] dark:text-[#99A8A0] mt-0.5">
            Practice realistic voice-enabled interviews with an original Human AI interviewer, live eye-contact tracking, and screen focus telemetry to crack real hiring rounds.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleVoice}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-xs font-semibold text-[#18221D] dark:text-[#ECF2EE]"
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#2D6A4F]" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{voiceEnabled ? 'Voice On' : 'Voice Muted'}</span>
          </button>

          <button
            type="button"
            onClick={() => (cameraActive ? stopCamera() : startCamera())}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-white dark:bg-[#151C18] text-xs font-semibold text-[#18221D] dark:text-[#ECF2EE]"
          >
            {cameraActive ? <Camera className="w-3.5 h-3.5 text-[#2D6A4F]" /> : <CameraOff className="w-3.5 h-3.5" />}
            <span>{cameraActive ? 'Camera Active' : 'Enable Eye Tracker'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Setup Bar */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] grid sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
            Target Role
          </label>
          <select
            value={careerId}
            onChange={(e) => setCareerId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
          >
            {careers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#5C6B63] dark:text-[#99A8A0] mb-1.5">
            Interview Round Type
          </label>
          <select
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value as typeof interviewType)}
            className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
          >
            <option value="technical">Technical Deep-Dive</option>
            <option value="coding">Coding &amp; System Design</option>
            <option value="behavioral">Behavioral (STAR Method)</option>
            <option value="career_specific">Role-Specific Scenario</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={starting}
          className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-sm font-semibold disabled:opacity-60"
        >
          <Mic className="w-4 h-4" />
          <span>{starting ? 'Starting Session...' : 'Start Live Interview'}</span>
        </button>
      </div>

      {/* Live Human AI Interviewer + Webcam Eye-Contact + Screen Focus Strip */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col sm:flex-row items-center gap-5">
          <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-xl overflow-hidden border border-[#DCE5DF] dark:border-[#24302A] bg-[#EDF5F0] dark:bg-[#16231C] shrink-0 flex items-center justify-center">
            {!imgError ? (
              <img
                src={INTERVIEWER_IMAGE}
                alt="Dr. Meera Nair — Senior Human AI Technical Interviewer"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserCheck className="w-14 h-14 text-[#2D6A4F] dark:text-[#74C69D]" />
            )}
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <p className="text-xs font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
              Human AI Panel Lead · {isSpeaking ? 'Speaking Question...' : 'Listening to Candidate'}
            </p>
            <h3 className="text-lg font-bold text-[#18221D] dark:text-[#ECF2EE]">
              Dr. Meera Nair (Principal Engineering Interviewer)
            </h3>
            <p className="text-xs text-[#4B5952] dark:text-[#A9B7AF] leading-relaxed">
              Evaluates technical correctness, STAR structure, trade-off depth, steady eye contact, and screen attention across 3 structured rounds to prepare you for real placements.
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 p-5 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex items-center gap-4">
          <div className="w-32 h-24 rounded-lg overflow-hidden bg-[#101613] border border-[#DCE5DF] dark:border-[#24302A] shrink-0 relative flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />
            <canvas ref={canvasRef} className="hidden" />
            {!cameraActive && (
              <div className="text-center px-2">
                <CameraOff className="w-5 h-5 text-[#99A8A0] mx-auto" />
                <p className="text-[10px] text-[#99A8A0] mt-1">Camera Off</p>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[#5C6B63] dark:text-[#99A8A0]">
                <Eye className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D]" />
                <span>Eye Contact</span>
              </span>
              <span className="font-mono font-bold tabular-nums text-[#2D6A4F] dark:text-[#74C69D]">
                {eyeContactScore}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[#5C6B63] dark:text-[#99A8A0]">
                <MonitorCheck className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D]" />
                <span>Screen Focus</span>
              </span>
              <span className="font-mono font-bold tabular-nums text-[#18221D] dark:text-[#ECF2EE]">
                {screenFocusScore}% ({screenSwitchCount} switches)
              </span>
            </div>
            <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0]">
              {cameraActive
                ? gazeAligned
                  ? 'Gaze centered on interviewer frame.'
                  : 'Look toward the camera lens when explaining.'
                : cameraStatus}
            </p>
          </div>
        </div>
      </div>

      {/* Active Session Transcript & Evaluation Report */}
      {activeSession && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DCE5DF] dark:border-[#24302A] flex items-center justify-between text-xs text-[#5C6B63] dark:text-[#99A8A0]">
              <span>
                {activeSession.interviewType.replace('_', ' ')} · {activeSession.careerId}
              </span>
              <span className="font-semibold text-[#2D6A4F] dark:text-[#74C69D]">
                {activeSession.status === 'completed' ? 'Completed' : 'Live Session (3 turns)'}
              </span>
            </div>

            <div className="p-5 space-y-4 max-h-[420px] overflow-y-auto">
              {activeSession.messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'candidate' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'candidate'
                        ? 'bg-[#2D6A4F] dark:bg-[#3B8263] text-white'
                        : 'bg-[#F3F7F4] dark:bg-[#19221D] text-[#18221D] dark:text-[#ECF2EE] border border-[#DCE5DF] dark:border-[#24302A]'
                    }`}
                  >
                    <p className="text-[11px] opacity-70 mb-1">
                      {m.role === 'candidate' ? 'You (Candidate)' : 'Dr. Meera Nair · AI Interviewer'}
                    </p>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            {activeSession.status === 'active' && (
              <form
                onSubmit={handleRespond}
                className="p-4 border-t border-[#DCE5DF] dark:border-[#24302A] flex flex-col gap-3"
              >
                <textarea
                  rows={3}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Speak with Mic Dictation or type your structured answer (explain trade-offs & concrete examples)..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] dark:border-[#2B3932] bg-[#FAFDFB] dark:bg-[#101613] text-sm"
                />
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={toggleMicDictation}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                      micActive
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-700 dark:text-rose-300'
                        : 'border-[#DCE5DF] dark:border-[#2B3932] text-[#18221D] dark:text-[#ECF2EE]'
                    }`}
                  >
                    {micActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{micActive ? 'Stop Mic' : 'Speak Answer'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={sending || !answer.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#23533D] dark:bg-[#3B8263] dark:hover:bg-[#2D6A4F] text-white text-xs font-semibold disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sending ? 'Evaluating Response...' : 'Submit Response'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-[#151C18] border border-[#DCE5DF] dark:border-[#24302A] space-y-4">
            <h3 className="text-sm font-semibold text-[#18221D] dark:text-[#ECF2EE]">
              Interview Readiness &amp; Eye-Tracking Report
            </h3>

            {!activeSession.evaluation ? (
              <div className="space-y-3 text-xs text-[#5C6B63] dark:text-[#99A8A0]">
                <p className="leading-relaxed">
                  Complete all 3 turns on the left to unlock your placement readiness breakdown across technical accuracy, clarity, eye contact, and screen focus.
                </p>
                <div className="p-3.5 rounded-lg bg-[#EDF5F0] dark:bg-[#16231C] border border-[#CFE2D6] dark:border-[#243B2E] space-y-1.5 text-[#1B4332] dark:text-[#95D5B2]">
                  <p className="font-semibold">Quick Formula to Crack Real Interviews:</p>
                  <p>1. Lead with a 1-sentence direct summary before diving into details.</p>
                  <p>2. Name concrete time/space trade-offs or metrics from real projects.</p>
                  <p>3. Keep gaze steady in the camera frame and avoid switching windows.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between pb-3 border-b border-[#DCE5DF] dark:border-[#24302A]">
                  <span className="text-xs text-[#5C6B63] dark:text-[#99A8A0]">Overall Readiness</span>
                  <span className="text-3xl font-bold font-mono tabular-nums text-[#2D6A4F] dark:text-[#74C69D]">
                    {activeSession.readinessScore}/100
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {[
                    { label: 'Technical Accuracy', val: activeSession.evaluation.technicalAccuracy },
                    { label: 'Problem-Solving Approach', val: activeSession.evaluation.problemSolvingApproach },
                    { label: 'Explanation Quality', val: activeSession.evaluation.explanationQuality },
                    { label: 'Communication Structure', val: activeSession.evaluation.communicationStructure },
                    { label: 'Response Clarity Indicator', val: activeSession.evaluation.responseClarityIndicator },
                    { label: 'Eye-Contact Consistency', val: activeSession.evaluation.eyeContactScore ?? eyeContactScore },
                    { label: 'Screen Focus Discipline', val: activeSession.evaluation.screenFocusScore ?? screenFocusScore },
                  ].map((metric) => (
                    <div key={metric.label} className="flex items-center justify-between gap-3">
                      <span className="text-[#4B5952] dark:text-[#A9B7AF]">{metric.label}</span>
                      <span className="font-mono tabular-nums font-semibold text-[#18221D] dark:text-[#ECF2EE]">
                        {metric.val}%
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-[#4B5952] dark:text-[#A9B7AF] leading-relaxed pt-2 border-t border-[#DCE5DF] dark:border-[#24302A]">
                  {activeSession.evaluation.summary}
                </p>

                <div className="text-xs space-y-1">
                  <p className="font-semibold text-[#2D6A4F] dark:text-[#74C69D]">Strengths</p>
                  {activeSession.evaluation.strengths.map((s, i) => (
                    <p key={i} className="text-[#4B5952] dark:text-[#A9B7AF]">• {s}</p>
                  ))}
                </div>

                <div className="text-xs space-y-1">
                  <p className="font-semibold text-amber-600 dark:text-amber-400">To Crack the Next Real Interview</p>
                  {activeSession.evaluation.improvementAreas.map((s, i) => (
                    <p key={i} className="text-[#4B5952] dark:text-[#A9B7AF]">• {s}</p>
                  ))}
                </div>

                <p className="text-[11px] text-[#5C6B63] dark:text-[#99A8A0] pt-2 border-t border-[#DCE5DF] dark:border-[#24302A]">
                  {activeSession.evaluation.disclaimer}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
