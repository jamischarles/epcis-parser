/**
 * Error classes and messages for the EPCIS parser
 */

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Custom error class for parsing errors
 */
export class ParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParsingError';
  }
}

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  INVALID_XML: 'Invalid XML document',
  INVALID_JSON: 'Invalid JSON document',
  INVALID_EPCIS: 'Invalid EPCIS document',
  UNSUPPORTED_VERSION: 'Unsupported EPCIS version',
  SCHEMA_LOAD_FAILED: 'Failed to load schema',
  VALIDATION_FAILED: 'Document validation failed',
  PARSING_FAILED: 'Failed to parse document',
  UNKNOWN_FORMAT: 'Unknown document format'
};
