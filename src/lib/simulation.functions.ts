import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { SCENARIOS, type Scenario } from "./scenarios";

const MODEL = "google/gemini-2.5-flash";

function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
}

const DecisionInput = z.object({
  scenarioId: z.string(),
  step: z.number(),
  totalSteps: z.number(),
  decision: z.string().min(1).max(2000),
  currentSuggestedActions: z.array(z.string().min(1).max(160)).max(8).optional(),
  history: z
    .array(z.object({ step: z.number(), decision: z.string(), reaction: z.string() }))
    .max(30),
  language: z.enum(["ru", "en"]).optional().default("ru"),
});

const ReactionSchema = z.object({
  reaction: z.string().describe("How the company/stakeholders react in 2-4 short sentences."),
  newUpdate: z.string().describe("A new event or piece of information that just happened, 1 sentence with a timestamp like '10:42 AM'."),
  newMessage: z
    .object({
      from: z.string(),
      role: z.string(),
      text: z.string(),
    })
    .describe("A new stakeholder message reacting to the decision."),
  metricChanges: z
    .array(z.object({ label: z.string(), value: z.string(), delta: z.string() }))
    .max(4)
    .describe("Updated values for 1-4 existing metrics."),
  hiddenScores: z
    .object({
      productSuccess: z.number(),
      teamMorale: z.number(),
      budgetHealth: z.number(),
      deliverySpeed: z.number(),
      userImpact: z.number(),
    })
    .describe("Each from 0-100 reflecting current state after this decision."),
  suggestedActions: z.array(z.string()).max(4),
});

type ReactionOutput = z.infer<typeof ReactionSchema>;
function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function decisionScore(decision: string) {
  const text = decision.toLowerCase();
  const strong = /(анализ|данн|интерв|клиент|провер|оцен|сегмент|план|proposal|teardown|customer|interview|data|analy|estimate|review|segment|draft|plan)/i.test(text);
  const risky = /(откат|rollback|эскал|уведом|kill|sunset|cut|сократ|закрыть)/i.test(text);
  return strong ? 12 : risky ? 4 : 8;
}

function fallbackReaction(scenario: Scenario, data: z.infer<typeof DecisionInput>): ReactionOutput {
  const isRu = data.language === "ru";
  const score = decisionScore(data.decision);
  const actions = data.currentSuggestedActions?.length ? data.currentSuggestedActions : scenario.suggestedActions;
  const rotatedActions = actions.length
    ? actions.map((_, i) => actions[(i + data.step) % actions.length]).slice(0, 4)
    : [isRu ? "Собрать данные" : "Gather data", isRu ? "Согласовать план" : "Align on a plan"];
  const stakeholder = scenario.messages[data.step % Math.max(1, scenario.messages.length)] ?? scenario.messages[0];
  const base = 48 + data.step * 4 + score;

  return {
    reaction: isRu
      ? `Ты выбрал(а): «${data.decision}». Команда получает более понятный следующий шаг, но стейкхолдеры всё ещё ждут доказательств и конкретного плана.`
      : `You chose: “${data.decision}”. The team gets a clearer next step, but stakeholders still expect evidence and a concrete plan.`,
    newUpdate: isRu
      ? `10:${String(35 + data.step).padStart(2, "0")} — появились новые вводные по сценарию «${scenario.scenario}».`
      : `10:${String(35 + data.step).padStart(2, "0")} — new context arrived for “${scenario.scenario}”.`,
    newMessage: {
      from: stakeholder?.from ?? (isRu ? "Стейкхолдер" : "Stakeholder"),
      role: stakeholder?.role ?? (isRu ? "Команда" : "Team"),
      text: isRu
        ? `Ок, это помогает. Теперь важно связать решение с метриками и рисками: ${scenario.companyGoal}`
        : `Okay, this helps. Now connect the decision to metrics and risks: ${scenario.companyGoal}`,
    },
    metricChanges: scenario.metrics.slice(0, 4).map((metric, index) => ({
      label: metric.label,
      value: metric.value,
      delta: isRu
        ? index === 0
          ? "+2 п.п. после решения"
          : "умеренное улучшение"
        : index === 0
          ? "+2 pts after decision"
          : "moderate improvement",
    })),
    hiddenScores: {
      productSuccess: clampScore(base + 5),
      teamMorale: clampScore(base - 2),
      budgetHealth: clampScore(base - 6),
      deliverySpeed: clampScore(base),
      userImpact: clampScore(base + 3),
    },
    suggestedActions: rotatedActions,
  };
}

function buildContext(s: Scenario) {
  return `You are the simulation engine for a Product/Project Manager workplace simulator. Be realistic, never preachy or tutor-like. Information may be ambiguous. React like a real company would.

SCENARIO: ${s.title}
ROLE: ${s.role}
COMPANY: ${s.company.name} - ${s.company.about}
SITUATION: ${s.briefing}
COMPANY GOAL: ${s.companyGoal}
CURRENT METRICS: ${s.metrics.map((m) => `${m.label}=${m.value} (${m.delta ?? ""})`).join(", ")}`;
}

export const reactToDecision = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DecisionInput.parse(d))
  .handler(async ({ data }) => {
    const scenario = SCENARIOS.find((s) => s.id === data.scenarioId);
    if (!scenario) throw new Error("Scenario not found");

    const historyText = data.history
      .map((h) => `Step ${h.step}: User did "${h.decision}" → ${h.reaction}`)
      .join("\n");

    const langInstruction =
      data.language === "ru"
        ? "IMPORTANT: Respond ENTIRELY in Russian. All fields (reaction, newUpdate, newMessage.text, newMessage.from, newMessage.role, metric labels/values/deltas, suggestedActions) must be in Russian."
        : "Respond entirely in English.";

    try {
      const { output } = await generateText({
        model: getModel(),
        output: Output.object({ schema: ReactionSchema }),
        prompt: `${buildContext(scenario)}

DECISION HISTORY:
${historyText || "(none yet)"}

USER DECISION at step ${data.step}/${data.totalSteps}: "${data.decision}"

Generate the realistic next state. Stakeholder reactions can be supportive, frustrated, demanding, or unclear. Metrics should change plausibly based on the action. Hidden scores 0-100 reflect overall trajectory.

${langInstruction}`,
      });

      return output;
    } catch (error) {
      console.error("reactToDecision fallback", error);
      return fallbackReaction(scenario, data);
    }
  });

const ReportInput = z.object({
  scenarioId: z.string(),
  history: z.array(z.object({ step: z.number(), decision: z.string(), reaction: z.string() })),
  language: z.enum(["ru", "en"]).optional().default("ru"),
});

const ReportSchema = z.object({
  finalScore: z.number().describe("0-100 overall score"),
  verdict: z.string().describe("One short phrase, e.g. 'Good Performance'"),
  skills: z.object({
    productThinking: z.number(),
    analytics: z.number(),
    communication: z.number(),
    prioritization: z.number(),
    execution: z.number(),
    riskManagement: z.number(),
  }),
  strengths: z.array(z.string()).max(4),
  improvements: z.array(z.string()).max(4),
  summary: z.string().describe("2-3 sentence AI evaluation summary"),
  recommendations: z.array(z.string()).max(4),
});

type ReportOutput = z.infer<typeof ReportSchema>;

function fallbackReport(scenario: Scenario, data: z.infer<typeof ReportInput>): ReportOutput {
  const isRu = data.language === "ru";
  const decisions = data.history.map((h) => h.decision).join(" ");
  const scoreBase = clampScore(62 + data.history.reduce((sum, h) => sum + decisionScore(h.decision), 0) / Math.max(1, data.history.length));

  return {
    finalScore: scoreBase,
    verdict: isRu ? (scoreBase >= 75 ? "Сильное решение" : "Хорошая база") : scoreBase >= 75 ? "Strong performance" : "Good foundation",
    skills: {
      productThinking: clampScore(scoreBase + (/(клиент|customer|interview|интерв)/i.test(decisions) ? 8 : 0)),
      analytics: clampScore(scoreBase + (/(анализ|data|данн|metric|метрик)/i.test(decisions) ? 8 : -2)),
      communication: clampScore(scoreBase + 2),
      prioritization: clampScore(scoreBase + (/(приор|scope|скоуп|cost|стоим)/i.test(decisions) ? 6 : 0)),
      execution: clampScore(scoreBase - 1),
      riskManagement: clampScore(scoreBase + (/(risk|риск|rollback|откат|estimate|оцен)/i.test(decisions) ? 6 : -1)),
    },
    strengths: isRu
      ? ["Действия связаны с контекстом сценария", "Есть движение к проверке гипотез", "Решения помогают выровнять команду"]
      : ["Actions match the scenario context", "You moved toward validating hypotheses", "Decisions helped align the team"],
    improvements: isRu
      ? ["Чётче фиксируй критерии успеха", "Раньше показывай риски и trade-offs", "Связывай каждое решение с метриками"]
      : ["Define success criteria more clearly", "Surface risks and trade-offs earlier", "Tie every decision to metrics"],
    summary: isRu
      ? `Ты прошёл(ла) сценарий «${scenario.title}» без критичных провалов. Следующий уровень — меньше общих действий и больше конкретики по данным, рискам и владельцам.`
      : `You completed “${scenario.title}” without critical misses. The next level is fewer generic actions and more specificity around data, risks, and owners.`,
    recommendations: isRu
      ? ["Перед решением формулируй гипотезу", "Показывай, какие данные нужны", "Назначай владельцев и сроки", "Отдельно проговаривай риски"]
      : ["State the hypothesis before deciding", "Show what data is needed", "Assign owners and dates", "Call out risks separately"],
  };
}

export const generateReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReportInput.parse(d))
  .handler(async ({ data }) => {
    const scenario = SCENARIOS.find((s) => s.id === data.scenarioId);
    if (!scenario) throw new Error("Scenario not found");

    const historyText = data.history
      .map((h) => `Step ${h.step}: "${h.decision}" → ${h.reaction}`)
      .join("\n");

    const langInstruction =
      data.language === "ru"
        ? "IMPORTANT: Write ALL text fields (verdict, strengths, improvements, summary, recommendations) ENTIRELY in Russian."
        : "Write all text in English.";

    try {
      const { output } = await generateText({
        model: getModel(),
        output: Output.object({ schema: ReportSchema }),
        prompt: `Evaluate this ${scenario.role}'s performance in the simulation "${scenario.title}".

CONTEXT:
${buildContext(scenario)}

DECISIONS MADE:
${historyText}

Score 0-100 across 6 PM/PgM skills. Be honest but constructive. Provide concrete strengths, areas to improve, and specific recommendations.

${langInstruction}`,
      });

      return output;
    } catch (error) {
      console.error("generateReport fallback", error);
      return fallbackReport(scenario, data);
    }
  });
