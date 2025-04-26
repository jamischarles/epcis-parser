/**
 * JSON Validator for EPCIS documents
 */
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ValidationResult } from '../types.js';

// Initialize Ajv with formats
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// In-memory EPCIS 2.0 JSON-LD schema
// This is a simplified version for basic validation
// The full validation should be done with a complete JSON Schema for EPCIS 2.0
const epcis20JsonSchema = {
  type: 'object',
  required: ['@context', 'type', 'epcisBody'],
  properties: {
    '@context': {
      oneOf: [
        { type: 'string' },
        { 
          type: 'array',
          items: { type: 'string' },
          contains: { 
            const: 'https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld'
          }
        }
      ]
    },
    'type': { const: 'EPCISDocument' },
    'schemaVersion': { type: 'string' },
    'creationDate': { type: 'string', format: 'date-time' },
    'epcisHeader': {
      type: 'object',
      properties: {
        'epcisMasterData': { type: 'object' },
        'sender': { type: 'object' },
        'receiver': { type: 'object' },
        'documentIdentification': { type: 'object' }
      }
    },
    'epcisBody': {
      type: 'object',
      required: ['eventList'],
      properties: {
        'eventList': {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', 'eventTime', 'eventTimeZoneOffset'],
            properties: {
              'type': { type: 'string' },
              'eventTime': { type: 'string', format: 'date-time' },
              'eventTimeZoneOffset': { type: 'string', pattern: '^[+-][0-9]{2}:00$' },
              'epcList': { type: 'array', items: { type: 'string' } },
              'action': { type: 'string', enum: ['OBSERVE', 'ADD', 'DELETE'] },
              'bizStep': { type: 'string' },
              'disposition': { type: 'string' },
              'readPoint': { type: 'object' },
              'bizLocation': { type: 'object' },
              'bizTransactionList': { type: 'array' },
              'persistentDisposition': { type: 'object' },
              'sensorElementList': { type: 'array' }
            }
          }
        }
      }
    }
  }
};

// Register EPCIS 2.0 JSON-LD schema with Ajv
const validateEpcis20Json = ajv.compile(epcis20JsonSchema);

/**
 * Validate JSON-LD document against the EPCIS 2.0 schema
 * @param jsonData JSON-LD data as string
 * @returns Validation result
 */
export async function validateJson(jsonData: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: false,
    errors: []
  };

  try {
    // Parse JSON document
    const jsonObj = JSON.parse(jsonData);
    
    // Check EPCIS 2.0 JSON-LD context
    const context = jsonObj['@context'];
    const hasEpcisContext = Array.isArray(context) 
      ? context.includes('https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld')
      : context === 'https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld';
    
    if (!hasEpcisContext) {
      result.errors.push('Missing or invalid EPCIS 2.0 context in JSON-LD document');
      return result;
    }
    
    // Schema validation
    const isValid = validateEpcis20Json(jsonObj);
    
    if (isValid) {
      result.valid = true;
    } else {
      const validationErrors = (validateEpcis20Json.errors || []).map(err => 
        `${err.instancePath} ${err.message}`
      );
      result.errors = validationErrors;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`JSON parsing error: ${message}`);
  }

  return result;
}
