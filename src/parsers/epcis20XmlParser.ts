/**
 * EPCIS 2.0 XML Parser
 */
import * as xml2js from 'xml2js';
import { XMLValidator } from 'fast-xml-parser';
import { 
  EPCISParser, 
  EPCISEvent, 
  MasterData, 
  EPCISHeader, 
  Sender, 
  Receiver, 
  ValidationResult, 
  ParserOptions,
  EPCISDocument
} from '../types';
import { validateXml } from '../validators/xmlValidator';
import { ValidationError } from '../utils/errorMessages';

export class EPCIS20XmlParser implements EPCISParser {
  private data: string;
  private parsedData: any = null;
  private options: ParserOptions;
  private validationResult: ValidationResult = { valid: false, errors: [] };
  private isParsed: boolean = false;
  private document: EPCISDocument = {
    events: [],
    masterData: {},
    header: {},
    sender: {},
    receiver: {}
  };

  constructor(data: string, options: ParserOptions = {}) {
    this.data = data;
    this.options = {
      validate: options.validate !== false,
      validationOptions: {
        throwOnError: options.validationOptions?.throwOnError !== false,
        ...options.validationOptions
      }
    };
    
    // Initial validation of XML structure
    const parserError = XMLValidator.validate(data);
    if (parserError !== true) {
      this.validationResult.errors.push(`XML syntax error: ${parserError.err.msg}`);
      if (this.options.validationOptions?.throwOnError) {
        throw new ValidationError('Invalid XML syntax', [parserError.err.msg]);
      }
    } else {
      this.validationResult.valid = true;
    }
  }

  /**
   * Parse the EPCIS XML document
   * @private
   */
  private async parse(): Promise<void> {
    if (this.isParsed) return;

    try {
      // Parse XML
      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true,
        attrNameProcessors: [(name) => name.replace(/^@/, '')],
        tagNameProcessors: [(name) => name.replace(/^.*:/, '')] // Remove namespaces
      });
      
      this.parsedData = await parser.parseStringPromise(this.data);
      
      // Check if EPCIS document structure is valid
      if (!this.parsedData.EPCISDocument) {
        throw new Error('Invalid EPCIS document structure. Root element should be EPCISDocument.');
      }

      // Validate against EPCIS 2.0 schema if validation is enabled
      if (this.options.validate) {
        this.validationResult = await validateXml(this.data, '2.0');
        if (!this.validationResult.valid && this.options.validationOptions?.throwOnError) {
          throw new ValidationError('EPCIS 2.0 schema validation failed', this.validationResult.errors);
        }
      }

      // Extract events
      this.extractEvents();
      
      // Extract master data
      this.extractMasterData();
      
      // Extract header information
      this.extractHeader();
      
      // Extract sender/receiver info
      this.extractSenderReceiver();
      
      this.isParsed = true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse EPCIS 2.0 XML: ${message}`);
    }
  }

  /**
   * Extract events from the parsed XML
   * @private
   */
  private extractEvents(): void {
    const events: EPCISEvent[] = [];
    
    try {
      const eventListData = this.parsedData.EPCISDocument.EPCISBody.EventList;
      
      if (!eventListData) {
        return;
      }
      
      // Process each event type
      const eventTypes = [
        'ObjectEvent', 
        'AggregationEvent', 
        'TransactionEvent', 
        'TransformationEvent',
        'AssociationEvent'  // New in EPCIS 2.0
      ];
      
      for (const eventType of eventTypes) {
        let typeEvents = eventListData[eventType];
        
        if (!typeEvents) continue;
        
        // Make sure typeEvents is an array
        if (!Array.isArray(typeEvents)) {
          typeEvents = [typeEvents];
        }
        
        for (const event of typeEvents) {
          const formattedEvent: EPCISEvent = {
            type: eventType,
            eventTime: event.eventTime,
            eventTimeZoneOffset: event.eventTimeZoneOffset,
          };
          
          // Handle EPCs
          if (event.epcList) {
            formattedEvent.epcList = Array.isArray(event.epcList.epc) 
              ? event.epcList.epc 
              : [event.epcList.epc];
          }
          
          // Copy other standard fields
          if (event.action) formattedEvent.action = event.action;
          if (event.bizStep) formattedEvent.bizStep = event.bizStep;
          if (event.disposition) formattedEvent.disposition = event.disposition;
          
          // Handle read point
          if (event.readPoint && event.readPoint.id) {
            formattedEvent.readPoint = { id: event.readPoint.id };
          }
          
          // Handle business location
          if (event.bizLocation && event.bizLocation.id) {
            formattedEvent.bizLocation = { id: event.bizLocation.id };
          }
          
          // Handle business transactions
          if (event.bizTransactionList) {
            const bizTransactions = Array.isArray(event.bizTransactionList.bizTransaction) 
              ? event.bizTransactionList.bizTransaction 
              : [event.bizTransactionList.bizTransaction];
              
            formattedEvent.bizTransactionList = bizTransactions.map((bt: any) => ({
              type: bt.type,
              value: bt._
            }));
          }
          
          // Handle persistent dispositions (new in EPCIS 2.0)
          if (event.persistentDisposition) {
            formattedEvent.persistentDisposition = event.persistentDisposition;
          }
          
          // Handle sensor data (new in EPCIS 2.0)
          if (event.sensorElementList) {
            formattedEvent.sensorElementList = event.sensorElementList;
          }
          
          // Handle certifications (new in EPCIS 2.0)
          if (event.certificationInfo) {
            formattedEvent.certificationInfo = event.certificationInfo;
          }
          
          // Copy any other fields (extension fields)
          Object.keys(event).forEach(key => {
            if (!formattedEvent[key] && key !== '_' && !key.startsWith('xmlns')) {
              formattedEvent[key] = event[key];
            }
          });
          
          events.push(formattedEvent);
        }
      }
    } catch (error) {
      console.error('Error extracting events:', error);
    }
    
    this.document.events = events;
  }

  /**
   * Extract master data from the parsed XML
   * @private
   */
  private extractMasterData(): void {
    const masterData: Record<string, MasterData> = {};
    
    try {
      const masterDataSection = this.parsedData.EPCISDocument.EPCISHeader?.extension?.EPCISMasterData?.VocabularyList;
      
      if (!masterDataSection) {
        return;
      }
      
      let vocabularies = masterDataSection.Vocabulary;
      
      if (!vocabularies) {
        return;
      }
      
      // Make sure vocabularies is an array
      if (!Array.isArray(vocabularies)) {
        vocabularies = [vocabularies];
      }
      
      for (const vocabulary of vocabularies) {
        const type = vocabulary.type;
        let vocabularyElements = vocabulary.VocabularyElement;
        
        if (!vocabularyElements) continue;
        
        // Make sure vocabularyElements is an array
        if (!Array.isArray(vocabularyElements)) {
          vocabularyElements = [vocabularyElements];
        }
        
        for (const element of vocabularyElements) {
          const id = element.id;
          
          if (!id) continue;
          
          const mdItem: MasterData = {
            id,
            type,
            attributes: {}
          };
          
          // Extract attributes
          if (element.attribute) {
            let attributes = element.attribute;
            if (!Array.isArray(attributes)) {
              attributes = [attributes];
            }
            
            for (const attr of attributes) {
              if (attr.id && attr._) {
                mdItem.attributes[attr.id] = attr._;
              }
            }
          }
          
          // Extract children
          if (element.children) {
            let children = element.children.id;
            if (!Array.isArray(children)) {
              children = [children];
            }
            
            mdItem.children = children.map((childId: string) => ({ id: childId }));
          }
          
          masterData[id] = mdItem;
        }
      }
    } catch (error) {
      console.error('Error extracting master data:', error);
    }
    
    this.document.masterData = masterData;
  }

  /**
   * Extract header information from the parsed XML
   * @private
   */
  private extractHeader(): void {
    const header: EPCISHeader = {};
    
    try {
      const headerData = this.parsedData.EPCISDocument.EPCISHeader;
      
      if (!headerData) {
        return;
      }
      
      // Extract standard version
      if (this.parsedData.EPCISDocument.schemaVersion) {
        header.standardVersion = this.parsedData.EPCISDocument.schemaVersion;
      }
      
      // Extract document identification
      if (headerData.StandardBusinessDocumentHeader) {
        const sbdh = headerData.StandardBusinessDocumentHeader;
        
        header.documentIdentification = {
          creationDateTime: sbdh.DocumentIdentification?.CreationDateAndTime,
          instanceIdentifier: sbdh.DocumentIdentification?.InstanceIdentifier
        };
        
        // Copy other SBDH fields that may be relevant
        Object.keys(sbdh).forEach(key => {
          if (key !== 'DocumentIdentification' && key !== 'Sender' && key !== 'Receiver') {
            header[key] = sbdh[key];
          }
        });
      }
      
      // Copy any other header fields
      Object.keys(headerData).forEach(key => {
        if (key !== 'StandardBusinessDocumentHeader' && key !== 'extension' && !key.startsWith('xmlns')) {
          header[key] = headerData[key];
        }
      });
    } catch (error) {
      console.error('Error extracting header:', error);
    }
    
    this.document.header = header;
  }

  /**
   * Extract sender and receiver information from the parsed XML
   * @private
   */
  private extractSenderReceiver(): void {
    const sender: Sender = {};
    const receiver: Receiver = {};
    
    try {
      const sbdh = this.parsedData.EPCISDocument.EPCISHeader?.StandardBusinessDocumentHeader;
      
      if (!sbdh) {
        return;
      }
      
      // Extract sender
      if (sbdh.Sender) {
        const senderData = sbdh.Sender;
        
        if (senderData.Identifier) {
          sender.identifier = senderData.Identifier._;
        }
        
        if (senderData.ContactInformation) {
          sender.name = senderData.ContactInformation.Contact;
        }
      }
      
      // Extract receiver
      if (sbdh.Receiver) {
        const receiverData = sbdh.Receiver;
        
        if (receiverData.Identifier) {
          receiver.identifier = receiverData.Identifier._;
        }
        
        if (receiverData.ContactInformation) {
          receiver.name = receiverData.ContactInformation.Contact;
        }
      }
    } catch (error) {
      console.error('Error extracting sender/receiver:', error);
    }
    
    this.document.sender = sender;
    this.document.receiver = receiver;
  }

  /**
   * Get the list of events from the EPCIS document
   */
  async getEventList(): Promise<EPCISEvent[]> {
    if (!this.isParsed) {
      await this.parse();
    }
    return this.document.events;
  }
  
  /**
   * Get the master data from the EPCIS document
   */
  async getMasterData(): Promise<Record<string, MasterData>> {
    if (!this.isParsed) {
      await this.parse();
    }
    return this.document.masterData || {};
  }
  
  /**
   * Get the EPCIS header from the document
   */
  async getEPCISHeader(): Promise<EPCISHeader> {
    if (!this.isParsed) {
      await this.parse();
    }
    return this.document.header || {};
  }
  
  /**
   * Get the sender information from the document
   */
  async getSender(): Promise<Sender> {
    if (!this.isParsed) {
      await this.parse();
    }
    return this.document.sender || {};
  }
  
  /**
   * Get the receiver information from the document
   */
  async getReceiver(): Promise<Receiver> {
    if (!this.isParsed) {
      await this.parse();
    }
    return this.document.receiver || {};
  }
  
  /**
   * Validate the document against the EPCIS schema
   */
  async isValid(): Promise<ValidationResult> {
    if (!this.isParsed) {
      await this.parse();
    }
    return this.validationResult;
  }
  
  /**
   * Get the full parsed document
   */
  async getDocument(): Promise<EPCISDocument> {
    if (!this.isParsed) {
      await this.parse();
    }
    return this.document;
  }
}
