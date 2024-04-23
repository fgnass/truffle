export class ArgumentError extends Error {
  /**
   * Represents an input argument validation error.
   * @param message The message to display when thrown.
   */
  constructor(message: string) {
    super(message);
    this.name = "ArgumentError";
  }
}
