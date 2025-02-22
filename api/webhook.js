export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await request.json();
    
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;

      // Handle physical product purchase
      if (session.metadata?.type === 'physical_purchase') {
        try {
          // Default to 1 if quantity not specified
          const quantity = parseInt(session.metadata.quantity) || 1;
          
          // Get shipping details from the correct location
          const shipping = {
            name: session.shipping?.name,
            address: session.shipping?.address
          };

          await createAirtableRecords(quantity, shipping, session);
          
          return new Response(JSON.stringify({ received: true, action: 'physical_purchase_processed' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: `Physical purchase processing failed: ${error.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } 
      // Handle tag activation (existing logic)
      else if (session.client_reference_id) {
        const tagId = session.client_reference_id;
        const email = session.customer_details.email;
        
        if (tagId) {
          await updateAirtableRecord(tagId, email);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function createAirtableRecords(quantity, shipping, session) {
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
  
  const records = [];
  for (let i = 0; i < quantity; i++) {
    records.push({
      fields: {
        'TagID': generateTagId(),
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

function generateTagId() {
  // Define a character set including uppercase, lowercase, numbers
  // Excluding similar-looking characters (0, O, 1, l, I) to avoid confusion
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  
  // Generate 20 bytes of random data
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  
  // Convert to our character set
  let id = '';
  for (let i = 0; i < 12; i++) {
    // Use modulo to map the random bytes to our charset
    id += charset[array[i] % charset.length];
  }
  
  return id;
}

function formatShippingAddress(address) {
  if (!address) return '';
  
  // Create formatted address parts
  const addressParts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country
  ];
  
  // Filter out null/empty values and join with commas and spaces
  return addressParts
    .filter(part => part && part.trim()) // Remove empty/null/whitespace values
    .join(', ');
}
