type LogLevel = 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';

export class Logger {
  public static info(message: string, ...context: unknown[]): void {
    console.log(this.formatMessage('INFO', message), ...context);
  }

  public static error(message: string, ...context: unknown[]): void {
    console.error(this.formatMessage('ERROR', message), ...context);
  }

  public static warn(message: string, ...context: unknown[]): void {
    console.warn(this.formatMessage('WARN', message), ...context);
  }

  public static debug(message: string, ...context: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('DEBUG', message), ...context);
    }
  }

  private static formatMessage(level: LogLevel, message: string): string {
    return `[${level}] ${new Date().toISOString()} - ${message}`;
  }
}
