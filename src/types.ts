/**
 * Common type definitions for the EPCIS parser module
 */

/**
 * Options for the EPCIS parsers
 */
export interface ParserOptions {
  /**
   * Whether to validate the document against the schema
   * @default true
   */
  validate?: boolean;
  
  /**
   * Additional validation options
   */
  validationOptions?: {
    /**
     * Whether to throw an error on validation failure
     * @default true
     */
    throwOnError?: boolean;
  };
}

/**
 * Represents event data in an EPCIS document
 */
export interface EPCISEvent {
  type: string;
  eventTime: string;
  eventTimeZoneOffset: string;
  epcList?: string[];
  action?: string;
  bizStep?: string;
  disposition?: string;
  readPoint?: {
    id: string;
  };
  bizLocation?: {
    id: string;
  };
  bizTransactionList?: Array<{
    type: string;
    value: string;
  }>;
  [key: string]: any; // Allow for extension fields
}

/**
 * Represents a piece of master data in an EPCIS document
 */
export interface MasterData {
  id: string;
  name?: string;
  attributes?: Record<string, any>;
  children?: MasterData[];
  type?: string;
  [key: string]: any;
}

/**
 * Represents the EPCIS header information
 */
export interface EPCISHeader {
  standardVersion?: string;
  documentIdentification?: {
    creationDateTime?: string;
    instanceIdentifier?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Represents sender information in an EPCIS document
 */
export interface Sender {
  identifier?: string;
  name?: string;
  [key: string]: any;
}

/**
 * Represents receiver information in an EPCIS document
 */
export interface Receiver {
  identifier?: string;
  name?: string;
  [key: string]: any;
}

/**
 * Represents validation results for an EPCIS document
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Represents a parsed EPCIS document
 */
export interface EPCISDocument {
  events: EPCISEvent[];
  masterData?: Record<string, MasterData>;
  header?: EPCISHeader;
  sender?: Sender;
  receiver?: Receiver;
}

/**
 * Interface for all EPCIS parsers
 */
export interface EPCISParser {
  /**
   * Get the list of events from the EPCIS document
   */
  getEventList(): EPCISEvent[];
  
  /**
   * Get the master data from the EPCIS document
   */
  getMasterData(): Record<string, MasterData>;
  
  /**
   * Get the EPCIS header from the document
   */
  getEPCISHeader(): EPCISHeader;
  
  /**
   * Get the sender information from the document
   */
  getSender(): Sender;
  
  /**
   * Get the receiver information from the document
   */
  getReceiver(): Receiver;
  
  /**
   * Validate the document against the EPCIS schema
   */
  isValid(): ValidationResult;
  
  /**
   * Get the full parsed document
   */
  getDocument(): EPCISDocument;
}
