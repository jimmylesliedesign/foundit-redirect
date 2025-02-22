async function generateSecureTagId() {
  // Define character sets, excluding similar-looking characters
  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const allChars = uppercaseChars + lowercaseChars + numbers;
  
  // Calculate how many bits of entropy we need per character
  // log2(allChars.length) gives us bits per character
  const bitsPerChar = Math.log2(allChars.length);
  
  // Generate enough random bytes for 16 characters
  // We'll use 16 chars instead of 12 for more uniqueness
  const numBytes = Math.ceil((16 * bitsPerChar) / 8);
  const randomBytes = new Uint8Array(numBytes);
  crypto.getRandomValues(randomBytes);
  
  let id = '';
  let bitsUsed = 0;
  let currentByte = 0;
  
  // Generate ID using unbiased bit extraction
  while (id.length < 16) {
    if (bitsUsed > 8) {
      currentByte++;
      bitsUsed = 0;
    }
    
    // Use current byte as index, but only if it's within valid range
    const index = randomBytes[currentByte] % allChars.length;
    
    // Only use the result if it's unbiased
    if (randomBytes[currentByte] < (Math.floor(256 / allChars.length) * allChars.length)) {
      id += allChars[index];
    }
    
    bitsUsed += bitsPerChar;
  }
  
  // Add collision check with Airtable
  const isDuplicate = await checkForDuplicate(id);
  if (isDuplicate) {
    // Recursively generate new ID if duplicate found
    return generateSecureTagId();
  }
  
  return id;
}

async function checkForDuplicate(tagId) {
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
  const filterFormula = encodeURIComponent(`{TagID}='${tagId}'`);
  
  const response = await fetch(`${airtableUrl}?filterByFormula=${filterFormula}`, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  return data.records && data.records.length > 0;
}

// Update the createAirtableRecords function to use async generation
async function createAirtableRecords(quantity, shipping, session) {
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
  
  const records = [];
  for (let i = 0; i < quantity; i++) {
    const tagId = await generateSecureTagId(); // Now awaits the secure generation
    records.push({
      fields: {
        'TagID': tagId,
        'Status': 'Not Active',
        'Shipping Name': shipping?.name || '',
        'Shipping Address': formatShippingAddress(shipping?.address),
        'Order Date': new Date().toISOString(),
        'Email': session.customer_details?.email || ''
      }
    });
  }

  const response = await fetch(airtableUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ records })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Airtable create failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}
