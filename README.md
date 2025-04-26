# EPCIS Parser

A Node.js module for parsing and validating EPCIS 1.2/2.0 XML and JSON-LD files with a consistent API.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/Coverage-Comprehensive-green.svg)](https://github.com/your-username/epcis-parser/actions)

## Introduction

The EPCIS Parser is a powerful library for working with EPCIS (Electronic Product Code Information Services) documents in supply chain management. EPCIS is a GS1 standard for tracking and sharing information about the movement and status of products as they travel through the supply chain.

This library provides a unified API to parse, validate, and extract data from EPCIS documents in all standard formats:

- EPCIS 1.2 XML format (GS1 Standard)
- EPCIS 2.0 XML format (GS1 Standard)
- EPCIS 2.0 JSON-LD format (GS1 Standard)

## Key Features

- **Format Agnostic**: Parse any EPCIS format with the same consistent API
- **Complete Event Support**: Process all EPCIS event types (Object, Aggregation, Transaction, Transformation)
- **Master Data Handling**: Extract and utilize vocabulary elements and attributes
- **Schema Validation**: Validate documents against official EPCIS schemas
- **Extension Support**: Handle vendor-specific extensions and custom data fields
- **TypeScript Ready**: Full type definitions for enhanced developer experience
- **Real-world Tested**: Robust parsing of industry standard EPCIS implementations
- **Zero Dependencies**: Minimal external dependencies for better security and smaller footprint

## Installation

```bash
npm install epcis-parser
```

## Quick Start

```javascript
const { createParser } = require('epcis-parser');
// Or using ES modules
// import { createParser } from 'epcis-parser';

// Read an EPCIS document
const fs = require('fs');
const epcisData = fs.readFileSync('path/to/your-epcis-document.xml', 'utf8');

// Create a parser - format is auto-detected
const parser = createParser(epcisData, { validate: true });

// Get all events from the document
async function processEvents() {
  try {
    // Check if document is valid
    const validation = await parser.isValid();
    if (!validation.valid) {
      console.error('EPCIS document validation failed:', validation.errors);
      return;
    }
    
    // Extract events
    const events = await parser.getEventList();
    console.log(`Found ${events.length} events`);
    
    // Process specific event types
    const objectEvents = events.filter(e => e.type === 'ObjectEvent');
    const aggregationEvents = events.filter(e => e.type === 'AggregationEvent');
    
    console.log(`Object events: ${objectEvents.length}`);
    console.log(`Aggregation events: ${aggregationEvents.length}`);
    
    // Access master data
    const masterData = await parser.getMasterData();
    console.log(`Master data items: ${Object.keys(masterData).length}`);
    
    // Get document header information
    const header = await parser.getEPCISHeader();
    if (header.documentIdentification?.creationDateTime) {
      console.log(`Document created: ${header.documentIdentification.creationDateTime}`);
    }
  } catch (error) {
    console.error('Error processing EPCIS document:', error);
  }
}

processEvents();
```

## API Reference

### Factory Function

#### `createParser(data: string, options?: ParserOptions): EPCISParser`

Creates the appropriate parser instance based on the input document format.

**Parameters:**
- `data`: The EPCIS document content as a string
- `options`: (Optional) Configuration options
  - `validate`: Whether to validate the document (default: `true`)
  - `validationOptions.throwOnError`: Whether to throw on validation failures (default: `true`)

**Returns:**
An instance implementing the `EPCISParser` interface.

### Parser Interface

All parsers implement the `EPCISParser` interface:

#### `getEventList(): Promise<EPCISEvent[]>`
Retrieves all events from the EPCIS document.

#### `getMasterData(): Promise<Record<string, MasterData>>`
Retrieves all master data/vocabulary elements from the document.

#### `getEPCISHeader(): Promise<EPCISHeader>`
Retrieves document header information.

#### `getSender(): Promise<Sender>`
Retrieves sender information from the document.

#### `getReceiver(): Promise<Receiver>`
Retrieves receiver information from the document.

#### `isValid(): Promise<ValidationResult>`
Validates the document against the appropriate schema.

#### `getDocument(): Promise<EPCISDocument>`
Retrieves the complete parsed document with all components.

### Specific Parser Classes

For cases where you know the exact format:

#### `EPCIS12XmlParser`
Specifically for EPCIS 1.2 XML documents.

#### `EPCIS20XmlParser`
Specifically for EPCIS 2.0 XML documents.

#### `EPCIS20JsonLdParser`
Specifically for EPCIS 2.0 JSON-LD documents.

## Working with EPCIS Events

The library extracts all EPCIS events with their specific properties:

### Event Types
- `ObjectEvent`: Events relating to objects/items
- `AggregationEvent`: Events relating to containment relationships
- `TransactionEvent`: Events relating to business transactions
- `TransformationEvent`: Events relating to transformation/manufacturing

### Common Event Properties

All events include:
- `type`: The event type identifier
- `eventTime`: When the event occurred
- `eventTimeZoneOffset`: Time zone information
- `action`: The action taken (ADD, OBSERVE, DELETE)
- `bizStep`: The business step (e.g., shipping, receiving)
- `disposition`: Status (e.g., in_progress, destroyed)
- `readPoint`: The read point location
- `bizLocation`: The business location

Event type-specific fields are also available.

## Examples

### Extracting Different Event Types

```javascript
const { createParser } = require('epcis-parser');

async function analyzeEvents(epcisData) {
  const parser = createParser(epcisData);
  const events = await parser.getEventList();
  
  // Filter by event type
  const objectEvents = events.filter(e => e.type === 'ObjectEvent');
  const aggregationEvents = events.filter(e => e.type === 'AggregationEvent');
  const transactionEvents = events.filter(e => e.type === 'TransactionEvent');
  const transformationEvents = events.filter(e => e.type === 'TransformationEvent');
  
  // Filter by business step
  const shippingEvents = events.filter(e => 
    e.bizStep === 'urn:epcglobal:cbv:bizstep:shipping'
  );
  const receivingEvents = events.filter(e => 
    e.bizStep === 'urn:epcglobal:cbv:bizstep:receiving'
  );
  
  // Filter by disposition
  const inProgressEvents = events.filter(e => 
    e.disposition === 'urn:epcglobal:cbv:disp:in_progress'
  );
  
  // Working with EPCs in ObjectEvents
  const epcLists = objectEvents
    .map(e => e.epcList || [])
    .flat();
  
  console.log(`Found ${epcLists.length} unique EPCs in ObjectEvents`);
  
  // Working with parent-child relationships in AggregationEvents
  aggregationEvents.forEach(event => {
    console.log(`Parent: ${event.parentID}`);
    console.log(`Children: ${event.childEPCs?.length || 0} items`);
  });
}
```

### Working with Master Data

```javascript
const { createParser } = require('epcis-parser');

async function analyzeMasterData(epcisData) {
  const parser = createParser(epcisData);
  const masterData = await parser.getMasterData();
  
  // Get all business locations
  const businessLocations = Object.values(masterData)
    .filter(item => item.type.includes('BusinessLocation'));
  
  console.log(`Found ${businessLocations.length} business locations`);
  
  // Find locations with specific attributes
  const retailLocations = businessLocations.filter(location => 
    location.attributes && 
    Object.keys(location.attributes).some(key => key.includes('retail'))
  );
  
  console.log(`Found ${retailLocations.length} retail locations`);
  
  // Examine location hierarchy
  businessLocations.forEach(location => {
    if (location.children && location.children.length > 0) {
      console.log(`Location ${location.id} has ${location.children.length} sub-locations`);
    }
  });
}
```

### Error Handling

```javascript
const { createParser } = require('epcis-parser');

async function parseAndValidate(epcisData) {
  try {
    const parser = createParser(epcisData, {
      validate: true,
      validationOptions: {
        throwOnError: false // Get validation errors without throwing
      }
    });
    
    // Validate the document
    const validation = await parser.isValid();
    
    if (!validation.valid) {
      console.error('Validation errors:');
      validation.errors.forEach(error => console.error(`- ${error}`));
      return null;
    }
    
    // If valid, proceed with parsing
    return await parser.getDocument();
  } catch (error) {
    console.error('Parsing failed:', error.message);
    return null;
  }
}
```

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-username/epcis-parser.git
cd epcis-parser

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Running Tests

The library includes extensive tests for all parsers:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=epcis12XmlParser
npm test -- --testPathPattern=masterData
```

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
