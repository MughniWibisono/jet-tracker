/**
 * Parse raw text from a Sea Freight FCL Arrival Cartage Advice document.
 * Returns an object with extracted shipment data.
 */

const PORT_TO_CITY = {
  'AUBNE': 'Brisbane',
  'AUMEL': 'Melbourne',
  'AUSYD': 'Sydney',
  'AUFRE': 'Fremantle',
  'AUADL': 'Adelaide',
};

/**
 * Convert a date string like "20-Mar-26" or "16-Feb-26" to "YYYY-MM-DD" format.
 */
function parseDate(dateStr) {
  if (!dateStr) return '';
  const cleaned = dateStr.trim();

  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };

  // Match patterns like "20-Mar-26" or "16-Feb-26"
  const match = cleaned.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthStr = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
    const month = months[monthStr];
    if (!month) return '';
    let year = match[3];
    if (year.length === 2) {
      year = '20' + year;
    }
    return `${year}-${month}-${day}`;
  }

  return '';
}

/**
 * Extract container rows from text.
 * Container numbers follow the pattern: 4 letters + 7 digits (e.g. FBIU5261833)
 * They appear in lines like: FBIU5261833  40HC FCL  30,215.000  3,980.000  24.000
 */
function extractContainers(text) {
  const containers = [];
  // Match container lines in the CONTAINER section
  const containerPattern = /([A-Z]{4}\d{7})\s+([\w]+\s+FCL)\s/g;
  let match;
  while ((match = containerPattern.exec(text)) !== null) {
    containers.push({
      containerNo: match[1],
      containerType: match[2].trim(),
    });
  }
  return containers;
}

/**
 * Main parser function.
 * @param {string} text - Raw pasted text from the cartage advice PDF
 * @returns {{ success: boolean, data: object|null, error: string|null }}
 */
export function parseCartageAdvice(text) {
  if (!text || text.trim().length === 0) {
    return { success: false, data: null, error: 'No text provided.' };
  }

  try {
    const result = {};

    // --- Shipment Reference (Nusa Ref) ---
    // Pattern: SHIPMENT\nS00010691 or SHIPMENT S00010691
    const shipmentMatch = text.match(/SHIPMENT\s*\n?\s*(S\d{6,})/i);
    if (shipmentMatch) {
      result.nusaRef = shipmentMatch[1].trim();
    }

    // --- Consol Reference ---
    const consolMatch = text.match(/CONSOL\s*\n?\s*(C\d{6,})/i);
    if (consolMatch) {
      result.consolRef = consolMatch[1].trim();
    }

    // --- Order Number / Jet Reference ---
    // Appears after "ORDER NUMBERS / REFERENCE" line
    const orderMatch = text.match(/ORDER\s+NUMBERS?\s*\/?\s*REFERENCE\s*\n?\s*([\d\-]+)/i);
    if (orderMatch) {
      result.jetRef = orderMatch[1].trim();
    }

    // --- ETA (destination) ---
    // Look for ETA in the routing table - get the destination ETA
    // Pattern in ORIGIN/DESTINATION section: ETA followed by date
    const etaMatches = text.match(/ETA\s*\n?\s*(\d{1,2}-[A-Za-z]{3}-\d{2,4})/g);
    if (etaMatches && etaMatches.length > 0) {
      // Take the last ETA which is typically the destination ETA
      const lastEta = etaMatches[etaMatches.length - 1];
      const dateMatch = lastEta.match(/(\d{1,2}-[A-Za-z]{3}-\d{2,4})/);
      if (dateMatch) {
        result.eta = parseDate(dateMatch[1]);
      }
    }

    // --- ETD ---
    const etdMatches = text.match(/ETD\s*\n?\s*(\d{1,2}-[A-Za-z]{3}-\d{2,4})/g);
    if (etdMatches && etdMatches.length > 0) {
      const lastEtd = etdMatches[etdMatches.length - 1];
      const dateMatch = lastEtd.match(/(\d{1,2}-[A-Za-z]{3}-\d{2,4})/);
      if (dateMatch) {
        result.etd = parseDate(dateMatch[1]);
      }
    }

    // --- Destination (port code to city) ---
    // Look for Australian port codes: AUBNE, AUMEL, AUSYD, AUFRE, AUADL
    const destMatch = text.match(/Disch\.\s*\n?\s*.*?(AU[A-Z]{3})/i) ||
                      text.match(/(AU(?:BNE|MEL|SYD|FRE|ADL))\s*=\s*/);
    if (destMatch) {
      const portCode = destMatch[1].toUpperCase();
      result.destination = PORT_TO_CITY[portCode] || portCode;
      result.portCode = portCode;
    }

    // --- Vessel / Voyage ---
    const vesselMatch = text.match(/(?:Vessel\s*\/\s*Voyage\s*\/\s*IMO.*?\n|SEA\s+)([\w\s]+?)\s*\/\s*([\w]+)\s*\/\s*(\d+)/i);
    if (vesselMatch) {
      result.vessel = vesselMatch[1].trim();
      result.voyage = vesselMatch[2].trim();
      result.imo = vesselMatch[3].trim();
    }

    // --- Carrier ---
    const carrierMatch = text.match(/CARRIER\s*\n?\s*(.+?)(?:\n|ORDER)/i) ||
                         text.match(/OCEAN NETWORK EXPRESS\s*\([\s\S]*?\)\s*PTY\s*LTD/i);
    if (carrierMatch) {
      // Clean up multi-line carrier names
      let carrier = carrierMatch[0] || carrierMatch[1];
      carrier = carrier.replace(/CARRIER\s*/i, '').replace(/ORDER.*$/i, '').trim();
      // Reassemble multi-line carrier
      carrier = carrier.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
      result.carrier = carrier;
    }

    // --- Consignor ---
    const consignorMatch = text.match(/CONSIGNOR\s*\n?\s*CONSIGNEE\s*\n?\s*(.+?)(?:\n)/i);
    if (consignorMatch) {
      result.consignor = consignorMatch[1].trim();
    }

    // --- Consignee ---
    const consigneeSection = text.match(/CONSIGNEE\s*\n?\s*(?:.*?\n)?\s*(JET\s+TECHNOLOGIES.*?)(?:\n)/i);
    if (consigneeSection) {
      result.consignee = consigneeSection[1].trim();
    }

    // --- Goods Description ---
    const goodsMatch = text.match(/GOODS\s+DESCRIPTION\s*\n?\s*.*?\n?\s*(.+?)(?:\s*OCEAN\s+BILL|\n.*?BILL)/i);
    if (goodsMatch) {
      result.goodsDescription = goodsMatch[1].trim();
    }

    // --- Ocean Bill of Lading ---
    const oblMatch = text.match(/OCEAN\s+BILL\s+OF\s+LADING\s*\n?\s*.*?\n?\s*([A-Z0-9]+)/i);
    if (oblMatch) {
      result.oceanBOL = oblMatch[1].trim();
    }

    // --- Packages / Weight / Volume ---
    const packagesMatch = text.match(/(\d+)\s+PKG\s*\(OUTER\)/i);
    if (packagesMatch) {
      result.packages = packagesMatch[1];
    }

    const weightMatch = text.match(/([\d,]+\.?\d*)\s*KG/i);
    if (weightMatch) {
      result.weight = weightMatch[1].replace(/,/g, '');
    }

    const volumeMatch = text.match(/([\d,]+\.?\d*)\s*M3/i);
    if (volumeMatch) {
      result.volume = volumeMatch[1].replace(/,/g, '');
    }

    // --- Containers ---
    result.containers = extractContainers(text);

    // --- Handling/Delivery Instructions ---
    const handlingMatch = text.match(/HANDLING\/DELIVERY\s+INSTRUCTIONS\s*\n?\s*(.+?)(?:\n|WAREHOUSING)/i);
    if (handlingMatch) {
      result.deliveryInstructions = handlingMatch[1].trim();
    }

    // --- Delivery address ---
    const deliverToMatch = text.match(/DELIVER\s+TO\s+FULL\s*\n?\s*.*?\n?\s*(.*?)(?:\n)/i);
    if (deliverToMatch) {
      result.deliverTo = deliverToMatch[1].trim();
    }

    // Validate minimum required fields
    const hasShipmentRef = !!result.nusaRef;
    const hasContainers = result.containers && result.containers.length > 0;

    if (!hasShipmentRef && !hasContainers) {
      return {
        success: false,
        data: result,
        error: 'Could not extract shipment reference or containers from the text. Please check the pasted text format.'
      };
    }

    return { success: true, data: result, error: null };

  } catch (err) {
    return {
      success: false,
      data: null,
      error: `Parsing error: ${err.message}`
    };
  }
}
