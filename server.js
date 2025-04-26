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
  const fixturesPath = path.join(__dirname, 'attached_assets');
  const files = fs.readdirSync(fixturesPath);
  return files.filter(file => file.endsWith('.xml') || file.endsWith('.json'));
}

// Read fixture content
function readFixture(filename) {
  const fixturesPath = path.join(__dirname, 'attached_assets');
  return fs.readFileSync(path.join(fixturesPath, filename), 'utf8');
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
    attrNameProcessors: [(name) => name.replace(/^epcis:/, '').replace(/^standard:/, '')],
    tagNameProcessors: [(name) => name.replace(/^epcis:/, '').replace(/^standard:/, '')]
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
        sender = header.StandardBusinessDocumentHeader.Sender;
      }
      
      // Extract receiver information (StandardBusinessDocument/Header/Receiver)
      if (header.StandardBusinessDocumentHeader && header.StandardBusinessDocumentHeader.Receiver) {
        receiver = header.StandardBusinessDocumentHeader.Receiver;
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
                masterData[id] = {
                  id,
                  type: vocabulary.type,
                  attributes: element.attribute ? element.attribute : {},
                  children: []
                };
                
                // Add name if available
                if (element.attribute && element.attribute.name) {
                  masterData[id].name = element.attribute.name;
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
  
  return {
    events,
    masterData,
    header,
    sender,
    receiver
  };
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