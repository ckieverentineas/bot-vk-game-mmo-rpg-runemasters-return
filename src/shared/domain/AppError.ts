export class AppError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;

