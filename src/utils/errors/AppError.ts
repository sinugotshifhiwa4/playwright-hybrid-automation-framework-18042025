import { ErrorCategory } from "../../models/enums/errorCategory";

export class AppError extends Error {
    constructor(
      public readonly category: ErrorCategory,
      public readonly details?: Record<string, unknown>,
      message?: string
    ) {
      super(message);
      this.name = "App Error";
    }
  }
  