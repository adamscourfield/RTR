import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { seedLessons } from "./seed";
import type { Lesson, LessonSummary } from "./types";

// A single JSON file keeps the MVP dependency-free. Swap this module for a real
// database (Postgres etc.) before multi-user or serverless deployment.
const DB_PATH = process.env.RTR_DB_PATH ?? path.join(process.cwd(), "data", "rtr-db.json");

interface Db {
  lessons: Lesson[];
}

let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ DB_PATH, "utf8")) as Db;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    const db = { lessons: seedLessons() };
    await write(db);
    return db;
  }
}

async function write(db: Db) {
  await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  await fs.writeFile(/*turbopackIgnore: true*/ tmp, JSON.stringify(db));
  await fs.rename(/*turbopackIgnore: true*/ tmp, DB_PATH);
}

/** Serialise read-modify-write cycles so concurrent requests don't clobber each other. */
function mutate<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await read();
    const result = await fn(db);
    await write(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

const summarise = (lesson: Lesson): LessonSummary => {
  const { segments, ...rest } = lesson;
  void segments;
  return rest;
};

export async function listLessons(): Promise<LessonSummary[]> {
  const db = await read();
  return db.lessons.map(summarise).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const db = await read();
  return db.lessons.find((l) => l.id === id) ?? null;
}

export function saveLesson(lesson: Lesson): Promise<Lesson> {
  return mutate((db) => {
    const i = db.lessons.findIndex((l) => l.id === lesson.id);
    if (i >= 0) db.lessons[i] = lesson;
    else db.lessons.push(lesson);
    return lesson;
  });
}

export function updateLesson(id: string, patch: Partial<Lesson>): Promise<Lesson | null> {
  return mutate((db) => {
    const l = db.lessons.find((x) => x.id === id);
    if (!l) return null;
    Object.assign(l, patch);
    return l;
  });
}

export function deleteLesson(id: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.lessons.length;
    db.lessons = db.lessons.filter((l) => l.id !== id);
    return db.lessons.length < before;
  });
}

export async function listLessonsFull(): Promise<Lesson[]> {
  return (await read()).lessons;
}
