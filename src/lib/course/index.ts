import type { Lesson, Task } from "./types";
import { LESSONS_1_9 } from "./lessons-1-9";
import { LESSONS_10_18 } from "./lessons-10-18";
import { LESSONS_19_26 } from "./lessons-19-26";

export * from "./types";

export const LESSONS: Lesson[] = [...LESSONS_1_9, ...LESSONS_10_18, ...LESSONS_19_26];

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
