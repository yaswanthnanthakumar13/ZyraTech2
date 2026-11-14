import { X, Cpu, CheckCircle2, ArrowRight } from 'lucide-react';
import type { AIAgentDecision } from '../types';

interface AgentTraceDrawerProps {
  decision: AIAgentDecision | null;
  onClose: () => void;
}

export function AgentTraceDrawer({ decision, onClose }: AgentTraceDrawerProps) {
  if (!decision) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Multi-Agent Orchestrator Decision Trace"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-[#0B1224] border-l border-[#DCE5DF] dark:border-[#24302A] h-full overflow-y-auto p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#DCE5DF] dark:border-[#24302A]">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Cpu className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D]" />
              <span>Central AI Orchestrator</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{decision.triggerEvent}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{new Date(decision.createdAt).toLocaleString()}</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Multi-Agent Decision Trace
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-[#DCE5DF] dark:border-[#24302A] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close trace"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-[#F6F9F7] dark:bg-[#18211C] border border-[#DCE5DF] dark:border-[#24302A]">
            <p className="text-xs font-medium text-[#2D6A4F] dark:text-[#74C69D] mb-1.5">
              Orchestrator Synthesis
            </p>
            <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100 font-medium">
              {decision.orchestratorSummary}
            </p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 mt-3">
              {decision.explanation}
            </p>
            <div className="mt-4 pt-3 border-t border-[#DCE5DF] dark:border-[#24302A] flex items-start gap-2.5">
              <ArrowRight className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Decided Next Action</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  {decision.nextAction}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              {decision.triggerEvent === 'EXPERT_COUNCIL_REVIEW'
                ? `AI Expert Council Findings (${decision.agentOutputs.length} Agents)`
                : `Specialized Agent Outputs (${decision.agentOutputs.length} Agents)`}
            </h3>
            <div className="divide-y divide-[#E4ECE7] dark:divide-[#24302A] border border-[#DCE5DF] dark:border-[#24302A] rounded-xl overflow-hidden bg-white dark:bg-[#151C18]">
              {decision.agentOutputs.map((agent, idx) => (
                <div key={`${agent.agentName}-${idx}`} className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      0{idx + 1}. {agent.agentName}
                    </h4>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {agent.summary}
                  </p>
                  {agent.keyFindings.length > 0 && (
                    <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      {agent.keyFindings.map((f, i) => (
                        <p key={i}>Finding: {f}</p>
                      ))}
                    </div>
                  )}
                  {agent.recommendations.length > 0 && (
                    <div className="mt-2 text-xs text-[#2D6A4F] dark:text-[#74C69D] space-y-1">
                      {agent.recommendations.map((r, i) => (
                        <p key={i}>Recommendation: {r}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
