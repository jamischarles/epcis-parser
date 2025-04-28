# EPCIS Parser

A Node.js module for parsing, validating, and visualizing EPCIS 1.2/2.0 XML and JSON-LD files with a consistent API and advanced event data processing capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![ESM Ready](https://img.shields.io/badge/ESM-Ready-brightgreen.svg)](https://nodejs.org/api/esm.html)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-green.svg)](https://vitest.dev/)

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
- **Bidirectional Linking**: Link master data and events with two-way references
- **Sender/Receiver Extraction**: Multiple fallback strategies for extracting sender and receiver info
- **TypeScript & ESM Ready**: Full type definitions and ES modules support
- **Real-world Tested**: Robust parsing of industry standard EPCIS implementations
- **Interactive Demo**: Visualize parsed data with a built-in web interface

## Installation

```bash
npm install epcis-parser
```

## Quick Start

```javascript
// Using ES modules (recommended)
import { createParser } from 'epcis-parser';
import { readFile } from 'fs/promises';

// Read an EPCIS document
const epcisData = await readFile('path/to/your-epcis-document.xml', 'utf8');

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
import { createParser } from 'epcis-parser';
import { readFile } from 'fs/promises';

async function analyzeEvents(filePath) {
  // Read EPCIS document from file
  const epcisData = await readFile(filePath, 'utf-8');
  
  // Create parser - format is auto-detected
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
import { createParser } from 'epcis-parser';
import { readFile } from 'fs/promises';

async function analyzeMasterData(filePath) {
  // Read EPCIS document from file
  const epcisData = await readFile(filePath, 'utf-8');
  
  // Create parser with auto-format detection
  const parser = createParser(epcisData);
  const masterData = await parser.getMasterData();
  
  // Get all business locations
  const businessLocations = Object.values(masterData)
    .filter(item => item.type?.includes('BusinessLocation'));
  
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
  
  // Working with bidirectional links between master data and events
  businessLocations.forEach(location => {
    if (location.relatedEvents && location.relatedEvents.length > 0) {
      console.log(`Location ${location.id} is referenced in ${location.relatedEvents.length} events`);
    }
  });
}
```

### Error Handling

```javascript
import { createParser } from 'epcis-parser';
import { readFile } from 'fs/promises';

async function parseAndValidate(filePath) {
  try {
    // Read EPCIS document from file
    const epcisData = await readFile(filePath, 'utf-8');
    
    // Create parser with validation options
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

The library uses Vitest for fast and efficient testing:

```bash
# Run all tests
npx vitest run

# Run tests in watch mode for development
npx vitest

# Run specific test suites
npx vitest run epcis12XmlParser
npx vitest run masterData

# Run with coverage report
npx vitest run --coverage
```

## License

MIT License

## Bidirectional Linking

One of the library's most powerful features is bidirectional linking between master data and events. 
This creates a navigable network of relationships throughout your EPCIS document:

```javascript
import { createParser } from 'epcis-parser';
import { readFile } from 'fs/promises';

async function analyzeBidirectionalLinks(filePath) {
  const epcisData = await readFile(filePath, 'utf-8');
  const parser = createParser(epcisData);
  
  // Get the full document with bidirectional links
  const document = await parser.getDocument();
  
  // From master data, find related events
  const masterDataWithEvents = Object.values(document.masterData)
    .filter(item => item.relatedEvents?.length > 0);
    
  console.log(`Found ${masterDataWithEvents.length} master data items with linked events`);
  
  // From events, find related master data
  const eventsWithMasterData = document.events
    .filter(event => event.relatedMasterData?.length > 0);
    
  console.log(`Found ${eventsWithMasterData.length} events with linked master data`);
  
  // Example of traversing the bidirectional links
  const locationId = Object.keys(document.masterData).find(id => 
    id.includes(':sgln:') && document.masterData[id].type?.includes('Location')
  );
  
  if (locationId) {
    const location = document.masterData[locationId];
    console.log(`Location: ${location.name || location.id}`);
    
    // Get all events referencing this location
    if (location.relatedEvents) {
      console.log(`Related Events: ${location.relatedEvents.length}`);
      
      // For each related event, get its event time
      for (const eventIndex of location.relatedEvents) {
        const event = document.events[eventIndex];
        console.log(`- ${event.type} at ${event.eventTime}`);
      }
    }
  }
}
```

## Interactive Demo Server

The package includes a built-in web interface for visualizing EPCIS data:

```bash
# Start the demo server
node server.js

# Then open your browser to http://localhost:5000
```

The demo server provides:

- Interactive parsing of EPCIS files (drag and drop any EPCIS file)
- Three-column view (formatted data, parsed JSON, raw data)
- Collapsible UI for exploring complex documents
- Bidirectional linking between master data and events with highlighting
- Automatic XML section extraction for better raw data viewing
- Quick navigation links to different document sections

This interactive interface is particularly useful for:
- Debugging EPCIS implementations
- Exploring the structure of EPCIS documents
- Visualizing relationships between events and master data
- Teaching and learning about EPCIS
- Testing compatibility across different EPCIS formats

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
