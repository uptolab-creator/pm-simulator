// Course simulator domain model — теория + 5 типов заданий + звонок.

export type TaskType = "quiz" | "calculation" | "case_choice" | "written" | "call";

export interface QuizQuestion {
  question: string;
  options: string[];
  /** index into options that is correct */
  correctIndex: number;
}

export interface QuizTask {
  type: "quiz";
  questions: QuizQuestion[];
  /** hint shown after 1st wrong attempt (does not name the answer) */
  hint1: string;
  /** hint shown after 2nd wrong attempt (almost direct) */
  hint2: string;
}

export interface CalcTask {
  type: "calculation";
  prompt: string;
  /** input/given data shown to the student */
  given?: string;
  /** canonical human answer (shown in explanation) */
  answer: string;
  /** numeric expected value for auto-grading, if applicable */
  numericAnswer?: number;
  /** acceptable absolute tolerance around numericAnswer */
  tolerance?: number;
  /** keyword(s) that must appear (case-insensitive) for non-numeric answers */
  keywords?: string[];
  hint1: string;
  hint2: string;
  explanation: string;
}

export interface CaseItem {
  text: string;
  /** correct category (must be one of CaseTask.categories) */
  correct: string;
}

export interface CaseTask {
  type: "case_choice";
  prompt: string;
  categories: string[];
  items: CaseItem[];
  hint1: string;
  hint2: string;
  explanation: string;
}

export interface WrittenTask {
  type: "written";
  prompt: string;
  /** checklist criteria the AI grades against */
  criteria: string[];
  /** exemplar shown after final failed revision */
  referenceAnswer: string;
}

export interface CallTask {
  type: "call";
  brief: string;
  personaName: string;
  personaRole: string;
  character: string;
  hiddenInfo: string;
  revealCondition: string;
  openQuestion: string;
  criteria: string[];
}

export type Task = QuizTask | CalcTask | CaseTask | WrittenTask | CallTask;

export interface Lesson {
  id: string;
  number: number;
  title: string;
  theory: string;
  keyTerms: string[];
  tasks: Task[];
}

export const STEP_LABELS_RU: Record<TaskType | "theory" | "summary", string> = {
  theory: "Теория",
  quiz: "Квиз",
  calculation: "Расчёт",
  case_choice: "Кейс",
  written: "Письменное",
  call: "Звонок",
  summary: "Итог",
};
