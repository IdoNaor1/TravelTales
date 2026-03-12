import { Request, Response, NextFunction } from "express";

type ValidatorFn = (value: unknown, field: string) => string | null;

interface FieldRule {
  source: "body" | "query" | "params";
  optional?: boolean;
  validators?: ValidatorFn[];
}

export type ValidationSchema = Record<string, FieldRule>;

/**
 * Factory that returns an Express middleware which validates the request
 * against the provided schema. Responds with 400 if any rule fails.
 */
export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(schema)) {
      const source = req[rule.source] as Record<string, unknown> | undefined;
      const raw = source?.[field];
      // Trim strings so whitespace-only values count as empty
      const value = typeof raw === "string" ? raw.trim() : raw;

      if (value === undefined || value === null || value === "") {
        if (!rule.optional) {
          errors.push(`${field} is required`);
        }
        continue;
      }

      for (const validator of rule.validators ?? []) {
        const error = validator(value, field);
        if (error) {
          errors.push(error);
          break;
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ message: errors[0], errors });
      return;
    }

    next();
  };
}

// ── Built-in validators ──────────────────────────────────────────────────────

export const isString: ValidatorFn = (value, field) =>
  typeof value !== "string" ? `${field} must be a string` : null;

export const isEmail: ValidatorFn = (value, field) => {
  if (typeof value !== "string") return `${field} must be a string`;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value)
    ? null
    : `${field} must be a valid email address`;
};

export const minLength =
  (min: number): ValidatorFn =>
  (value, field) =>
    typeof value !== "string" || value.length < min
      ? `${field} must be at least ${min} characters`
      : null;

export const maxLength =
  (max: number): ValidatorFn =>
  (value, field) =>
    typeof value !== "string" || value.length > max
      ? `${field} must be at most ${max} characters`
      : null;

export const isMongoId: ValidatorFn = (value, field) =>
  typeof value !== "string" || !/^[a-fA-F0-9]{24}$/.test(value)
    ? `${field} must be a valid ID`
    : null;

export const noSpaces: ValidatorFn = (value, field) =>
  typeof value !== "string" || /\s/.test(value)
    ? `${field} must not contain spaces`
    : null;

export const isPositiveInt: ValidatorFn = (value, field) => {
  const num = parseInt(value as string, 10);
  return isNaN(num) || num < 1 ? `${field} must be a positive integer` : null;
};
