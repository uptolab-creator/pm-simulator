// ============================================================================
// Mission Engine — data model for non-linear PM office simulator scenarios.
//
// A Mission is a tree of decision Steps. Each Step is "owned" by one of the
// four interactive desk objects (Dashboard / Folder / Phone / Laptop-Zoom).
// The player must make a choice in the currently-active object to advance.
// Every choice mutates four hidden scales + the headline product metric.
// If any critical scale hits 0 → instant Game Over.
// ============================================================================

/** The four interactive objects on the PM desk. */
export type DeskObjectId = "dashboard" | "folder" | "phone" | "laptop";

/** Management tone used when answering AI avatars in a Zoom meeting. */
export type Tone = "directive" | "supportive" | "delegating";

/** Hidden state deltas applied by a choice. All optional, range roughly -40..+40. */
export interface Effects {
  /** Budget health 0-100. */
  budget?: number;
  /** Timeline / schedule health 0-100. */
  timeline?: number;
  /** Team morale 0-100. */
  morale?: number;
  /** The headline product metric (e.g. retention %, conversion %). */
  metric?: number;
}

/** A single option the PM can pick at a step. */
export interface Choice {
  id: string;
  /** The PM's action / reply text. */
  text: string;
  /** Tone of voice — only meaningful for Zoom dialogue steps. */
  tone?: Tone;
  /** How the world reacts to this choice (state deltas). */
  effects: Effects;
  /** Short narration of the consequence shown after picking. */
  feedback: string;
  /** Optional in-character reply from an avatar (Zoom / phone). */
  reply?: string;
  /** If true, this choice immediately fails the mission. */
  fatal?: boolean;
}

/** A document available in the Folder for a given step. */
export interface DocItem {
  kind: "analytics" | "spec" | "risk" | "contract" | "report" | "brief";
  title: string;
  body: string;
}

/** A participant avatar in a Zoom meeting. */
export interface Participant {
  name: string;
  role: string;
  avatar: string;
  /** One-line mood / stance for flavour. */
  mood?: string;
}

/** A single decision node in the mission tree. */
export interface Step {
  id: string;
  /** Which desk object lights up / must be interacted with. */
  object: DeskObjectId;
  /** Short phase label (e.g. "Анализ CJM", "Митинг с командой"). */
  phase: string;
  title: string;
  /** Context / situation briefing for this step. */
  situation: string;

  // -- Phone-specific --
  from?: string;
  role?: string;
  avatar?: string;
  channel?: "chat" | "email" | "call";

  // -- Laptop / Zoom-specific --
  meeting?: { topic: string; participants: Participant[] };

  // -- Folder-specific --
  docs?: DocItem[];

  /** The options the player can choose from. */
  choices: Choice[];
}

/** Full definition of one playable mission. */
export interface Mission {
  id: string;
  /** Appears in the course list right after this lesson number. */
  afterLesson: number;
  title: string;
  subtitle: string;
  covers: string;
  intro: string;
  industry: string;
  /** Headline goal written on the dashboard. */
  goalLabel: string;
  metric: {
    key: string;
    label: string;
    unit: string;
    start: number;
    target: number;
  };
  /** Starting values for the three critical scales (default 70 each). */
  startScales?: { budget: number; timeline: number; morale: number };
  steps: Step[];
}

export const TONE_LABELS: Record<Tone, string> = {
  directive: "Директивно",
  supportive: "Поддерживающе",
  delegating: "Делегирующе",
};
