const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
// We're going to create our own simplified parser for the demo
// instead of trying to import the ESM module directly
const xml2js = require('xml2js');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS templating
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Get the list of available fixture files
function getFixtureFiles() {
  // Check both attached_assets and fixtures folders
  const attachedPath = path.join(__dirname, 'attached_assets');
  const fixturesPath = path.join(__dirname, 'fixtures');
  
  let files = [];
  
  // Read from attached_assets
  try {
    const attachedFiles = fs.readdirSync(attachedPath);
    files = files.concat(attachedFiles.map(f => ({ name: f, folder: 'attached_assets' })));
  } catch (error) {
    console.log('No attached_assets folder found');
  }
  
  // Read from fixtures
  try {
    const fixtureFiles = fs.readdirSync(fixturesPath);
    files = files.concat(fixtureFiles.map(f => ({ name: f, folder: 'fixtures' })));
  } catch (error) {
    console.log('No fixtures folder found');
  }
  
  // Filter to only include XML and JSON/JSONLD files
  return files.filter(file => 
    file.name.endsWith('.xml') || 
    file.name.endsWith('.json') || 
    file.name.endsWith('.jsonld')
  );
}

// Read fixture content
function readFixture(filename) {
  // Try to read from fixtures folder first, then attached_assets
  const fixturesPath = path.join(__dirname, 'fixtures');
  const attachedPath = path.join(__dirname, 'attached_assets');
  
  try {
    return fs.readFileSync(path.join(fixturesPath, filename), 'utf8');
  } catch (error) {
    // If not found in fixtures, try attached_assets
    return fs.readFileSync(path.join(attachedPath, filename), 'utf8');
  }
}

// Home route
app.get('/', (req, res) => {
  const fixtures = getFixtureFiles();
  res.render('index', { fixtures });
});

// Simple EPCIS XML parser function
async function parseEPCIS(xmlData) {
  // Create a parser with options
  const parser = new xml2js.Parser({
    explicitArray: false,
    mergeAttrs: true,
    attrNameProcessors: [(name) => name.replace(/^epcis:/, '').replace(/^standard:/, '').replace(/^sbdh:/, '')],
    tagNameProcessors: [(name) => name.replace(/^epcis:/, '').replace(/^standard:/, '').replace(/^sbdh:/, '')]
  });
  
  // Parse the XML to JS object
  const result = await parser.parseStringPromise(xmlData);
  
  // Extract the events
  let events = [];
  let masterData = {};
  let header = {};
  let sender = {};
  let receiver = {};

  try {
    // EPCIS document root could be EPCISDocument or EPCISQueryDocument
    const epcisDoc = result.EPCISDocument || result.EPCISQueryDocument || {};
    
    // Extract header information
    if (epcisDoc.EPCISHeader) {
      header = epcisDoc.EPCISHeader;
      
      // Extract sender information (StandardBusinessDocument/Header/Sender)
      if (header.StandardBusinessDocumentHeader && header.StandardBusinessDocumentHeader.Sender) {
        const senderData = header.StandardBusinessDocumentHeader.Sender;
        
        // Extract Identifier which may be a string or an object with '_' property
        if (senderData.Identifier) {
          if (typeof senderData.Identifier === 'string') {
            sender.identifier = senderData.Identifier;
          } else if (senderData.Identifier._ && typeof senderData.Identifier._ === 'string') {
            sender.identifier = senderData.Identifier._;
            if (senderData.Identifier.Authority) {
              sender.authority = senderData.Identifier.Authority;
            }
          } else if (typeof senderData.Identifier === 'object') {
            sender.identifier = JSON.stringify(senderData.Identifier);
          }
        }
        
        // Extract Contact information if available
        if (senderData.ContactInformation && senderData.ContactInformation.Contact) {
          if (typeof senderData.ContactInformation.Contact === 'string') {
            sender.name = senderData.ContactInformation.Contact;
          } else if (senderData.ContactInformation.Contact._ && 
                    typeof senderData.ContactInformation.Contact._ === 'string') {
            sender.name = senderData.ContactInformation.Contact._;
          }
        }
      }
      
      // Extract receiver information (StandardBusinessDocument/Header/Receiver)
      if (header.StandardBusinessDocumentHeader && header.StandardBusinessDocumentHeader.Receiver) {
        const receiverData = header.StandardBusinessDocumentHeader.Receiver;
        
        // Extract Identifier which may be a string or an object with '_' property
        if (receiverData.Identifier) {
          if (typeof receiverData.Identifier === 'string') {
            receiver.identifier = receiverData.Identifier;
          } else if (receiverData.Identifier._ && typeof receiverData.Identifier._ === 'string') {
            receiver.identifier = receiverData.Identifier._;
            if (receiverData.Identifier.Authority) {
              receiver.authority = receiverData.Identifier.Authority;
            }
          } else if (typeof receiverData.Identifier === 'object') {
            receiver.identifier = JSON.stringify(receiverData.Identifier);
          }
        }
        
        // Extract Contact information if available
        if (receiverData.ContactInformation && receiverData.ContactInformation.Contact) {
          if (typeof receiverData.ContactInformation.Contact === 'string') {
            receiver.name = receiverData.ContactInformation.Contact;
          } else if (receiverData.ContactInformation.Contact._ && 
                    typeof receiverData.ContactInformation.Contact._ === 'string') {
            receiver.name = receiverData.ContactInformation.Contact._;
          }
        }
      }
    }
    
    // Extract master data
    if (epcisDoc.EPCISHeader && epcisDoc.EPCISHeader.extension && 
        epcisDoc.EPCISHeader.extension.EPCISMasterData) {
      
      const masterDataList = epcisDoc.EPCISHeader.extension.EPCISMasterData;
      
      // Process vocabulary lists
      if (masterDataList.VocabularyList && masterDataList.VocabularyList.Vocabulary) {
        const vocabularies = Array.isArray(masterDataList.VocabularyList.Vocabulary) ? 
          masterDataList.VocabularyList.Vocabulary : [masterDataList.VocabularyList.Vocabulary];
        
        vocabularies.forEach(vocabulary => {
          if (vocabulary.VocabularyElementList && vocabulary.VocabularyElementList.VocabularyElement) {
            const elements = Array.isArray(vocabulary.VocabularyElementList.VocabularyElement) ? 
              vocabulary.VocabularyElementList.VocabularyElement : [vocabulary.VocabularyElementList.VocabularyElement];
            
            elements.forEach(element => {
              // Use the id as the key
              const id = element.id;
              if (id) {
                // Process attributes and transform any '_' keys to 'value'
                let processedAttributes = {};
                if (element.attribute) {
                  // Handle both array and object formats for attributes
                  const attributes = Array.isArray(element.attribute) ? element.attribute : [element.attribute];
                  
                  // Process each attribute
                  attributes.forEach(attr => {
                    // Use the attribute id as the key if available
                    const attrId = attr.id || 'unnamed';
                    
                    // Check if attribute has a text value or is a complex object
                    if (typeof attr === 'string') {
                      // Simple string value
                      processedAttributes[attrId] = attr;
                    } else if (attr._ !== undefined) {
                      // Object with an underscore property for the value
                      processedAttributes[attrId] = {
                        value: attr._,
                        // Preserve other properties
                        ...Object.fromEntries(
                          Object.entries(attr).filter(([k]) => k !== '_')
                        )
                      };
                    } else {
                      // Other object format, keep as is
                      processedAttributes[attrId] = attr;
                    }
                  });
                }
                
                masterData[id] = {
                  id,
                  type: vocabulary.type,
                  attributes: processedAttributes,
                  children: []
                };
                
                // Add name if available in attributes
                if (processedAttributes['urn:epcglobal:cbv:mda#name']) {
                  const nameAttr = processedAttributes['urn:epcglobal:cbv:mda#name'];
                  masterData[id].name = typeof nameAttr === 'object' ? nameAttr.value : nameAttr;
                } else if (processedAttributes['name']) {
                  const nameAttr = processedAttributes['name'];
                  masterData[id].name = typeof nameAttr === 'object' ? nameAttr.value : nameAttr;
                }
              }
            });
          }
        });
      }
    }
    
    // Extract events
    if (epcisDoc.EPCISBody && epcisDoc.EPCISBody.EventList) {
      const eventList = epcisDoc.EPCISBody.EventList;
      
      // Process different event types
      const eventTypes = [
        'ObjectEvent', 
        'AggregationEvent', 
        'TransactionEvent', 
        'TransformationEvent', 
        'AssociationEvent',
        'QuantityEvent' // Legacy event type in 1.2
      ];
      
      eventTypes.forEach(type => {
        if (eventList[type]) {
          const typeEvents = Array.isArray(eventList[type]) ? eventList[type] : [eventList[type]];
          
          typeEvents.forEach(event => {
            // Add the event type
            event.type = type;
            
            // Process epcList to make it an array if it's not already
            if (event.epcList && !Array.isArray(event.epcList)) {
              if (event.epcList.epc) {
                event.epcList = Array.isArray(event.epcList.epc) ? event.epcList.epc : [event.epcList.epc];
              } else {
                event.epcList = [];
              }
            }
            
            // Process childEPCs to make it an array if it's not already
            if (event.childEPCs && !Array.isArray(event.childEPCs)) {
              if (event.childEPCs.epc) {
                event.childEPCs = Array.isArray(event.childEPCs.epc) ? event.childEPCs.epc : [event.childEPCs.epc];
              } else {
                event.childEPCs = [];
              }
            }
            
            // Process bizTransactionList to make it an array
            if (event.bizTransactionList && !Array.isArray(event.bizTransactionList)) {
              if (event.bizTransactionList.bizTransaction) {
                const bizTxns = Array.isArray(event.bizTransactionList.bizTransaction) ? 
                  event.bizTransactionList.bizTransaction : [event.bizTransactionList.bizTransaction];
                
                event.bizTransactionList = bizTxns.map(tx => {
                  // Handle type as attribute or property
                  const txType = tx.type || '';
                  const txValue = tx._ || tx;
                  return {
                    type: txType,
                    value: typeof txValue === 'string' ? txValue : JSON.stringify(txValue)
                  };
                });
              } else {
                event.bizTransactionList = [];
              }
            }
            
            // Add the event to the events array
            events.push(event);
          });
        }
      });
    }
  } catch (err) {
    console.error('Error parsing EPCIS data:', err);
  }
  
  // Analyze master data and events to establish links based on matching identifier patterns
  const linkedData = linkMasterDataToEvents(masterData, events);
  
  return {
    events,
    masterData: linkedData,
    header,
    sender,
    receiver
  };
}

/**
 * Links master data to related events and vice versa by matching GS1 identifier patterns
 * @param {Object} masterData The master data objects
 * @param {Array} events The list of events
 * @returns {Object} Enhanced data with two-way links between master data and events
 */
function linkMasterDataToEvents(masterData, events) {
  const linkedMasterData = { ...masterData };
  const linkedEvents = [...events]; // Create a copy of events to modify
  
  // Create a mapping of company prefixes to master data IDs
  const prefixToMasterDataMap = new Map();
  
  // Process each master data entry to extract patterns
  for (const [id, item] of Object.entries(linkedMasterData)) {
    // Extract the company prefix pattern from the ID
    // GS1 identifiers often have this format: urn:epc:id:(sgln|sgtin|sscc|etc):companyPrefix.locationRef.extension
    const match = id.match(/:[0-9]+\.([0-9]+)\.?/);
    if (!match) continue; // No pattern found
    
    const prefixPattern = match[0]; // Like ":0355154.094495."
    const companyPrefix = match[1]; // Just the numeric part like "094495"
    
    // Store in our mapping for quick lookup
    prefixToMasterDataMap.set(prefixPattern, id);
    prefixToMasterDataMap.set(companyPrefix, id);
    
    // Initialize arrays for related EPCs and events
    linkedMasterData[id].relatedEPCs = linkedMasterData[id].relatedEPCs || [];
    linkedMasterData[id].relatedEvents = linkedMasterData[id].relatedEvents || [];
  }
  
  // Now scan through the events to link them to master data
  linkedEvents.forEach((event, eventIndex) => {
    // Initialize array for related master data
    event.relatedMasterData = event.relatedMasterData || [];
    
    // Track which master data items are related to this event
    const relatedMasterDataIds = new Set();
    
    // Helper function to check an EPC and update links
    const checkAndLinkEPC = (epc) => {
      if (!epc) return;
      
      // Check this EPC against all our known prefixes
      for (const [prefix, masterDataId] of prefixToMasterDataMap.entries()) {
        if (epc.includes(prefix)) {
          // Add this master data ID to the event's related list
          relatedMasterDataIds.add(masterDataId);
          
          // Add this EPC to the master data's related list
          if (!linkedMasterData[masterDataId].relatedEPCs.includes(epc)) {
            linkedMasterData[masterDataId].relatedEPCs.push(epc);
          }
          
          // Make sure the event is listed in the master data's related events
          const eventExists = linkedMasterData[masterDataId].relatedEvents.some(
            relEvent => relEvent.eventIndex === eventIndex
          );
          
          if (!eventExists) {
            linkedMasterData[masterDataId].relatedEvents.push({
              eventIndex,
              eventType: event.type,
              eventTime: event.eventTime
            });
          }
        }
      }
    };
    
    // Check various EPC fields in the event
    // Check epcList
    if (event.epcList && Array.isArray(event.epcList)) {
      event.epcList.forEach(checkAndLinkEPC);
    }
    
    // Check childEPCs
    if (event.childEPCs && Array.isArray(event.childEPCs)) {
      event.childEPCs.forEach(checkAndLinkEPC);
    }
    
    // Check parent ID
    if (event.parentID) {
      checkAndLinkEPC(event.parentID);
    }
    
    // Add the related master data IDs to the event
    event.relatedMasterData = [...relatedMasterDataIds].map(id => ({
      id,
      name: linkedMasterData[id].name || '',
      type: linkedMasterData[id].type || 'unknown'
    }));
  });
  
  // Ensure all master data items have unique EPCs without duplicates
  for (const id in linkedMasterData) {
    if (linkedMasterData[id].relatedEPCs) {
      linkedMasterData[id].relatedEPCs = [...new Set(linkedMasterData[id].relatedEPCs)];
    }
  }
  
  // Update the original events array with our linked events
  for (let i = 0; i < events.length; i++) {
    events[i] = linkedEvents[i];
  }
  
  return linkedMasterData;
}

// Parse EPCIS data
app.post('/parse', async (req, res) => {
  try {
    const { fixtureFile } = req.body;
    const data = readFixture(fixtureFile);
    
    // Parse the data
    const parsed = await parseEPCIS(data);
    
    // Return the parsed data
    res.json({
      raw: data,
      parsed
    });
  } catch (error) {
    console.error('Parsing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});