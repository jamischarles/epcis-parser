/**
 * Type declarations for epcis2.js library
 */

declare module 'epcis2.js' {
  export class EPCISDocument {
    constructor(jsonData: any);
    
    /**
     * Get events from the EPCIS document
     */
    getEvents(): any[];
    
    /**
     * Get vocabulary (master data) from the EPCIS document
     */
    getVocabulary(): Record<string, any[]>;
  }
}