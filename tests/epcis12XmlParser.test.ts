/**
 * Tests for EPCIS 1.2 XML Parser
 */
import { describe, expect, test, beforeEach } from 'vitest';
import { EPCIS12XmlParser } from '../src/parsers/epcis12XmlParser';

describe('EPCIS12XmlParser', () => {
  // Sample EPCIS 1.2 XML document for testing
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
  <epcis:EPCISDocument 
    xmlns:epcis="urn:epcglobal:epcis:xsd:1" 
    creationDate="2021-01-21T17:00:00.000Z" 
    schemaVersion="1.2">
    <EPCISHeader>
      <StandardBusinessDocumentHeader>
        <HeaderVersion>1.0</HeaderVersion>
        <DocumentIdentification>
          <Standard>EPCIS</Standard>
          <TypeVersion>1.2</TypeVersion>
          <InstanceIdentifier>Test-Instance-ID</InstanceIdentifier>
          <Type>Events</Type>
          <CreationDateAndTime>2021-01-21T17:00:00.000Z</CreationDateAndTime>
        </DocumentIdentification>
        <Sender>
          <Identifier>urn:epc:id:sgln:0614141.00001.0</Identifier>
          <ContactInformation>
            <Contact>John Doe</Contact>
            <EmailAddress>john.doe@example.com</EmailAddress>
          </ContactInformation>
        </Sender>
        <Receiver>
          <Identifier>urn:epc:id:sgln:0614142.00001.0</Identifier>
          <ContactInformation>
            <Contact>Jane Smith</Contact>
            <EmailAddress>jane.smith@example.com</EmailAddress>
          </ContactInformation>
        </Receiver>
      </StandardBusinessDocumentHeader>
      <extension>
        <EPCISMasterData>
          <VocabularyList>
            <Vocabulary type="urn:epcglobal:epcis:vtype:Location">
              <VocabularyElement id="urn:epc:id:sgln:0614141.00001.0">
                <attribute id="urn:epcglobal:cbv:mda:site">Warehouse 1</attribute>
                <attribute id="urn:epcglobal:cbv:mda:address">123 Main St</attribute>
                <attribute id="urn:epcglobal:cbv:mda:city">New York</attribute>
              </VocabularyElement>
            </Vocabulary>
          </VocabularyList>
        </EPCISMasterData>
      </extension>
    </EPCISHeader>
    <EPCISBody>
      <EventList>
        <ObjectEvent>
          <eventTime>2021-01-21T13:00:00.000Z</eventTime>
          <eventTimeZoneOffset>-04:00</eventTimeZoneOffset>
          <epcList>
            <epc>urn:epc:id:sgtin:0614141.107346.2017</epc>
            <epc>urn:epc:id:sgtin:0614141.107346.2018</epc>
          </epcList>
          <action>OBSERVE</action>
          <bizStep>urn:epcglobal:cbv:bizstep:shipping</bizStep>
          <disposition>urn:epcglobal:cbv:disp:in_transit</disposition>
          <readPoint>
            <id>urn:epc:id:sgln:0614141.00001.0</id>
          </readPoint>
          <bizLocation>
            <id>urn:epc:id:sgln:0614141.00001.0</id>
          </bizLocation>
          <bizTransactionList>
            <bizTransaction type="urn:epcglobal:cbv:btt:po">urn:epc:id:gdti:0614141.00001.1618034</bizTransaction>
          </bizTransactionList>
        </ObjectEvent>
      </EventList>
    </EPCISBody>
  </epcis:EPCISDocument>`;

  let parser: EPCIS12XmlParser;

  beforeEach(() => {
    parser = new EPCIS12XmlParser(sampleXml);
  });

  test('should parse EPCIS 1.2 XML document', async () => {
    const result = await parser.getDocument();
    expect(result).toBeDefined();
  });

  test('should extract events from EPCIS document', async () => {
    const events = await parser.getEventList();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('ObjectEvent');
    expect(events[0].eventTime).toBe('2021-01-21T13:00:00.000Z');
    expect(events[0].action).toBe('OBSERVE');
    expect(events[0].bizStep).toBe('urn:epcglobal:cbv:bizstep:shipping');
    expect(events[0].epcList).toHaveLength(2);
    expect(events[0].epcList?.[0]).toBe('urn:epc:id:sgtin:0614141.107346.2017');
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
    expect(header.standardVersion).toBe('1.2');
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

  test('should handle invalid XML document', async () => {
    const invalidXml = '<invalid>XML</document>';
    
    try {
      const invalidParser = new EPCIS12XmlParser(invalidXml, { validationOptions: { throwOnError: true } });
      await invalidParser.getDocument();
      expect.fail('Should have thrown an error for invalid XML');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test('should handle missing required fields', async () => {
    const missingFieldsXml = `<?xml version="1.0" encoding="UTF-8"?>
    <epcis:EPCISDocument 
      xmlns:epcis="urn:epcglobal:epcis:xsd:1" 
      creationDate="2021-01-21T17:00:00.000Z" 
      schemaVersion="1.2">
      <EPCISBody>
        <EventList>
          <ObjectEvent>
            <eventTime>2021-01-21T13:00:00.000Z</eventTime>
            <eventTimeZoneOffset>-04:00</eventTimeZoneOffset>
            <epcList>
              <epc>urn:epc:id:sgtin:0614141.107346.2017</epc>
            </epcList>
            <!-- Missing required 'action' field -->
          </ObjectEvent>
        </EventList>
      </EPCISBody>
    </epcis:EPCISDocument>`;
    
    // Parse without validation to check parsing still works for incomplete documents
    const parserWithMissingFields = new EPCIS12XmlParser(missingFieldsXml, { validate: false });
    const events = await parserWithMissingFields.getEventList();
    
    // Should still parse but missing the action field
    expect(events).toHaveLength(1);
    expect(events[0].action).toBeUndefined();
  });
});
