import type { ZodType } from 'zod';

export class HttpError extends Error {
  readonly statusCode: number;
  readonly details: unknown;
  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown): HttpError {
  return new HttpError(400, message, details);
}

export function notFound(message = 'Nicht gefunden'): HttpError {
  return new HttpError(404, message);
}

/** Validiert einen Body mit zod und wirft bei Fehlern einen 400 mit lesbaren Details. */
export function parseWith<T>(schema: ZodType<T>, data: unknown, what = 'Eingabe'): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message }));
    throw badRequest(`${what} ungültig`, issues);
  }
  return result.data;
}
