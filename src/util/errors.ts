/** Generic top-level error class that other Earthstar errors inherit from. */
export class EarthstarError extends Error {
  constructor(message?: string) {
    super(message || "");
    this.name = "EarthstarError";
  }
}

/** Validation failed on a document, share address, author address, etc. */
export class ValidationError extends EarthstarError {
  constructor(message?: string) {
    super(message || "Validation error");
    this.name = "ValidationError";
  }
}

export class AuthorisationError extends EarthstarError {
  constructor(message?: string) {
    super(message || "Authorisation error");
    this.name = "AuthorisationError";
  }
}

/** A server URL is bad or the network is down */
export class NetworkError extends EarthstarError {
  constructor(message?: string) {
    super(message || "network error");
    this.name = "NetworkError";
  }
}

export class TimeoutError extends EarthstarError {
  constructor(message?: string) {
    super(message || "timeout error");
    this.name = "TimeoutError";
  }
}

/** A server won't accept writes */
export class ConnectionRefusedError extends EarthstarError {
  constructor(message?: string) {
    super(message || "connection refused");
    this.name = "ConnectionRefused";
  }
}

export class NotImplementedError extends EarthstarError {
  constructor(message?: string) {
    super(message || "not implemented yet");
    this.name = "NotImplementedError";
  }
}

export class NotSupportedError extends EarthstarError {
  constructor(message?: string) {
    super(message || "Not supported");
    this.name = "NotSupportedError";
  }
}

/** Check if any value is a subclass of EarthstarError (return true) or not (return false) */
export function isErr<T>(x: T | Error): x is EarthstarError {
  return x instanceof EarthstarError;
}

/** Check if any value is a subclass of EarthstarError (return false) or not (return true) */
export function notErr<T>(x: T | Error): x is T {
  return !(x instanceof EarthstarError);
}
