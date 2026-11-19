import { z } from "zod";

// The database allow-list is the authority; this module only mirrors it for
// validation and display. Add a language here only after its questions exist.
export const gameLanguages = ["python", "javascript", "java"] as const;
export type GameLanguage = (typeof gameLanguages)[number];
export const languageSchema = z.enum(gameLanguages);
export const defaultLanguage: GameLanguage = "python";
export const languageNames: Record<GameLanguage, string> = { python: "Python", javascript: "JavaScript", java: "Java" };

/** Qualifies the create command, e.g. "create:javascript". Python keeps the plain action. */
export function createAction(language: GameLanguage | undefined): string {
  return language && language !== defaultLanguage ? `create:${language}` : "create";
}
