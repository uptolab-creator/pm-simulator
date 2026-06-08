import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { SCENARIOS, type Scenario } from "./scenarios";

const MODEL = "google/gemini-3-flash-preview";

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
  });
