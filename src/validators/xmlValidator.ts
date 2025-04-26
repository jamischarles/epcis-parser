/**
 * XML Validator for EPCIS documents
 */
import { readFileSync } from 'fs';
import path from 'path';
import * as libxml from 'libxmljs2';
import { ValidationResult } from '../types.js';

// Cache for schema documents (avoid reading from disk on each validation)
const schemaCache: Record<string, libxml.Document> = {};

/**
 * Load XSD schema for validation
 * @param version EPCIS version ('1.2' or '2.0')
 * @returns The loaded schema document
 */
async function loadSchema(version: string): Promise<libxml.Document> {
  if (schemaCache[version]) {
    return schemaCache[version];
  }

  let schemaPath: string;
  if (version === '1.2') {
    schemaPath = path.join(__dirname, '../schemas/epcis12.xsd');
  } else if (version === '2.0') {
    schemaPath = path.join(__dirname, '../schemas/epcis20.xsd');
  } else {
    throw new Error(`Unsupported EPCIS version: ${version}`);
  }

  try {
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    const schema = libxml.parseXml(schemaContent);
    schemaCache[version] = schema;
    return schema;
  } catch (error) {
    throw new Error(`Failed to load XSD schema for EPCIS ${version}: ${error}`);
  }
}

/**
 * Validate XML document against the EPCIS schema
 * @param xmlData XML data as string
 * @param version EPCIS version ('1.2' or '2.0')
 * @returns Validation result
 */
export async function validateXml(xmlData: string, version: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: false,
    errors: []
  };

  try {
    // Parse XML document
    const xmlDoc = libxml.parseXml(xmlData);
    
    // Basic validation first
    if (!xmlDoc || !xmlDoc.root()) {
      result.errors.push('Invalid XML document structure');
      return result;
    }

    // Root element check
    const root = xmlDoc.root();
    if (!root) {
      result.errors.push('Missing root element in XML document');
      return result;
    }
    
    const rootName = root.name();
    if (rootName !== 'EPCISDocument') {
      result.errors.push(`Invalid root element: expected 'EPCISDocument', got '${rootName}'`);
      return result;
    }

    // Schema validation
    try {
      const schema = await loadSchema(version);
      const isValid = xmlDoc.validate(schema);
      
      if (isValid) {
        result.valid = true;
      } else {
        const validationErrors = xmlDoc.validationErrors.map(err => 
          `Line ${err.line}: ${err.message}`
        );
        result.errors = validationErrors;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Schema validation error: ${message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`XML parsing error: ${message}`);
  }

  return result;
}
