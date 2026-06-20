import type { Lesson, Task } from "./types";
import { LESSONS_1_9 } from "./lessons-1-9";
import { LESSONS_10_18 } from "./lessons-10-18";
import { LESSONS_19_26 } from "./lessons-19-26";

export * from "./types";

const RAW_LESSONS: Lesson[] = [...LESSONS_1_9, ...LESSONS_10_18, ...LESSONS_19_26];
const CALL_LESSON_NUMBERS = new Set([1, 3, 4, 5, 7, 13, 14, 17, 20, 24, 25, 26]);

export const LESSONS: Lesson[] = RAW_LESSONS.map((lesson) => ({
  ...lesson,
  tasks: CALL_LESSON_NUMBERS.has(lesson.number) ? lesson.tasks : lesson.tasks.filter((task) => task.type !== "call"),
}));

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

/** Returns the ordered runtime steps for a lesson: theory, the 5 tasks, summary. */
export function lessonStepCount(lesson: Lesson): number {
  // theory + tasks + summary
  return 1 + lesson.tasks.length + 1;
}

export function getTask(lesson: Lesson, index: number): Task | undefined {
  return lesson.tasks[index];
}
