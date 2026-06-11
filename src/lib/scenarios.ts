export type SkillKey =
  | "productThinking"
  | "analytics"
  | "communication"
  | "prioritization"
  | "execution"
  | "riskManagement";

export const SKILL_LABELS: Record<SkillKey, string> = {
  productThinking: "Product Thinking",
  analytics: "Analytics",
  communication: "Communication",
  prioritization: "Prioritization",
  execution: "Execution",
  riskManagement: "Risk Management",
};

export type ScenarioCategory =
  | "Analytics"
  | "Strategy"
  | "Product Discovery"
  | "Stakeholder"
  | "Execution"
  | "Risk";

export type ScenarioRole = "Product Manager" | "Project Manager" | "Stakeholder Roleplay";
export type ScenarioLevel = "Junior" | "Mid-level" | "Senior";

/* ---------------- Industry / Theme engine ---------------- */
export type IndustryType =
  | "telecom"
  | "banking"
  | "construction"
  | "manufacturing"
  | "retail"
  | "it_startup";

export interface IndustryTheme {
  id: IndustryType;
  name: string;
  primaryColor: string;
  accentColor: string;
  officeBgStyle: string;
  documentTemplates: string[];
  avatarStyle: string;
}

export const INDUSTRY_THEMES: Record<IndustryType, IndustryTheme> = {
  telecom: { id: "telecom", name: "Telecom", primaryColor: "#6E27C5", accentColor: "#FF6A00", officeBgStyle: "telecom-monitors", documentTemplates: ["network-report", "churn-analytics", "tariff-plan"], avatarStyle: "telecom" },
  banking: { id: "banking", name: "Banking", primaryColor: "#0E4DA4", accentColor: "#22C55E", officeBgStyle: "banking-glass", documentTemplates: ["financial-report", "compliance-doc", "risk-register"], avatarStyle: "banking" },
  construction: { id: "construction", name: "Construction", primaryColor: "#B45309", accentColor: "#F59E0B", officeBgStyle: "construction-blueprints", documentTemplates: ["blueprint", "site-log", "safety-checklist"], avatarStyle: "construction" },
  manufacturing: { id: "manufacturing", name: "Manufacturing", primaryColor: "#374151", accentColor: "#EF4444", officeBgStyle: "factory-floor", documentTemplates: ["production-log", "qa-report", "supply-chain"], avatarStyle: "manufacturing" },
  retail: { id: "retail", name: "Retail", primaryColor: "#DB2777", accentColor: "#F472B6", officeBgStyle: "retail-store", documentTemplates: ["sales-report", "inventory", "promo-brief"], avatarStyle: "retail" },
  it_startup: { id: "it_startup", name: "IT Startup", primaryColor: "#7C3AED", accentColor: "#06B6D4", officeBgStyle: "startup-loft", documentTemplates: ["product-spec", "okrs", "metrics-dashboard"], avatarStyle: "startup" },
};

export interface FinalExamStatus {
  id: string;
  industry: IndustryType;
  durationMinutes: number;
  status: "not_started" | "in_progress" | "completed";
  score?: number;
  aiFeedback?: string;
  certificateUrl?: string;
}

export interface ScenarioMetric {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
}

export interface ScenarioMessage {
  from: string;
  role: string;
  time: string;
  text: string;
}

export interface Scenario {
  id: string;
  title: string;
  role: ScenarioRole;
  category: ScenarioCategory;
  level: ScenarioLevel;
  durationMin: string;
  totalSteps: number;
  company: {
    name: string;
    about: string;
    employees: string;
    products: string;
    market: string;
  };
  scenario: string;
  briefing: string;
  companyGoal: string;
  objectives: string[];
  evaluatedOn: string[];
  metrics: ScenarioMetric[];
  updates: { time: string; text: string }[];
  messages: ScenarioMessage[];
  resources: string[];
  suggestedActions: string[];
  /** Final exam (60min, time-bound, free-form only). */
  isExam?: boolean;
  /** Exam duration in minutes (default 60). */
  examDurationMin?: number;
  /** Industry theme key for visual theming. */
  industry?: IndustryType;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "pm-conversion-drop",
    title: "Conversion Drop After Release",
    role: "Product Manager",
    category: "Analytics",
    level: "Mid-level",
    durationMin: "30-40 min",
    totalSteps: 10,
    company: {
      name: "FinPay",
      about: "FinPay is a fast-growing fintech startup that offers a mobile payment solution.",
      employees: "120+",
      products: "FinPay App",
      market: "Digital Payments",
    },
    scenario: "Conversion dropped by 18% after last release",
    briefing:
      "After releasing version 2.4.1, the sign-up conversion rate dropped by 18%. Leadership needs answers and a plan.",
    companyGoal: "Increase monthly active users and improve conversion rate.",
    objectives: [
      "Identify the root cause of the conversion drop",
      "Propose and execute the right actions",
      "Improve conversion rate and user experience",
    ],
    evaluatedOn: ["Analytical Thinking", "Problem Solving", "Prioritization", "Communication", "Execution"],
    metrics: [
      { label: "Sign-up Conversion", value: "2.1%", delta: "-18% vs last 7 days", trend: "down" },
      { label: "Active Users", value: "128,540", delta: "-8% vs last 7 days", trend: "down" },
      { label: "Churn Rate", value: "7.3%", delta: "+2.1% vs last 7 days", trend: "down" },
      { label: "NPS Score", value: "32", delta: "-6 vs last 7 days", trend: "down" },
    ],
    updates: [
      { time: "10:15 AM", text: "Release v2.4.1 was deployed" },
      { time: "10:20 AM", text: "Support tickets increased by 24%" },
      { time: "10:35 AM", text: "Users reporting issues on sign-up screen" },
    ],
    messages: [
      { from: "CEO", role: "Executive", time: "10:20 AM", text: "We need to understand the root cause quickly." },
      { from: "Head of Marketing", role: "Marketing", time: "10:18 AM", text: "Paid campaigns are affected. What's happening?" },
      { from: "Support Lead", role: "Support", time: "10:15 AM", text: "Getting a lot of complaints about sign up errors." },
      { from: "Data Analyst", role: "Data", time: "10:10 AM", text: "I've prepared some data dashboards for you." },
    ],
    resources: ["Analytics Dashboard", "User Feedback (124)", "Error Logs", "Release Notes v2.4.1"],
    suggestedActions: [
      "Analyze Signup Funnel",
      "Check Recent Changes",
      "Talk to Support Team",
      "Run User Survey",
    ],
  },
  {
    id: "pm-retention-drop",
    title: "Retention Drop in Week 2",
    role: "Product Manager",
    category: "Analytics",
    level: "Mid-level",
    durationMin: "30-40 min",
    totalSteps: 10,
    company: {
      name: "Sparkle",
      about: "A consumer social app with 2M MAU and a focus on creator tools.",
      employees: "60",
      products: "Sparkle iOS / Android",
      market: "Social",
    },
    scenario: "Week-2 retention dropped from 38% to 22%",
    briefing:
      "Week-2 retention has collapsed for new cohorts. The team shipped 3 changes in the past sprint. Find what's wrong.",
    companyGoal: "Restore week-2 retention to >35% and grow engagement.",
    objectives: ["Diagnose the drop", "Decide rollback vs fix-forward", "Communicate to leadership"],
    evaluatedOn: ["Analytical Thinking", "Prioritization", "Communication"],
    metrics: [
      { label: "W2 Retention", value: "22%", delta: "-16 pts", trend: "down" },
      { label: "D1 Retention", value: "54%", delta: "-2 pts", trend: "down" },
      { label: "Sessions / DAU", value: "3.1", delta: "-12%", trend: "down" },
      { label: "Crash Rate", value: "1.8%", delta: "+0.9%", trend: "down" },
    ],
    updates: [
      { time: "09:00", text: "New onboarding flow A/B started 14 days ago" },
      { time: "09:30", text: "Push notification frequency reduced" },
      { time: "10:00", text: "Feed ranking model updated" },
    ],
    messages: [
      { from: "CPO", role: "Executive", time: "09:05", text: "Retention is a board metric. What's the plan?" },
      { from: "Growth Lead", role: "Growth", time: "09:20", text: "Should we kill the onboarding test?" },
    ],
    resources: ["A/B Test Results", "Cohort Analysis", "Push Metrics"],
    suggestedActions: ["Check A/B test", "Segment by cohort", "Review push changes", "Talk to Growth"],
  },
  {
    id: "pm-new-feature",
    title: "New Feature Opportunity",
    role: "Product Manager",
    category: "Strategy",
    level: "Mid-level",
    durationMin: "35-45 min",
    totalSteps: 10,
    company: {
      name: "LoopCRM",
      about: "B2B CRM for SMB sales teams.",
      employees: "200",
      products: "LoopCRM Cloud",
      market: "SaaS / Sales",
    },
    scenario: "Evaluate a new AI assistant feature opportunity",
    briefing:
      "A competitor launched an AI sales assistant. Leadership wants to know if and how to respond.",
    companyGoal: "Maintain competitive position and grow ARR.",
    objectives: ["Assess the opportunity", "Recommend build/buy/wait", "Outline a 90-day plan"],
    evaluatedOn: ["Product Thinking", "Strategy", "Communication"],
    metrics: [
      { label: "ARR", value: "$24M", delta: "+18% YoY", trend: "up" },
      { label: "Win Rate", value: "27%", delta: "-3 pts QoQ", trend: "down" },
      { label: "Churn", value: "1.2%", delta: "flat", trend: "flat" },
      { label: "NPS", value: "42", trend: "flat" },
    ],
    updates: [{ time: "Today", text: "Competitor launched AI Copilot feature" }],
    messages: [
      { from: "CEO", role: "Executive", time: "08:30", text: "I want a recommendation by Friday." },
      { from: "Head of Sales", role: "Sales", time: "09:00", text: "Customers are asking about AI features." },
    ],
    resources: ["Competitor Analysis", "Customer Interview Notes", "Engineering Capacity"],
    suggestedActions: ["Interview customers", "Competitive teardown", "Estimate engineering cost", "Draft proposal"],
  },
  {
    id: "pm-low-engagement",
    title: "Low Engagement Feature",
    role: "Product Manager",
    category: "Product Discovery",
    level: "Mid-level",
    durationMin: "25-35 min",
    totalSteps: 8,
    company: {
      name: "Notebox",
      about: "Productivity app for teams.",
      employees: "45",
      products: "Notebox Web/Desktop",
      market: "Productivity SaaS",
    },
    scenario: "A core feature has only 8% adoption 3 months after launch",
    briefing: "Comments feature shipped 3 months ago. Adoption is far below target.",
    companyGoal: "Reach 40% feature adoption or sunset.",
    objectives: ["Discover why adoption is low", "Decide invest vs kill", "Propose next steps"],
    evaluatedOn: ["Product Thinking", "Analytics", "Prioritization"],
    metrics: [
      { label: "Feature Adoption", value: "8%", delta: "target 40%", trend: "down" },
      { label: "DAU", value: "45k", trend: "flat" },
      { label: "Activation", value: "61%", trend: "flat" },
      { label: "Tickets", value: "12/wk", trend: "flat" },
    ],
    updates: [{ time: "Last week", text: "PMM proposed re-launch campaign" }],
    messages: [
      { from: "Designer", role: "Design", time: "10:00", text: "I think discoverability is the issue." },
      { from: "PMM", role: "Marketing", time: "10:30", text: "We could relaunch with email." },
    ],
    resources: ["Funnel Analytics", "User Interviews (8)", "Heatmaps"],
    suggestedActions: ["Run user interviews", "Check funnel", "Test new placement", "Propose sunset"],
  },
  {
    id: "pm-pricing",
    title: "Pricing Strategy",
    role: "Product Manager",
    category: "Strategy",
    level: "Senior",
    durationMin: "40-50 min",
    totalSteps: 10,
    company: {
      name: "Stackly",
      about: "Developer infra startup.",
      employees: "80",
      products: "Stackly Cloud",
      market: "DevTools",
    },
    scenario: "Define a new pricing model as you move upmarket",
    briefing: "Current pricing was set 2 years ago. Enterprise deals are stuck on pricing.",
    companyGoal: "Grow ACV without harming SMB growth.",
    objectives: ["Analyze current pricing", "Propose a new model", "Plan migration"],
    evaluatedOn: ["Product Thinking", "Strategy", "Communication"],
    metrics: [
      { label: "ACV", value: "$8.4k", trend: "flat" },
      { label: "Enterprise Pipeline", value: "$3.2M", trend: "up" },
      { label: "SMB MRR", value: "$420k", trend: "up" },
      { label: "Gross Margin", value: "72%", trend: "flat" },
    ],
    updates: [{ time: "This week", text: "3 enterprise deals stalled on pricing" }],
    messages: [
      { from: "VP Sales", role: "Sales", time: "09:00", text: "We need usage-based tiers." },
      { from: "CFO", role: "Finance", time: "09:10", text: "Protect gross margins." },
    ],
    resources: ["Competitor Pricing", "Win/Loss Analysis", "Usage Telemetry"],
    suggestedActions: ["Benchmark competitors", "Talk to sales", "Model scenarios", "Draft pricing proposal"],
  },
  {
    id: "proj-dev-delay",
    title: "Developer Delay Crisis",
    role: "Project Manager",
    category: "Execution",
    level: "Mid-level",
    durationMin: "30-40 min",
    totalSteps: 10,
    company: {
      name: "Atlas Health",
      about: "Healthtech building EHR integrations.",
      employees: "150",
      products: "Atlas Sync",
      market: "Healthcare IT",
    },
    scenario: "Lead developer announces 2-week delay 3 days before launch",
    briefing: "Critical integration is delayed. Client launch is on the line.",
    companyGoal: "Hit committed launch date with minimal scope cut.",
    objectives: ["Assess impact", "Negotiate scope/timeline", "Communicate to client"],
    evaluatedOn: ["Execution", "Risk Management", "Communication"],
    metrics: [
      { label: "Schedule Variance", value: "-9 days", trend: "down" },
      { label: "Team Morale", value: "62%", trend: "down" },
      { label: "Budget Burn", value: "84%", trend: "flat" },
      { label: "Open Risks", value: "7", trend: "down" },
    ],
    updates: [
      { time: "Mon", text: "Lead dev flagged 2-week delay" },
      { time: "Tue", text: "Client asked for status update" },
    ],
    messages: [
      { from: "Lead Engineer", role: "Engineering", time: "09:00", text: "We hit unexpected complexity in HL7 mapping." },
      { from: "Client PM", role: "Client", time: "10:00", text: "Are we still on track for Friday?" },
    ],
    resources: ["Project Plan", "Risk Register", "Burndown Chart"],
    suggestedActions: ["Re-baseline plan", "Negotiate scope", "Escalate", "Reach out to client"],
  },
  {
    id: "proj-bug-crisis",
    title: "Production Bug Crisis",
    role: "Project Manager",
    category: "Risk",
    level: "Mid-level",
    durationMin: "25-35 min",
    totalSteps: 8,
    company: {
      name: "PayLite",
      about: "Payments startup.",
      employees: "70",
      products: "PayLite Checkout",
      market: "Payments",
    },
    scenario: "P0 bug in production affecting 12% of transactions",
    briefing: "Sev-1 incident in production. Coordinate the response.",
    companyGoal: "Restore service and protect trust.",
    objectives: ["Coordinate incident response", "Communicate to stakeholders", "Plan post-mortem"],
    evaluatedOn: ["Execution", "Communication", "Risk Management"],
    metrics: [
      { label: "Failed Txns", value: "12%", trend: "down" },
      { label: "MTTR (target)", value: "60 min", trend: "flat" },
      { label: "Active Users", value: "98k", trend: "flat" },
      { label: "Status Page", value: "Investigating", trend: "flat" },
    ],
    updates: [{ time: "Now", text: "Alert fired 18 minutes ago" }],
    messages: [
      { from: "On-call SRE", role: "Engineering", time: "Now", text: "We think it's the new auth service." },
      { from: "CEO", role: "Executive", time: "Now", text: "Keep me updated every 15 min." },
    ],
    resources: ["Incident Runbook", "Status Page", "Logs"],
    suggestedActions: ["Open incident channel", "Assign IC", "Notify customers", "Rollback"],
  },
  {
    id: "proj-scope-creep",
    title: "Client Scope Change",
    role: "Project Manager",
    category: "Execution",
    level: "Mid-level",
    durationMin: "30 min",
    totalSteps: 8,
    company: {
      name: "Bluefin Studio",
      about: "Agency building enterprise apps.",
      employees: "40",
      products: "Custom client work",
      market: "Agency",
    },
    scenario: "Client wants 4 new features mid-sprint",
    briefing: "Major client wants to add scope without changing the deadline.",
    companyGoal: "Protect margin and timeline while keeping the client happy.",
    objectives: ["Assess impact", "Negotiate change order", "Re-plan sprint"],
    evaluatedOn: ["Communication", "Prioritization", "Execution"],
    metrics: [
      { label: "Sprint Capacity", value: "78%", trend: "flat" },
      { label: "Margin", value: "22%", trend: "down" },
      { label: "Client NPS", value: "8", trend: "up" },
      { label: "Open Tickets", value: "31", trend: "flat" },
    ],
    updates: [{ time: "Today", text: "Client sent revised requirements doc" }],
    messages: [
      { from: "Client Sponsor", role: "Client", time: "08:30", text: "We really need these in Q2." },
      { from: "Tech Lead", role: "Engineering", time: "09:00", text: "We don't have capacity." },
    ],
    resources: ["MSA / SoW", "Sprint Board", "Burndown"],
    suggestedActions: ["Draft change order", "Re-prioritize backlog", "Meet client", "Escalate to PMO"],
  },
  {
    id: "proj-budget",
    title: "Budget Constraint",
    role: "Project Manager",
    category: "Risk",
    level: "Senior",
    durationMin: "30-40 min",
    totalSteps: 8,
    company: {
      name: "Northwind",
      about: "Internal IT for a Fortune 500 retailer.",
      employees: "5000+",
      products: "Internal apps",
      market: "Enterprise",
    },
    scenario: "20% budget cut mid-program",
    briefing: "CFO mandated a 20% budget cut across all programs. You run a multi-team transformation.",
    companyGoal: "Deliver the strategic outcomes within the new budget.",
    objectives: ["Re-prioritize portfolio", "Cut scope or schedule", "Communicate impact"],
    evaluatedOn: ["Prioritization", "Risk Management", "Communication"],
    metrics: [
      { label: "Budget Cut", value: "-20%", trend: "down" },
      { label: "Programs", value: "4", trend: "flat" },
      { label: "FTEs", value: "62", trend: "flat" },
      { label: "Milestones at Risk", value: "5", trend: "down" },
    ],
    updates: [{ time: "Yesterday", text: "CFO email mandating cuts" }],
    messages: [
      { from: "CFO", role: "Finance", time: "Yesterday", text: "Submit revised plan by Friday." },
      { from: "Sponsor", role: "Executive", time: "Today", text: "Protect customer-facing work." },
    ],
    resources: ["Portfolio Roadmap", "Budget Forecast", "RACI"],
    suggestedActions: ["Score initiatives", "Cut/defer", "Meet sponsors", "Update plan"],
  },
  {
    id: "proj-launch-planning",
    title: "Launch Planning",
    role: "Project Manager",
    category: "Execution",
    level: "Mid-level",
    durationMin: "30-40 min",
    totalSteps: 8,
    company: {
      name: "Voltly",
      about: "Smart energy startup.",
      employees: "90",
      products: "Voltly Home",
      market: "Energy",
    },
    scenario: "Plan the go-to-market launch for a new device",
    briefing: "GA launch in 6 weeks. Cross-functional plan needed.",
    companyGoal: "Hit launch with quality and coordinated GTM.",
    objectives: ["Build the plan", "Surface risks", "Coordinate teams"],
    evaluatedOn: ["Execution", "Prioritization", "Risk Management"],
    metrics: [
      { label: "Weeks to GA", value: "6", trend: "flat" },
      { label: "Open Risks", value: "9", trend: "flat" },
      { label: "Teams Involved", value: "7", trend: "flat" },
      { label: "Readiness", value: "62%", trend: "up" },
    ],
    updates: [{ time: "Today", text: "Kickoff scheduled" }],
    messages: [
      { from: "Hardware Lead", role: "Engineering", time: "08:00", text: "FCC cert is still pending." },
      { from: "Marketing", role: "Marketing", time: "09:00", text: "Need final messaging by week 3." },
    ],
    resources: ["Launch Checklist", "Risk Register", "Timeline"],
    suggestedActions: ["Build RACI", "Schedule reviews", "Mitigate FCC risk", "Align messaging"],
  },
  {
    id: "roleplay-ceo",
    title: "Defend Your Roadmap to the CEO",
    role: "Stakeholder Roleplay",
    category: "Stakeholder",
    level: "Senior",
    durationMin: "20-30 min",
    totalSteps: 8,
    company: {
      name: "Helio",
      about: "AI productivity platform.",
      employees: "180",
      products: "Helio Workspace",
      market: "Productivity",
    },
    scenario: "CEO is questioning your Q3 roadmap in a 1:1",
    briefing: "Your CEO wants to challenge your priorities. Defend or update them.",
    companyGoal: "Align on a roadmap that grows revenue and retains users.",
    objectives: ["Defend tradeoffs", "Listen", "Reach alignment"],
    evaluatedOn: ["Communication", "Product Thinking", "Strategy"],
    metrics: [
      { label: "Roadmap Items", value: "12", trend: "flat" },
      { label: "Revenue Goal", value: "$8M", trend: "up" },
      { label: "Eng Capacity", value: "70 pts", trend: "flat" },
      { label: "Confidence", value: "Medium", trend: "flat" },
    ],
    updates: [{ time: "Now", text: "CEO 1:1 in 5 minutes" }],
    messages: [
      { from: "CEO", role: "Executive", time: "Now", text: "Why are we not prioritizing the enterprise tier?" },
    ],
    resources: ["Q3 Roadmap", "Revenue Forecast", "Customer Interviews"],
    suggestedActions: ["Open with framing", "Share data", "Ask clarifying question", "Propose adjustment"],
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
