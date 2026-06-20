import { useCallback, useMemo, useReducer } from "react";
import type { Choice, Effects, Mission, Step } from "./types";

export interface ScaleState {
  budget: number;
  timeline: number;
  morale: number;
}

export type MissionStatus = "intro" | "playing" | "won" | "lost";

export interface LogEntry {
  stepId: string;
  stepTitle: string;
  phase: string;
  object: Step["object"];
  choiceText: string;
  feedback: string;
  reply?: string;
  effects: Effects;
}

export interface MissionState {
  status: MissionStatus;
  stepIndex: number;
  scales: ScaleState;
  /** Current value of the headline product metric. */
  metric: number;
  log: LogEntry[];
  /** Step id where a fatal error happened (for the Game Over screen). */
  fatalStepId?: string;
  fatalReason?: string;
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

type Action =
  | { type: "start" }
  | { type: "choose"; mission: Mission; step: Step; choice: Choice }
  | { type: "reset"; mission: Mission };

function initState(mission: Mission): MissionState {
  const s = mission.startScales ?? { budget: 70, timeline: 70, morale: 70 };
  return {
    status: "intro",
    stepIndex: 0,
    scales: { ...s },
    metric: mission.metric.start,
    log: [],
  };
}

function reducer(state: MissionState, action: Action): MissionState {
  switch (action.type) {
    case "start":
      return { ...state, status: "playing" };
    case "reset":
      return initState(action.mission);
    case "choose": {
      const { mission, step, choice } = action;
      const e = choice.effects;
      const scales: ScaleState = {
        budget: clamp(state.scales.budget + (e.budget ?? 0)),
        timeline: clamp(state.scales.timeline + (e.timeline ?? 0)),
        morale: clamp(state.scales.morale + (e.morale ?? 0)),
      };
      const metric = Math.max(0, Math.round((state.metric + (e.metric ?? 0)) * 10) / 10);

      const entry: LogEntry = {
        stepId: step.id,
        stepTitle: step.title,
        phase: step.phase,
        object: step.object,
        choiceText: choice.text,
        feedback: choice.feedback,
        reply: choice.reply,
        effects: e,
      };
      const log = [...state.log, entry];

      // Fatal choice → instant loss.
      if (choice.fatal) {
        return {
          ...state,
          scales,
          metric,
          log,
          status: "lost",
          fatalStepId: step.id,
          fatalReason: choice.feedback,
        };
      }

      // A critical scale bottomed out.
      const dead =
        scales.budget <= 0 ? "Бюджет" : scales.timeline <= 0 ? "Сроки" : scales.morale <= 0 ? "Мотивация команды" : null;
      if (dead) {
        return {
          ...state,
          scales,
          metric,
          log,
          status: "lost",
          fatalStepId: step.id,
          fatalReason: `${dead} упали до нуля — проект остановлен.`,
        };
      }

      const nextIndex = state.stepIndex + 1;
      // Last step done → evaluate the goal.
      if (nextIndex >= mission.steps.length) {
        const won = metric >= mission.metric.target;
        return {
          ...state,
          scales,
          metric,
          log,
          stepIndex: nextIndex,
          status: won ? "won" : "lost",
          fatalReason: won ? undefined : "Финал достигнут, но целевая метрика не выполнена.",
        };
      }

      return { ...state, scales, metric, log, stepIndex: nextIndex };
    }
    default:
      return state;
  }
}

export function useMissionEngine(mission: Mission) {
  const [state, dispatch] = useReducer(reducer, mission, initState);

  const start = useCallback(() => dispatch({ type: "start" }), []);
  const reset = useCallback(() => dispatch({ type: "reset", mission }), [mission]);
  const choose = useCallback(
    (step: Step, choice: Choice) => dispatch({ type: "choose", mission, step, choice }),
    [mission],
  );

  const currentStep = mission.steps[state.stepIndex];
  const progressPct = Math.round((Math.min(state.stepIndex, mission.steps.length) / mission.steps.length) * 100);
  const metricPct = useMemo(() => {
    const { start, target } = mission.metric;
    if (target === start) return 100;
    return clamp(((state.metric - start) / (target - start)) * 100);
  }, [state.metric, mission.metric]);

  return { state, currentStep, progressPct, metricPct, start, reset, choose };
}
