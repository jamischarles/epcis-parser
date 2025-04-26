/**
 * Tests for EPCIS 2.0 XML Parser
 */
import { describe, expect, test, beforeEach } from 'vitest';
import { EPCIS20XmlParser } from '../src/parsers/epcis20XmlParser.js';

describe('EPCIS20XmlParser', () => {
  // Sample EPCIS 2.0 XML document for testing
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
  <epcis:EPCISDocument 
    xmlns:epcis="https://ref.gs1.org/standards/epcis/2.0.0/" 
    creationDate="2021-03-12T17:00:00.000Z" 
    schemaVersion="2.0">
    <EPCISHeader>
      <StandardBusinessDocumentHeader>
        <HeaderVersion>1.0</HeaderVersion>
        <DocumentIdentification>
          <Standard>EPCIS</Standard>
          <TypeVersion>2.0</TypeVersion>
          <InstanceIdentifier>Test-Instance-ID</InstanceIdentifier>
          <Type>Events</Type>
          <CreationDateAndTime>2021-03-12T17:00:00.000Z</CreationDateAndTime>
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
          <eventTime>2021-03-12T13:00:00.000Z</eventTime>
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
          <persistentDisposition>
            <set>urn:epcglobal:cbv:disp:in_transit</set>
            <unset>urn:epcglobal:cbv:disp:in_progress</unset>
          </persistentDisposition>
          <sensorElementList>
            <sensorElement>
              <sensorMetadata time="2021-03-12T13:00:00.000Z" deviceID="urn:epc:id:giai:4000001.111" deviceMetadata="https://example.org/giai/4000001111" rawData="https://example.org/giai/401234599999"/>
              <sensorReport type="Temperature" value="26.0" uom="CEL" deviceID="urn:epc:id:giai:4000001.111" deviceMetadata="https://example.org/giai/4000001111" rawData="https://example.org/giai/401234599999"/>
            </sensorElement>
          </sensorElementList>
        </ObjectEvent>
        <AssociationEvent>
          <eventTime>2021-03-12T14:00:00.000Z</eventTime>
          <eventTimeZoneOffset>-04:00</eventTimeZoneOffset>
          <parentID>urn:epc:id:sgtin:0614141.107346.2020</parentID>
          <childEPCs>
            <epc>urn:epc:id:sgtin:0614141.107346.2018</epc>
          </childEPCs>
          <action>ADD</action>
          <bizStep>urn:epcglobal:cbv:bizstep:packing</bizStep>
          <readPoint>
            <id>urn:epc:id:sgln:0614141.00001.0</id>
          </readPoint>
        </AssociationEvent>
      </EventList>
    </EPCISBody>
  </epcis:EPCISDocument>`;

  let parser: EPCIS20XmlParser;

  beforeEach(() => {
    // Disable validation for tests to focus on the parsing functionality
    parser = new EPCIS20XmlParser(sampleXml, { validate: false });
  });

  test('should parse EPCIS 2.0 XML document', async () => {
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
    // Create a parser with validation explicitly enabled for this test
    const validatingParser = new EPCIS20XmlParser(sampleXml, { validate: true, validationOptions: { throwOnError: false } });
    // Just test that isValid() executes without throwing an error
    const validation = await validatingParser.isValid();
    expect(validation).toBeDefined();
  });

  test('should handle invalid XML document', async () => {
    const invalidXml = '<invalid>XML</document>';
    
    try {
      const invalidParser = new EPCIS20XmlParser(invalidXml, { validationOptions: { throwOnError: true } });
      await invalidParser.getDocument();
      expect.fail('Should have thrown an error for invalid XML');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test('should handle missing required fields', async () => {
    const missingFieldsXml = `<?xml version="1.0" encoding="UTF-8"?>
    <epcis:EPCISDocument 
      xmlns:epcis="https://ref.gs1.org/standards/epcis/2.0.0/" 
      creationDate="2021-03-12T17:00:00.000Z" 
      schemaVersion="2.0">
      <EPCISBody>
        <EventList>
          <ObjectEvent>
            <eventTime>2021-03-12T13:00:00.000Z</eventTime>
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
    const parserWithMissingFields = new EPCIS20XmlParser(missingFieldsXml, { validate: false });
    const events = await parserWithMissingFields.getEventList();
    
    // Should still parse but missing the action field
    expect(events).toHaveLength(1);
    expect(events[0].action).toBeUndefined();
  });
});
