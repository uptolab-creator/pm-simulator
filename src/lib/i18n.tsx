import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Scenario, ScenarioCategory, ScenarioLevel, ScenarioRole } from "./scenarios";
import { SCENARIOS } from "./scenarios";

export type Lang = "ru" | "en";

const STORAGE_KEY = "pp:lang";

/* ------------------------------------------------------------------ */
/*  UI dictionary                                                      */
/* ------------------------------------------------------------------ */

type Dict = Record<string, string>;

const EN: Dict = {
  // sidebar
  "nav.dashboard": "Dashboard",
  "nav.simulations": "Simulations",
  "nav.progress": "My Progress",
  "nav.reports": "Reports",
  "nav.leaderboard": "Leaderboard",
  "nav.resources": "Resources",
  "sidebar.streak": "Current Streak",
  "sidebar.streakDays": "{n} days",
  "sidebar.userRole": "Student",
  "sidebar.language": "Language",
  // dashboard
  "home.tagline": "AI-driven workplace simulations",
  "home.h1": "Train like you're on the job.",
  "home.sub": "Step into real PM and Project Manager scenarios. Make decisions, react to stakeholders, get evaluated on the skills that matter.",
  "home.cta.start": "Start a Simulation",
  "home.cta.progress": "View My Progress",
  "home.stats.available": "Simulations Available",
  "home.stats.availableHint": "PM • PgM • Roleplay",
  "home.stats.best": "Best Score",
  "home.stats.bestHint": "Good Performance",
  "home.stats.avg": "Avg. Score",
  "home.stats.avgHint": "+6 this week",
  "home.stats.skills": "Skills Tracked",
  "home.stats.skillsHint": "Across each session",
  "home.featured": "Featured Simulations",
  "home.featuredSub": "Hand-picked scenarios to sharpen your decision-making.",
  "home.browseAll": "Browse all",
  // simulations list
  "sim.title": "Choose Simulation",
  "sim.sub": "Select a simulation to start practicing",
  "sim.empty": "No simulations match these filters.",
  "sim.filter.allRoles": "All Roles",
  "sim.filter.allTypes": "All Types",
  "sim.filter.allLevels": "All Levels",
  // scenario card
  "card.back": "Back",
  "card.backToSims": "Back to Simulations",
  // briefing
  "brief.label": "Scenario Briefing",
  "brief.start": "Start Simulation",
  "brief.h.objectives": "Your Objectives",
  "brief.h.evaluated": "You will be evaluated on",
  "brief.h.about": "About the Company",
  "brief.info.duration": "Duration",
  "brief.info.difficulty": "Difficulty",
  "brief.info.steps": "Steps",
  "brief.info.role": "Role",
  "brief.info.employees": "Employees",
  "brief.info.products": "Products",
  "brief.info.market": "Market",
  // running
  "run.simulationSuffix": "Simulation",
  "run.stepOf": "Step {n} of {total}",
  "run.end": "End Simulation",
  "run.scenario": "Scenario",
  "run.companyGoal": "Company Goal",
  "run.keyMetrics": "Key Metrics",
  "run.reaction": "Reaction",
  "run.recentUpdates": "Recent Updates",
  "run.yourDecision": "Your Decision",
  "run.yourDecisionSub": "What will you do next?",
  "run.placeholder": "Or write your own action…",
  "run.submit": "Submit",
  "run.messages": "Messages",
  "run.resources": "Available Data & Resources",
  "run.timeline": "Decision Timeline",
  "run.errorHiccup": "(The simulation engine had a hiccup. Try a different action.)",
  // results
  "res.title": "Simulation Complete",
  "res.sub": "Great job! Here's your performance summary for \"{title}\".",
  "res.backDash": "Back to Dashboard",
  "res.aiCoach": "Review with AI Coach",
  "res.final": "Final Score",
  "res.strengths": "Key Strengths",
  "res.improve": "Areas to Improve",
  "res.aiSummary": "AI Evaluation Summary",
  "res.breakdown": "Skill Breakdown",
  "res.recs": "Recommendations",
  "res.none": "No results yet",
  "res.noneSub": "Complete the simulation to see your performance report.",
  "res.startSim": "Start simulation",
  // progress
  "prog.title": "My Progress",
  "prog.sub": "Track your simulation history and skill growth.",
  "prog.empty": "Your performance history will appear here",
  "prog.emptySub": "Complete a simulation to start tracking skill growth across sessions.",
  // 404
  "nf.scenario": "Scenario not found.",
  // skills
  "skill.productThinking": "Product Thinking",
  "skill.analytics": "Analytics",
  "skill.communication": "Communication",
  "skill.prioritization": "Prioritization",
  "skill.execution": "Execution",
  "skill.riskManagement": "Risk Management",
  // categories
  "cat.Analytics": "Analytics",
  "cat.Strategy": "Strategy",
  "cat.Product Discovery": "Product Discovery",
  "cat.Stakeholder": "Stakeholder",
  "cat.Execution": "Execution",
  "cat.Risk": "Risk",
  // roles
  "role.Product Manager": "Product Manager",
  "role.Project Manager": "Project Manager",
  "role.Stakeholder Roleplay": "Stakeholder Roleplay",
  // levels
  "level.Junior": "Junior",
  "level.Mid-level": "Mid-level",
  "level.Senior": "Senior",
  // office mode
  "view.classic": "Classic",
  "view.office": "Office",
  "office.whiteboard": "Whiteboard",
  "office.scenario": "Scenario",
  "office.goal": "Company Goal",
  "office.metrics": "Key Metrics",
  "office.events": "Latest Events",
  "office.computer": "Computer",
  "office.docs": "Documents",
  "office.phone": "Phone",
  "office.openComputer": "Open laptop",
  "office.openDocs": "Open documents",
  "office.openPhone": "Pick up phone",
  "office.day.Mon": "Mon",
  "office.day.Tue": "Tue",
  "office.day.Wed": "Wed",
  "office.day.Thu": "Thu",
  "office.day.Fri": "Fri",
  "office.week": "Week {n}",
  "office.decisionCenter": "Decision Center",
  "office.inbox": "Inbox",
  "office.msgs": "msgs",
  "office.noMessages": "No messages yet.",
  "run.history": "Action log",
};

const RU: Dict = {
  // sidebar
  "nav.dashboard": "Главная",
  "nav.simulations": "Симуляции",
  "nav.progress": "Мой прогресс",
  "nav.reports": "Отчёты",
  "nav.leaderboard": "Рейтинг",
  "nav.resources": "Материалы",
  "sidebar.streak": "Серия дней",
  "sidebar.streakDays": "{n} дн.",
  "sidebar.userRole": "Студент",
  "sidebar.language": "Язык",
  // dashboard
  "home.tagline": "Рабочие симуляции на основе ИИ",
  "home.h1": "Тренируйся как на настоящей работе.",
  "home.sub": "Погрузись в реальные сценарии Product и Project менеджеров. Принимай решения, реагируй на стейкхолдеров, прокачивай ключевые навыки.",
  "home.cta.start": "Начать симуляцию",
  "home.cta.progress": "Мой прогресс",
  "home.stats.available": "Доступно симуляций",
  "home.stats.availableHint": "PM • PgM • Ролевые",
  "home.stats.best": "Лучший результат",
  "home.stats.bestHint": "Хорошая работа",
  "home.stats.avg": "Средний балл",
  "home.stats.avgHint": "+6 за неделю",
  "home.stats.skills": "Навыков отслеживаем",
  "home.stats.skillsHint": "В каждой сессии",
  "home.featured": "Рекомендуемые симуляции",
  "home.featuredSub": "Отобранные сценарии, чтобы прокачать принятие решений.",
  "home.browseAll": "Все симуляции",
  // simulations list
  "sim.title": "Выбор симуляции",
  "sim.sub": "Выбери симуляцию и начинай практику",
  "sim.empty": "Нет симуляций, подходящих под фильтры.",
  "sim.filter.allRoles": "Все роли",
  "sim.filter.allTypes": "Все типы",
  "sim.filter.allLevels": "Все уровни",
  // scenario card
  "card.back": "Назад",
  "card.backToSims": "К списку симуляций",
  // briefing
  "brief.label": "Брифинг сценария",
  "brief.start": "Начать симуляцию",
  "brief.h.objectives": "Твои цели",
  "brief.h.evaluated": "Будут оцениваться",
  "brief.h.about": "О компании",
  "brief.info.duration": "Длительность",
  "brief.info.difficulty": "Сложность",
  "brief.info.steps": "Шагов",
  "brief.info.role": "Роль",
  "brief.info.employees": "Сотрудников",
  "brief.info.products": "Продукты",
  "brief.info.market": "Рынок",
  // running
  "run.simulationSuffix": "симуляция",
  "run.stepOf": "Шаг {n} из {total}",
  "run.end": "Завершить симуляцию",
  "run.scenario": "Сценарий",
  "run.companyGoal": "Цель компании",
  "run.keyMetrics": "Ключевые метрики",
  "run.reaction": "Реакция",
  "run.recentUpdates": "Последние события",
  "run.yourDecision": "Твоё решение",
  "run.yourDecisionSub": "Что будешь делать дальше?",
  "run.placeholder": "Или впиши своё действие…",
  "run.submit": "Отправить",
  "run.messages": "Сообщения",
  "run.resources": "Доступные данные и ресурсы",
  "run.timeline": "Хронология решений",
  "run.errorHiccup": "(Движок симуляции сбоит. Попробуй другое действие.)",
  // results
  "res.title": "Симуляция завершена",
  "res.sub": "Отличная работа! Вот твой отчёт по «{title}».",
  "res.backDash": "На главную",
  "res.aiCoach": "Разбор с ИИ-коучем",
  "res.final": "Итоговый балл",
  "res.strengths": "Сильные стороны",
  "res.improve": "Что улучшить",
  "res.aiSummary": "Оценка ИИ",
  "res.breakdown": "Разбор по навыкам",
  "res.recs": "Рекомендации",
  "res.none": "Пока нет результатов",
  "res.noneSub": "Заверши симуляцию, чтобы увидеть отчёт.",
  "res.startSim": "Начать симуляцию",
  // progress
  "prog.title": "Мой прогресс",
  "prog.sub": "Отслеживай историю симуляций и рост навыков.",
  "prog.empty": "Здесь будет твоя история результатов",
  "prog.emptySub": "Заверши симуляцию, чтобы отслеживать рост навыков.",
  // 404
  "nf.scenario": "Сценарий не найден.",
  // skills
  "skill.productThinking": "Продуктовое мышление",
  "skill.analytics": "Аналитика",
  "skill.communication": "Коммуникация",
  "skill.prioritization": "Приоритизация",
  "skill.execution": "Исполнение",
  "skill.riskManagement": "Управление рисками",
  // categories
  "cat.Analytics": "Аналитика",
  "cat.Strategy": "Стратегия",
  "cat.Product Discovery": "Discovery",
  "cat.Stakeholder": "Стейкхолдеры",
  "cat.Execution": "Исполнение",
  "cat.Risk": "Риски",
  // roles
  "role.Product Manager": "Product Manager",
  "role.Project Manager": "Project Manager",
  "role.Stakeholder Roleplay": "Ролевая игра",
  // levels
  "level.Junior": "Junior",
  "level.Mid-level": "Middle",
  "level.Senior": "Senior",
  // office mode
  "view.classic": "Классика",
  "view.office": "Офис",
  "office.whiteboard": "Доска",
  "office.scenario": "Сценарий",
  "office.goal": "Цель компании",
  "office.metrics": "Ключевые метрики",
  "office.events": "Последние события",
  "office.computer": "Компьютер",
  "office.docs": "Документы",
  "office.phone": "Телефон",
  "office.openComputer": "Открыть ноутбук",
  "office.openDocs": "Открыть документы",
  "office.openPhone": "Взять телефон",
  "office.day.Mon": "Пн",
  "office.day.Tue": "Вт",
  "office.day.Wed": "Ср",
  "office.day.Thu": "Чт",
  "office.day.Fri": "Пт",
  "office.week": "Неделя {n}",
  "office.decisionCenter": "Центр решений",
  "office.inbox": "Входящие",
  "office.msgs": "сообщ.",
  "office.noMessages": "Сообщений пока нет.",
  "run.history": "Журнал действий",
};

const DICTS: Record<Lang, Dict> = { ru: RU, en: EN };

/* ------------------------------------------------------------------ */
/*  Scenario translations (Russian overlay)                            */
/* ------------------------------------------------------------------ */

type ScenarioOverlay = {
  title?: string;
  scenario?: string;
  briefing?: string;
  companyGoal?: string;
  objectives?: string[];
  evaluatedOn?: string[];
  resources?: string[];
  suggestedActions?: string[];
  company?: Partial<Scenario["company"]>;
  metrics?: { label?: string; value?: string; delta?: string }[];
  updates?: { time?: string; text?: string }[];
  messages?: { from?: string; role?: string; time?: string; text?: string }[];
};

const SCENARIO_RU: Record<string, ScenarioOverlay> = {
  "pm-conversion-drop": {
    title: "Падение конверсии после релиза",
    scenario: "Конверсия упала на 18% после последнего релиза",
    briefing:
      "После релиза версии 2.4.1 конверсия в регистрацию упала на 18%. Руководству нужны ответы и план.",
    companyGoal: "Увеличить MAU и улучшить конверсию.",
    objectives: [
      "Найти корневую причину падения конверсии",
      "Предложить и выполнить нужные действия",
      "Улучшить конверсию и опыт пользователя",
    ],
    evaluatedOn: ["Аналитическое мышление", "Решение проблем", "Приоритизация", "Коммуникация", "Исполнение"],
    company: { about: "FinPay — быстрорастущий финтех-стартап с мобильным платёжным решением.", market: "Цифровые платежи" },
    metrics: [
      { delta: "-18% за 7 дней" },
      { delta: "-8% за 7 дней" },
      { delta: "+2.1% за 7 дней" },
      { delta: "-6 за 7 дней" },
    ],
    updates: [
      { text: "Развёрнут релиз v2.4.1" },
      { text: "Обращения в поддержку выросли на 24%" },
      { text: "Пользователи жалуются на экран регистрации" },
    ],
    messages: [
      { from: "CEO", role: "Руководство", text: "Нам срочно нужна причина падения." },
      { from: "Глава маркетинга", role: "Маркетинг", text: "Платный трафик страдает. Что происходит?" },
      { from: "Лид поддержки", role: "Поддержка", text: "Много жалоб на ошибки регистрации." },
      { from: "Аналитик данных", role: "Данные", text: "Я подготовил для вас дашборды." },
    ],
    resources: ["Дашборд аналитики", "Отзывы пользователей (124)", "Логи ошибок", "Release notes v2.4.1"],
    suggestedActions: ["Разобрать воронку регистрации", "Проверить недавние изменения", "Поговорить с поддержкой", "Запустить опрос"],
  },
  "pm-retention-drop": {
    title: "Падение Retention на 2-й неделе",
    scenario: "W2 retention упал с 38% до 22%",
    briefing: "У новых когорт обвалился retention 2-й недели. За спринт выкатили 3 изменения. Найди причину.",
    companyGoal: "Восстановить W2 retention выше 35% и нарастить вовлечённость.",
    objectives: ["Диагностировать падение", "Решить: откат или фикс", "Сообщить руководству"],
    evaluatedOn: ["Аналитическое мышление", "Приоритизация", "Коммуникация"],
    company: { about: "Соцприложение с 2M MAU и фокусом на инструменты для авторов.", market: "Social" },
    metrics: [
      { label: "W2 Retention", delta: "-16 п.п." },
      { label: "D1 Retention", delta: "-2 п.п." },
      { label: "Сессий / DAU", delta: "-12%" },
      { label: "Crash Rate", delta: "+0.9%" },
    ],
    updates: [
      { text: "A/B нового онбординга стартовал 14 дней назад" },
      { text: "Уменьшена частота пушей" },
      { text: "Обновлена модель ранжирования ленты" },
    ],
    messages: [
      { from: "CPO", role: "Руководство", text: "Retention — метрика борда. Каков план?" },
      { from: "Growth Lead", role: "Growth", text: "Останавливать A/B онбординга?" },
    ],
    resources: ["Результаты A/B", "Когортный анализ", "Метрики пушей"],
    suggestedActions: ["Проверить A/B", "Сегментировать когорты", "Разобрать изменения в пушах", "Поговорить с Growth"],
  },
  "pm-new-feature": {
    title: "Возможность новой фичи",
    scenario: "Оцени возможность для нового AI-ассистента",
    briefing: "Конкурент выпустил AI sales-ассистента. Руководство хочет понять, отвечать ли и как.",
    companyGoal: "Сохранить позиции и нарастить ARR.",
    objectives: ["Оценить возможность", "Рекомендовать build/buy/wait", "Накидать план на 90 дней"],
    evaluatedOn: ["Продуктовое мышление", "Стратегия", "Коммуникация"],
    company: { about: "B2B CRM для SMB-отделов продаж.", market: "SaaS / Sales" },
    metrics: [
      { delta: "+18% YoY" },
      { delta: "-3 п.п. QoQ" },
      { delta: "без изм." },
    ],
    updates: [{ time: "Сегодня", text: "Конкурент выпустил AI Copilot" }],
    messages: [
      { from: "CEO", role: "Руководство", text: "Жду рекомендацию к пятнице." },
      { from: "Глава продаж", role: "Продажи", text: "Клиенты спрашивают про AI-функции." },
    ],
    resources: ["Анализ конкурентов", "Заметки интервью", "Ёмкость инженеров"],
    suggestedActions: ["Интервью с клиентами", "Тирдаун конкурентов", "Оценить стоимость разработки", "Подготовить proposal"],
  },
  "pm-low-engagement": {
    title: "Фича с низкой вовлечённостью",
    scenario: "Ключевая фича: всего 8% adoption через 3 месяца",
    briefing: "Фича «Комментарии» вышла 3 месяца назад. Adoption сильно ниже цели.",
    companyGoal: "Достичь 40% adoption или закрыть фичу.",
    objectives: ["Понять причины низкого adoption", "Решить: инвестировать или закрыть", "Предложить следующие шаги"],
    evaluatedOn: ["Продуктовое мышление", "Аналитика", "Приоритизация"],
    company: { about: "Приложение для продуктивности команд.", market: "Productivity SaaS" },
    metrics: [
      { label: "Adoption фичи", delta: "цель 40%" },
      { label: "Активаций", delta: "без изм." },
      { label: "Тикетов", value: "12/нед", delta: "без изм." },
    ],
    updates: [{ time: "На прошлой неделе", text: "PMM предложил перезапуск" }],
    messages: [
      { from: "Дизайнер", role: "Дизайн", text: "Думаю, проблема в discoverability." },
      { from: "PMM", role: "Маркетинг", text: "Можем перезапустить email-кампанией." },
    ],
    resources: ["Аналитика воронки", "Интервью (8)", "Хитмапы"],
    suggestedActions: ["Провести интервью", "Проверить воронку", "Протестировать новое размещение", "Предложить sunset"],
  },
  "pm-pricing": {
    title: "Ценовая стратегия",
    scenario: "Определи новую модель ценообразования при выходе вверх по рынку",
    briefing: "Текущие цены заданы 2 года назад. Энтерпрайз-сделки буксуют из-за прайсинга.",
    companyGoal: "Нарастить ACV без вреда для SMB.",
    objectives: ["Проанализировать текущий прайсинг", "Предложить новую модель", "Спланировать миграцию"],
    evaluatedOn: ["Продуктовое мышление", "Стратегия", "Коммуникация"],
    company: { about: "Devtools-стартап для разработчиков.", market: "DevTools" },
    metrics: [
      { delta: "без изм." },
      { delta: "растёт" },
      { delta: "растёт" },
      { delta: "без изм." },
    ],
    updates: [{ time: "На этой неделе", text: "3 энтерпрайз-сделки застряли из-за цены" }],
    messages: [
      { from: "VP Sales", role: "Продажи", text: "Нужны usage-based тарифы." },
      { from: "CFO", role: "Финансы", text: "Защити маржу." },
    ],
    resources: ["Цены конкурентов", "Win/Loss анализ", "Телеметрия использования"],
    suggestedActions: ["Бенчмарк конкурентов", "Поговорить с продажами", "Смоделировать сценарии", "Подготовить proposal"],
  },
  "proj-dev-delay": {
    title: "Кризис: задержка разработчика",
    scenario: "Ведущий разработчик объявил о задержке в 2 недели за 3 дня до запуска",
    briefing: "Критичная интеграция задерживается. Запуск у клиента под угрозой.",
    companyGoal: "Уложиться в обещанные сроки с минимальной обрезкой скоупа.",
    objectives: ["Оценить влияние", "Согласовать скоуп/сроки", "Сообщить клиенту"],
    evaluatedOn: ["Исполнение", "Управление рисками", "Коммуникация"],
    company: { about: "Healthtech-компания, делает интеграции с EHR.", market: "Healthcare IT" },
    metrics: [
      { label: "Отклонение графика", value: "-9 дней" },
      { label: "Моральный дух", delta: "падает" },
      { label: "Бюджет израсходован", delta: "без изм." },
      { label: "Открытых рисков" },
    ],
    updates: [
      { time: "Пн", text: "Лид флагнул задержку в 2 недели" },
      { time: "Вт", text: "Клиент запросил статус" },
    ],
    messages: [
      { from: "Ведущий инженер", role: "Инженерия", text: "Сложности с маппингом HL7." },
      { from: "PM клиента", role: "Клиент", text: "Мы всё ещё успеваем к пятнице?" },
    ],
    resources: ["План проекта", "Реестр рисков", "Burndown"],
    suggestedActions: ["Пересобрать план", "Договориться о скоупе", "Эскалировать", "Связаться с клиентом"],
  },
  "proj-bug-crisis": {
    title: "Кризис: продакшен-баг",
    scenario: "P0 баг в проде затрагивает 12% транзакций",
    briefing: "Sev-1 инцидент в проде. Координируй реакцию.",
    companyGoal: "Восстановить сервис и сохранить доверие.",
    objectives: ["Координировать инцидент", "Сообщить стейкхолдерам", "Спланировать пост-мортем"],
    evaluatedOn: ["Исполнение", "Коммуникация", "Управление рисками"],
    company: { about: "Платёжный стартап.", market: "Платежи" },
    metrics: [
      { label: "Неуспешных тр-ций" },
      { label: "MTTR (цель)", value: "60 мин" },
      { label: "Активных пользователей" },
      { label: "Status Page", value: "Расследуем" },
    ],
    updates: [{ time: "Сейчас", text: "Алерт сработал 18 минут назад" }],
    messages: [
      { from: "Дежурный SRE", role: "Инженерия", text: "Похоже на новый auth-сервис." },
      { from: "CEO", role: "Руководство", text: "Обновляй меня каждые 15 мин." },
    ],
    resources: ["Раннбук инцидентов", "Status Page", "Логи"],
    suggestedActions: ["Открыть канал инцидента", "Назначить IC", "Уведомить клиентов", "Откатить"],
  },
  "proj-scope-creep": {
    title: "Изменение скоупа от клиента",
    scenario: "Клиент хочет добавить 4 фичи в середине спринта",
    briefing: "Крупный клиент хочет расширить скоуп без сдвига дедлайна.",
    companyGoal: "Защитить маржу и сроки, сохранив клиента довольным.",
    objectives: ["Оценить влияние", "Согласовать change order", "Перепланировать спринт"],
    evaluatedOn: ["Коммуникация", "Приоритизация", "Исполнение"],
    company: { about: "Агентство, делает энтерпрайз-приложения.", market: "Агентство" },
    metrics: [
      { label: "Ёмкость спринта" },
      { label: "Маржа" },
      { label: "NPS клиента" },
      { label: "Открытых тикетов" },
    ],
    updates: [{ time: "Сегодня", text: "Клиент прислал обновлённый ТЗ" }],
    messages: [
      { from: "Спонсор от клиента", role: "Клиент", text: "Нам очень нужно это в Q2." },
      { from: "Тимлид", role: "Инженерия", text: "У нас нет ёмкости." },
    ],
    resources: ["MSA / SoW", "Доска спринта", "Burndown"],
    suggestedActions: ["Оформить change order", "Перепр-ть бэклог", "Встретиться с клиентом", "Эскалировать в PMO"],
  },
  "proj-budget": {
    title: "Бюджетные ограничения",
    scenario: "Срез бюджета на 20% в середине программы",
    briefing: "CFO мандатировал срез бюджета на 20% по всем программам. Ты ведёшь многокомандную трансформацию.",
    companyGoal: "Доставить стратегические результаты в рамках нового бюджета.",
    objectives: ["Перепр-ть портфель", "Сократить скоуп или сроки", "Сообщить о последствиях"],
    evaluatedOn: ["Приоритизация", "Управление рисками", "Коммуникация"],
    company: { about: "Внутренний IT для Fortune 500 ритейлера.", market: "Энтерпрайз" },
    metrics: [
      { label: "Срез бюджета" },
      { label: "Программ" },
      { label: "Людей (FTE)" },
      { label: "Майлстоунов под риском" },
    ],
    updates: [{ time: "Вчера", text: "Письмо CFO о срезах" }],
    messages: [
      { from: "CFO", role: "Финансы", text: "Жду обновлённый план к пятнице." },
      { from: "Спонсор", role: "Руководство", text: "Защити пользовательскую работу." },
    ],
    resources: ["Дорожная карта портфеля", "Прогноз бюджета", "RACI"],
    suggestedActions: ["Прооценить инициативы", "Сократить/отложить", "Встреча со спонсорами", "Обновить план"],
  },
  "proj-launch-planning": {
    title: "Планирование запуска",
    scenario: "Спланируй GTM-запуск нового устройства",
    briefing: "GA запуск через 6 недель. Нужен кросс-функциональный план.",
    companyGoal: "Запустить качественно и с координированным GTM.",
    objectives: ["Построить план", "Поднять риски", "Скоординировать команды"],
    evaluatedOn: ["Исполнение", "Приоритизация", "Управление рисками"],
    company: { about: "Стартап в умной энергетике.", market: "Энергетика" },
    metrics: [
      { label: "Недель до GA" },
      { label: "Открытых рисков" },
      { label: "Команд вовлечено" },
      { label: "Готовность" },
    ],
    updates: [{ time: "Сегодня", text: "Назначен kickoff" }],
    messages: [
      { from: "Лид Hardware", role: "Инженерия", text: "FCC сертификация ещё в процессе." },
      { from: "Маркетинг", role: "Маркетинг", text: "Финальный месседж нужен к 3-й неделе." },
    ],
    resources: ["Launch checklist", "Реестр рисков", "Таймлайн"],
    suggestedActions: ["Собрать RACI", "Назначить ревью", "Снизить риск FCC", "Согласовать месседж"],
  },
  "roleplay-ceo": {
    title: "Защити свой роадмап перед CEO",
    scenario: "CEO ставит под сомнение твой Q3-роадмап на 1:1",
    briefing: "Твой CEO хочет пободаться по приоритетам. Защити их или обнови.",
    companyGoal: "Согласовать роадмап, который растит выручку и удерживает пользователей.",
    objectives: ["Защитить трейдоффы", "Послушать", "Прийти к согласию"],
    evaluatedOn: ["Коммуникация", "Продуктовое мышление", "Стратегия"],
    company: { about: "AI-платформа для продуктивности.", market: "Продуктивность" },
    metrics: [
      { label: "Пунктов роадмапа" },
      { label: "Цель по выручке" },
      { label: "Ёмкость инженерии", value: "70 sp" },
      { label: "Уверенность", value: "Средняя" },
    ],
    updates: [{ time: "Сейчас", text: "1:1 с CEO через 5 минут" }],
    messages: [
      { from: "CEO", role: "Руководство", text: "Почему мы не приоритизируем энтерпрайз-тариф?" },
    ],
    resources: ["Q3 роадмап", "Прогноз выручки", "Интервью с клиентами"],
    suggestedActions: ["Открыться фреймингом", "Поделиться данными", "Задать уточняющий вопрос", "Предложить корректировку"],
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function format(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export function translateScenario(s: Scenario, lang: Lang): Scenario {
  if (lang === "en") return s;
  const o = SCENARIO_RU[s.id];
  if (!o) return s;
  return {
    ...s,
    title: o.title ?? s.title,
    scenario: o.scenario ?? s.scenario,
    briefing: o.briefing ?? s.briefing,
    companyGoal: o.companyGoal ?? s.companyGoal,
    objectives: o.objectives ?? s.objectives,
    evaluatedOn: o.evaluatedOn ?? s.evaluatedOn,
    resources: o.resources ?? s.resources,
    suggestedActions: o.suggestedActions ?? s.suggestedActions,
    company: { ...s.company, ...(o.company ?? {}) },
    metrics: s.metrics.map((m, i) => ({
      ...m,
      label: o.metrics?.[i]?.label ?? m.label,
      value: o.metrics?.[i]?.value ?? m.value,
      delta: o.metrics?.[i]?.delta ?? m.delta,
    })),
    updates: s.updates.map((u, i) => ({
      time: o.updates?.[i]?.time ?? u.time,
      text: o.updates?.[i]?.text ?? u.text,
    })),
    messages: s.messages.map((m, i) => ({
      from: o.messages?.[i]?.from ?? m.from,
      role: o.messages?.[i]?.role ?? m.role,
      time: o.messages?.[i]?.time ?? m.time,
      text: o.messages?.[i]?.text ?? m.text,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tCategory: (c: ScenarioCategory) => string;
  tRole: (r: ScenarioRole) => string;
  tLevel: (l: ScenarioLevel) => string;
  scenarios: Scenario[];
  getScenario: (id: string) => Scenario | undefined;
}

const Ctx = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "ru" || stored === "en") setLangState(stored);
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const value = useMemo<LangCtx>(() => {
    const dict = DICTS[lang];
    const t = (key: string, vars?: Record<string, string | number>) =>
      format(dict[key] ?? EN[key] ?? key, vars);
    const scenarios = SCENARIOS.map((s) => translateScenario(s, lang));
    return {
      lang,
      setLang,
      t,
      tCategory: (c) => t(`cat.${c}`),
      tRole: (r) => t(`role.${r}`),
      tLevel: (l) => t(`level.${l}`),
      scenarios,
      getScenario: (id) => scenarios.find((s) => s.id === id),
    };
  }, [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}