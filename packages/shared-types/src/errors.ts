export class SarvenixError extends Error {
  public readonly timestamp: Date;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    // Maintain proper stack trace in V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class DatabaseQueryError extends SarvenixError {
  public readonly query: string;
  public readonly params?: any;
  public readonly dbUrl?: string;

  constructor(message: string, query: string, params?: any, dbUrl?: string) {
    super(message);
    this.query = query;
    this.params = params;
    this.dbUrl = dbUrl;
  }
}

export class GeminiApiError extends SarvenixError {
  public readonly status?: number;
  public readonly modelName?: string;
  public readonly promptSnippet?: string;

  constructor(message: string, status?: number, modelName?: string, promptSnippet?: string) {
    super(message);
    this.status = status;
    this.modelName = modelName;
    this.promptSnippet = promptSnippet;
  }
}

export class SlackClientError extends SarvenixError {
  public readonly method: string;
  public readonly neededScopes?: string[];
  public readonly providedScopes?: string[];
  public readonly rawError?: any;

  constructor(
    message: string,
    method: string,
    neededScopes?: string[],
    providedScopes?: string[],
    rawError?: any
  ) {
    super(message);
    this.method = method;
    this.neededScopes = neededScopes;
    this.providedScopes = providedScopes;
    this.rawError = rawError;
  }
}
