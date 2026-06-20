import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "../ai-gateway.server";

const MODEL = "google/gemini-2.5-flash";

function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
}

/* ---------------- Written / call-answer grading ---------------- */

const GradeInput = z.object({
  prompt: z.string().min(1).max(2000),
  criteria: z.array(z.string().min(1)).min(1).max(8),
  answer: z.string().min(1).max(8000),
});

const GradeSchema = z.object({
  passed: z.boolean().describe("true only if ALL criteria are met"),
  metCriteria: z.array(z.string()).describe("criteria texts that are satisfied"),
  unmetCriteria: z.array(z.string()).describe("criteria texts that are NOT satisfied"),
  guidingQuestion: z
    .string()
    .describe("If not passed: ONE guiding question pointing at an unmet criterion. Empty if passed."),
  feedback: z.string().describe("Short feedback in Russian explicitly referencing the criteria checklist."),
});

export type GradeResult = z.infer<typeof GradeSchema>;

function fallbackGrade(data: z.infer<typeof GradeInput>): GradeResult {
  const ans = data.answer.toLowerCase();
  const met: string[] = [];
  const unmet: string[] = [];
  for (const c of data.criteria) {
    const words = c.toLowerCase().match(/[a-zа-яё]{4,}/gi) ?? [];
    const hits = words.filter((w) => ans.includes(w)).length;
    if (data.answer.length > 40 && hits >= Math.max(1, Math.floor(words.length * 0.2))) met.push(c);
    else unmet.push(c);
  }
  const passed = unmet.length === 0;
  return {
    passed,
    metCriteria: met,
    unmetCriteria: unmet,
    guidingQuestion: passed ? "" : `Подумай ещё раз про критерий: «${unmet[0]}». Что в твоём ответе его закрывает?`,
    feedback: passed
      ? "Ответ закрывает все критерии чек-листа."
      : `Не закрыты критерии: ${unmet.join("; ")}.`,
  };
}

export const gradeWritten = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GradeInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const { output } = await generateText({
        model: getModel(),
        output: Output.object({ schema: GradeSchema }),
        prompt: `Ты строгий, но доброжелательный преподаватель курса по проектному менеджменту. Оцени ответ студента СТРОГО по чек-листу критериев. Не дорабатывай ответ за студента. Если критерий не закрыт — задай ОДИН наводящий вопрос по непокрытому критерию.

ЗАДАНИЕ: ${data.prompt}

ЧЕК-ЛИСТ КРИТЕРИЕВ:
${data.criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

ОТВЕТ СТУДЕНТА:
"""${data.answer}"""

Верни структурированную оценку. passed = true ТОЛЬКО если выполнены ВСЕ критерии. Весь текст (feedback, guidingQuestion) — на русском языке и явно ссылается на критерии.`,
      });
      return output;
    } catch (error) {
      console.error("gradeWritten fallback", error);
      return fallbackGrade(data);
    }
  });

/* ---------------- AI call character reply ---------------- */

const CallInput = z.object({
  personaName: z.string(),
  personaRole: z.string(),
  character: z.string(),
  hiddenInfo: z.string(),
  revealCondition: z.string(),
  brief: z.string(),
  history: z.array(z.object({ role: z.enum(["user", "persona"]), text: z.string() })).max(40),
  userMessage: z.string().min(1).max(4000),
});

const ReplySchema = z.object({
  reply: z.string().describe("The character's next spoken line in Russian, 1-4 sentences."),
  revealed: z.boolean().describe("true if the hidden info was just revealed in this reply"),
});

export type CallReply = z.infer<typeof ReplySchema>;

export const callReply = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CallInput.parse(d))
  .handler(async ({ data }): Promise<CallReply> => {
    const convo = data.history
      .map((h) => `${h.role === "user" ? "PM" : data.personaName}: ${h.text}`)
      .join("\n");
    try {
      const { output } = await generateText({
        model: getModel(),
        output: Output.object({ schema: ReplySchema }),
        prompt: `Ты играешь персонажа в телефонном звонке-симуляции для обучения проектных менеджеров. Оставайся в роли, говори естественно и реалистично, как живой человек. Отвечай на русском языке.

ПЕРСОНАЖ: ${data.personaName}, ${data.personaRole}
ХАРАКТЕР: ${data.character}
КОНТЕКСТ ЗВОНКА: ${data.brief}
СКРЫТАЯ ИНФОРМАЦИЯ (НЕ раскрывай по умолчанию): ${data.hiddenInfo}
УСЛОВИЕ РАСКРЫТИЯ: ${data.revealCondition}

ВАЖНО: раскрывай скрытую информацию ТОЛЬКО если PM явно задал вопрос, подпадающий под условие раскрытия. Иначе отвечай в характере, не выдавая её.

ИСТОРИЯ ЗВОНКА:
${convo || "(звонок только начался)"}

PM только что сказал: "${data.userMessage}"

Ответь как ${data.personaName}. Укажи revealed=true только если в этом ответе ты впервые раскрыл скрытую информацию.`,
      });
      return output;
    } catch (error) {
      console.error("callReply fallback", error);
      return {
        reply: `(${data.personaName}) Извини, плохо слышно. Можешь переформулировать вопрос?`,
        revealed: false,
      };
    }
  });
