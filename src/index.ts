/**
 * EPCIS Parser
 * 
 * A Node.js module for parsing and validating EPCIS 1.2/2.0 XML and JSON-LD files
 * with a consistent API.
 */
import { EPCIS12XmlParser } from './parsers/epcis12XmlParser';
import { EPCIS20XmlParser } from './parsers/epcis20XmlParser';
import { EPCIS20JsonLdParser } from './parsers/epcis20JsonLdParser';
import { ParserOptions, EPCISDocument, EPCISParser } from './types';

/**
 * Factory function to create the appropriate parser based on the input format
 * @param data - The EPCIS document as a string
 * @param options - Parser options
 * @returns An instance of the appropriate parser
 */
export function createParser(data: string, options: ParserOptions = {}): EPCISParser {
  try {
    // Check if it's JSON-LD by attempting to parse it
    try {
      const jsonData = JSON.parse(data);
      if (jsonData['@context'] && 
          (jsonData['@context'] === 'https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld' ||
           (Array.isArray(jsonData['@context']) && 
            jsonData['@context'].includes('https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld')))) {
        return new EPCIS20JsonLdParser(data, options);
      }
    } catch (e) {
      // Not JSON, continue with XML checks
    }

    // Check if it's XML
    if (data.trim().startsWith('<')) {
      // Check for EPCIS version in the XML
      if (data.includes('urn:epcglobal:epcis:xsd:1')) {
        return new EPCIS12XmlParser(data, options);
      } else if (data.includes('urn:epcglobal:epcis:xsd:2') || 
                data.includes('https://ref.gs1.org/standards/epcis/2.0.0/')) {
        return new EPCIS20XmlParser(data, options);
      }
    }

    throw new Error('Could not determine EPCIS document format. Please provide a valid EPCIS 1.2 XML, EPCIS 2.0 XML, or EPCIS 2.0 JSON-LD document.');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Error creating parser: ${error}`);
  }
}

export {
  EPCIS12XmlParser,
  EPCIS20XmlParser,
  EPCIS20JsonLdParser,
  EPCISDocument,
  EPCISParser,
  ParserOptions
};
