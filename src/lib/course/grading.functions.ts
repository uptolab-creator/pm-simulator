import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "../ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

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

const CallGradeInput = GradeInput.extend({
  hiddenInfo: z.string().optional().default(""),
  transcript: z.array(z.object({ role: z.enum(["user", "persona"]), text: z.string() })).optional().default([]),
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
  const stopWords = new Set([
    "ответ",
    "называет",
    "учитывает",
    "упомянута",
    "упомянуты",
    "упомянут",
    "критерий",
    "конкретный",
    "через",
    "роль",
    "если",
    "что",
    "как",
    "для",
    "или",
    "the",
    "and",
  ]);
  const met: string[] = [];
  const unmet: string[] = [];
  for (const c of data.criteria) {
    const words = (c.toLowerCase().match(/[a-zа-яё]{4,}/gi) ?? []).filter((w) => !stopWords.has(w));
    const hits = words.filter((w) => ans.includes(w)).length;
    if (data.answer.length > 25 && hits >= Math.max(1, Math.floor(words.length * 0.18))) met.push(c);
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

function meaningfulWords(value: string) {
  const stopWords = new Set([
    "ответ",
    "называет",
    "учитывает",
    "упомянута",
    "упомянуты",
    "упомянут",
    "критерий",
    "конкретный",
    "через",
    "роль",
    "если",
    "что",
    "как",
    "для",
    "или",
    "это",
    "the",
    "and",
  ]);
  return (value.toLowerCase().match(/[a-zа-яё]{4,}/gi) ?? []).filter((w) => !stopWords.has(w));
}

function fallbackCallAnswerGrade(data: z.infer<typeof CallGradeInput>): GradeResult {
  const answer = data.answer.toLowerCase();
  const transcript = data.transcript.map((t) => t.text).join(" ").toLowerCase();
  const important = meaningfulWords(`${data.prompt} ${data.criteria.join(" ")} ${data.hiddenInfo}`).slice(0, 30);
  const hits = important.filter((w) => answer.includes(w)).length;
  const hiddenWasDiscussed = meaningfulWords(data.hiddenInfo).some((w) => transcript.includes(w) || answer.includes(w));
  const pmSignals = /(риск|срок|блокер|зависим|приоритет|план|следующ|уточн|готов|оценк|бюджет|объ[её]м|scope|api|макет|метрик|ценност)/i.test(
    data.answer,
  );
  const passed = data.answer.trim().length >= 35 && (hiddenWasDiscussed || pmSignals || hits >= 2);

  return {
    passed,
    metCriteria: passed ? data.criteria : data.criteria.filter((c) => meaningfulWords(c).some((w) => answer.includes(w))),
    unmetCriteria: passed ? [] : data.criteria,
    guidingQuestion: passed
      ? ""
      : "Сформулируй не дословную фразу, а управленческий вывод: что ты выяснил на звонке и какое действие PM из этого следует?",
    feedback: passed
      ? "Ответ засчитан по смыслу: ты связал вывод со звонком и следующим PM-действием."
      : "Пока не видно управленческого вывода из звонка: нужен риск/ограничение/следующий шаг, а не точная угадываемая формулировка.",
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

export const gradeCallAnswer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CallGradeInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const { output } = await generateText({
        model: getModel(),
        output: Output.object({ schema: GradeSchema }),
        prompt: `Ты оцениваешь итоговый ответ студента после учебного Zoom-созвона по проектному менеджменту.

ВАЖНО: это НЕ игра в угадывание одной фразы. Засчитывай синонимы, неполные, но управленчески верные формулировки и ответы, где студент понял смысл разговора. Не требуй дословного совпадения со скрытой информацией.

ОТКРЫТЫЙ ВОПРОС: ${data.prompt}

ЧЕК-ЛИСТ:
${data.criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

КОНТЕКСТ, который мог быть выяснен в разговоре:
${data.hiddenInfo || "нет отдельной скрытой детали"}

СТЕНОГРАММА ЗВОНКА:
${data.transcript.map((t) => `${t.role === "user" ? "PM" : "Собеседник"}: ${t.text}`).join("\n") || "(стенограммы нет)"}

ОТВЕТ СТУДЕНТА:
"""${data.answer}"""

passed=true, если ответ по смыслу закрывает управленческий вывод: что выяснили, почему это важно и какой следующий шаг PM. Если не хватает детали — задай ОДИН наводящий вопрос. Весь текст — на русском.`,
      });
      return output;
    } catch (error) {
      console.error("gradeCallAnswer fallback", error);
      return fallbackCallAnswerGrade(data);
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
  revealedAlready: z.boolean().optional().default(false),
});

const ReplySchema = z.object({
  reply: z.string().describe("The character's next spoken line in Russian, 1-4 sentences."),
  revealed: z.boolean().describe("true if the hidden info was just revealed in this reply"),
});

export type CallReply = z.infer<typeof ReplySchema>;

function fallbackCallReply(data: z.infer<typeof CallInput>): CallReply {
  const text = data.userMessage.toLowerCase();
  const previousPersona = data.history.filter((h) => h.role === "persona").map((h) => h.text.toLowerCase()).join(" ");
  const revealWords = meaningfulWords(`${data.revealCondition} ${data.hiddenInfo}`);
  const intentWords = [
    "статус",
    "готов",
    "компонент",
    "api",
    "срок",
    "время",
    "сколько",
    "занят",
    "загрузка",
    "почему",
    "риск",
    "оценк",
    "входит",
    "блокер",
    "мешает",
    "зависим",
    "приоритет",
    "метрик",
    "ценност",
    "пользовател",
    "отч",
    "успех",
  ];
  const asksOpenQuestion = /\?|расска|объясн|почему|какие|какой|что|когда|сколько|насколько|помоги|давай|можем|можешь/i.test(text);
  const alreadyRevealed = data.revealedAlready || meaningfulWords(data.hiddenInfo).some((w) => previousPersona.includes(w));
  const shouldReveal = !alreadyRevealed && [...revealWords, ...intentWords].some((word) => text.includes(word));

  if (shouldReveal) {
    const detail = data.hiddenInfo.replace(/[.!?…]+$/u, "");
    return {
      reply: `Да, вот важный нюанс: ${detail}. Поэтому я бы не фиксировал решение вслепую — сначала надо связать это с планом, риском и следующим шагом.`,
      revealed: true,
    };
  }

  if (alreadyRevealed) {
    return {
      reply: `Если коротко, ключевая вводная уже на столе: ${data.hiddenInfo.replace(/[.!?…]+$/u, "")}. Дальше я жду от тебя как PM понятный следующий шаг: что фиксируем, кого подключаем и какой риск снимаем.`,
      revealed: false,
    };
  }

  if (asksOpenQuestion) {
    return {
      reply: `Я понял вопрос. По текущей ситуации могу сказать так: ${data.brief} Сам я пока не уверен, что мы видим весь контекст — уточни у меня сроки, ограничения, зависимости или критерий успеха, и я смогу дать более полезную вводную.`,
      revealed: false,
    };
  }

  const role = data.personaRole.toLowerCase();
  const nudge = role.includes("разработ")
    ? "Технически ситуация не чёрно-белая. Если тебе нужен управленческий вывод, уточни срок, блокер, зависимость или что входит в работу."
    : role.includes("дизайн")
      ? "С макетами есть нюансы по приоритетам и загрузке. Спроси, что именно мешает или от чего зависит готовность."
      : role.includes("ceo") || role.includes("спонсор")
        ? "Мне важно услышать управляемый план, а не общие обещания. Уточни, что мешает релизу, какие есть риски и что ты предлагаешь как PM."
        : "Давай предметно: уточни риск, срок, объём, зависимость или критерий успеха — тогда я дам содержательную вводную.";

  return {
    reply: `${data.personaName}: ${nudge}`,
    revealed: false,
  };
}

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
        prompt: `Ты играешь персонажа в Zoom-like созвоне-симуляции для обучения проектных менеджеров. Оставайся в роли, говори естественно и реалистично, как живой человек. Отвечай на русском языке.

ПЕРСОНАЖ: ${data.personaName}, ${data.personaRole}
ХАРАКТЕР: ${data.character}
КОНТЕКСТ ЗВОНКА: ${data.brief}
СКРЫТАЯ ИНФОРМАЦИЯ (НЕ раскрывай по умолчанию): ${data.hiddenInfo}
УСЛОВИЕ РАСКРЫТИЯ: ${data.revealCondition}
СКРЫТАЯ ИНФОРМАЦИЯ УЖЕ РАСКРЫВАЛАСЬ: ${data.revealedAlready ? "да" : "нет"}

ВАЖНО:
- Не веди себя как бот с одним правильным паролем. Подстраивайся под смысл реплики PM, задавай встречные уточнения, спорь или соглашайся по роли.
- Если PM спрашивает близко к условию раскрытия, раскрывай деталь по смыслу, даже если слова не совпали дословно.
- Если PM говорит неидеально, всё равно отвечай содержательно и помогай разговору двигаться дальше.
- Если скрытая информация уже раскрыта, не повторяй её механически; помоги PM сделать вывод и следующий шаг.
- Никогда не отвечай «плохо слышно» или «переформулируй», если сообщение пользователя текстовое и понятно.
- Не начинай каждую реплику одинаково. 1–3 живых предложения, без лекции.

ИСТОРИЯ ЗВОНКА:
${convo || "(звонок только начался)"}

PM только что сказал: "${data.userMessage}"

Ответь как ${data.personaName}. Укажи revealed=true только если в этом ответе ты впервые раскрыл скрытую информацию.`,
      });
      return output;
    } catch (error) {
      console.error("callReply fallback", error);
      return fallbackCallReply(data);
    }
  });
