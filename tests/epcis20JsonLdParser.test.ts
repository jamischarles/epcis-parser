/**
 * Tests for EPCIS 2.0 JSON-LD Parser
 */
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { EPCIS20JsonLdParser } from '../src/parsers/epcis20JsonLdParser';
import { ValidationError } from '../src/utils/errorMessages';

vi.mock('epcis2.js', () => {
  return {
    EPCISDocument: class MockEPCISDocument {
      private jsonData: any;
      
      constructor(jsonData: any) {
        this.jsonData = jsonData;
      }
      
      getEvents() {
        return this.jsonData.epcisBody.eventList.map((event: any) => ({
          ...event,
          // Match the format returned by the library
          type: event['@type'] || event.type,
          eventTime: event.eventTime,
          eventTimeZoneOffset: event.eventTimeZoneOffset,
          epcList: event.epcList,
          action: event.action,
          bizStep: event.bizStep,
          disposition: event.disposition,
          readPoint: event.readPoint,
          bizLocation: event.bizLocation,
          bizTransactionList: event.bizTransactionList,
          persistentDisposition: event.persistentDisposition,
          sensorElementList: event.sensorElementList,
          certificationInfo: event.certificationInfo
        }));
      }
      
      getVocabulary() {
        const vocabulary: any = {};
        
        if (this.jsonData.epcisHeader?.epcisMasterData?.vocabularyList) {
          this.jsonData.epcisHeader.epcisMasterData.vocabularyList.forEach((vocab: any) => {
            const type = vocab.type.split('#').pop();
            vocabulary[type] = vocab.vocabularyElements.map((element: any) => ({
              id: element.id,
              attributes: element.attributes,
              children: element.children
            }));
          });
        }
        
        return vocabulary;
      }
    }
  };
});

describe('EPCIS20JsonLdParser', () => {
  // Sample EPCIS 2.0 JSON-LD document for testing
  const sampleJson = `{
    "@context": "https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld",
    "type": "EPCISDocument",
    "schemaVersion": "2.0",
    "creationDate": "2021-03-12T17:00:00.000Z",
    "epcisHeader": {
      "epcisMasterData": {
        "vocabularyList": [
          {
            "type": "urn:epcglobal:epcis:vtype:Location",
            "vocabularyElements": [
              {
                "id": "urn:epc:id:sgln:0614141.00001.0",
                "attributes": {
                  "urn:epcglobal:cbv:mda:site": "Warehouse 1",
                  "urn:epcglobal:cbv:mda:address": "123 Main St",
                  "urn:epcglobal:cbv:mda:city": "New York"
                }
              }
            ]
          }
        ]
      },
      "sender": {
        "identifier": "urn:epc:id:sgln:0614141.00001.0",
        "name": "John Doe"
      },
      "receiver": {
        "identifier": "urn:epc:id:sgln:0614142.00001.0",
        "name": "Jane Smith"
      },
      "documentIdentification": {
        "standard": "EPCIS",
        "typeVersion": "2.0",
        "instanceIdentifier": "Test-Instance-ID",
        "type": "Events",
        "creationDateTime": "2021-03-12T17:00:00.000Z"
      }
    },
    "epcisBody": {
      "eventList": [
        {
          "@type": "ObjectEvent",
          "eventTime": "2021-03-12T13:00:00.000Z",
          "eventTimeZoneOffset": "-04:00",
          "epcList": [
            "urn:epc:id:sgtin:0614141.107346.2017",
            "urn:epc:id:sgtin:0614141.107346.2018"
          ],
          "action": "OBSERVE",
          "bizStep": "urn:epcglobal:cbv:bizstep:shipping",
          "disposition": "urn:epcglobal:cbv:disp:in_transit",
          "readPoint": {
            "id": "urn:epc:id:sgln:0614141.00001.0"
          },
          "bizLocation": {
            "id": "urn:epc:id:sgln:0614141.00001.0"
          },
          "bizTransactionList": [
            {
              "type": "urn:epcglobal:cbv:btt:po",
              "value": "urn:epc:id:gdti:0614141.00001.1618034"
            }
          ],
          "persistentDisposition": {
            "set": ["urn:epcglobal:cbv:disp:in_transit"],
            "unset": ["urn:epcglobal:cbv:disp:in_progress"]
          },
          "sensorElementList": [
            {
              "sensorMetadata": {
                "time": "2021-03-12T13:00:00.000Z",
                "deviceID": "urn:epc:id:giai:4000001.111",
                "deviceMetadata": "https://example.org/giai/4000001111",
                "rawData": "https://example.org/giai/401234599999"
              },
              "sensorReport": [
                {
                  "type": "Temperature",
                  "value": 26.0,
                  "uom": "CEL",
                  "deviceID": "urn:epc:id:giai:4000001.111",
                  "deviceMetadata": "https://example.org/giai/4000001111",
                  "rawData": "https://example.org/giai/401234599999"
                }
              ]
            }
          ]
        },
        {
          "@type": "AssociationEvent",
          "eventTime": "2021-03-12T14:00:00.000Z",
          "eventTimeZoneOffset": "-04:00",
          "parentID": "urn:epc:id:sgtin:0614141.107346.2020",
          "childEPCs": [
            "urn:epc:id:sgtin:0614141.107346.2018"
          ],
          "action": "ADD",
          "bizStep": "urn:epcglobal:cbv:bizstep:packing",
          "readPoint": {
            "id": "urn:epc:id:sgln:0614141.00001.0"
          }
        }
      ]
    }
  }`;

  let parser: EPCIS20JsonLdParser;

  beforeEach(() => {
    parser = new EPCIS20JsonLdParser(sampleJson);
  });

  test('should parse EPCIS 2.0 JSON-LD document', async () => {
    const result = await parser.getDocument();
    expect(result).toBeDefined();
  });

  test('should extract events from EPCIS document', async () => {
    const events = await parser.getEventList();
    expect(events).toHaveLength(2);
    
    // Check ObjectEvent
    expect(events[0].type).toBe('ObjectEvent');
    expect(events[0].eventTime).toBe('2021-03-12T13:00:00.000Z');
    expect(events[0].action).toBe('OBSERVE');
    expect(events[0].bizStep).toBe('urn:epcglobal:cbv:bizstep:shipping');
    expect(events[0].epcList).toHaveLength(2);
    expect(events[0].epcList?.[0]).toBe('urn:epc:id:sgtin:0614141.107346.2017');
    
    // Check EPCIS 2.0 specific fields
    expect(events[0].persistentDisposition).toBeDefined();
    expect(events[0].persistentDisposition?.set).toContain('urn:epcglobal:cbv:disp:in_transit');
    expect(events[0].sensorElementList).toBeDefined();
    
    // Check AssociationEvent (new in EPCIS 2.0)
    expect(events[1].type).toBe('AssociationEvent');
    expect(events[1].eventTime).toBe('2021-03-12T14:00:00.000Z');
    expect(events[1].action).toBe('ADD');
    expect(events[1].parentID).toBe('urn:epc:id:sgtin:0614141.107346.2020');
  });

  test('should extract master data from EPCIS document', async () => {
    const masterData = await parser.getMasterData();
    expect(Object.keys(masterData)).toHaveLength(1);
    
    const locationData = masterData['urn:epc:id:sgln:0614141.00001.0'];
    expect(locationData).toBeDefined();
    expect(locationData.type).toBe('urn:epcglobal:epcis:vtype:Location');
    expect(locationData.attributes?.['urn:epcglobal:cbv:mda:site']).toBe('Warehouse 1');
    expect(locationData.attributes?.['urn:epcglobal:cbv:mda:city']).toBe('New York');
  });

  test('should extract header from EPCIS document', async () => {
    const header = await parser.getEPCISHeader();
    expect(header).toBeDefined();
    expect(header.standardVersion).toBe('2.0');
    expect(header.documentIdentification?.instanceIdentifier).toBe('Test-Instance-ID');
  });

  test('should extract sender information from EPCIS document', async () => {
    const sender = await parser.getSender();
    expect(sender).toBeDefined();
    expect(sender.identifier).toBe('urn:epc:id:sgln:0614141.00001.0');
    expect(sender.name).toBe('John Doe');
  });

  test('should extract receiver information from EPCIS document', async () => {
    const receiver = await parser.getReceiver();
    expect(receiver).toBeDefined();
    expect(receiver.identifier).toBe('urn:epc:id:sgln:0614142.00001.0');
    expect(receiver.name).toBe('Jane Smith');
  });

  test('should validate EPCIS document', async () => {
    const validation = await parser.isValid();
    expect(validation.valid).toBe(true);
  });

  test('should handle invalid JSON document', async () => {
    const invalidJson = '{invalid: json}';
    
    try {
      const invalidParser = new EPCIS20JsonLdParser(invalidJson, { validationOptions: { throwOnError: true } });
      await invalidParser.getDocument();
      expect.fail('Should have thrown an error for invalid JSON');
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ValidationError);
    }
  });

  test('should handle missing required fields', async () => {
    const missingFieldsJson = `{
      "@context": "https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld",
      "type": "EPCISDocument",
      "schemaVersion": "2.0",
      "creationDate": "2021-03-12T17:00:00.000Z",
      "epcisBody": {
        "eventList": [
          {
            "@type": "ObjectEvent",
            "eventTime": "2021-03-12T13:00:00.000Z",
            "eventTimeZoneOffset": "-04:00",
            "epcList": [
              "urn:epc:id:sgtin:0614141.107346.2017"
            ]
            /* Missing required 'action' field */
          }
        ]
      }
    }`;
    
    const parserWithMissingFields = new EPCIS20JsonLdParser(missingFieldsJson, { validate: true });
    const events = await parserWithMissingFields.getEventList();
    
    // Should still parse but missing the action field
    expect(events).toHaveLength(1);
    expect(events[0].action).toBeUndefined();
    
    // Validation should fail
    const validation = await parserWithMissingFields.isValid();
    expect(validation.valid).toBe(false);
  });
});
