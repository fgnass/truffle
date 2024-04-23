export class InitializationError extends Error {
  /**
   * Represents a module initialization error.
   * @param message The message to display when thrown.
   * @constructor
   */
  constructor(message: string) {
    super(message);
    this.name = "InitializationError";
  }
}
