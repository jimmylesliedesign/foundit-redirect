export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await request.json();
    
    if (payload.type !== 'checkout.session.completed') {
      return new Response(JSON.stringify({ error: 'Invalid event type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = payload.data.object;
    
    // Verify this is a physical purchase
    if (session.metadata?.type !== 'physical_purchase') {
      return new Response(JSON.stringify({ error: 'Not a physical purchase event' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get purchase details
    const quantity = parseInt(session.metadata.quantity) || 1;
    const shipping = {
      name: session.shipping?.name,
      address: session.shipping?.address
    };

    // Create records in Airtable
    await createAirtableRecords(quantity, shipping, session);
    
    return new Response(JSON.stringify({ 
      received: true, 
      action: 'physical_purchase_processed',
      quantity,
      shipping_name: shipping.name
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Purchase webhook error:', error);
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
  // Define character sets, excluding similar-looking characters
  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghjkmnpqrstuvwxyz';  // no l
  const numbers = '23456789';  // no 0, 1
  const allChars = uppercaseChars + lowercaseChars + numbers;
  
  // Generate 20 bytes of random data
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  
  // Convert to our character set
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += allChars[array[i] % allChars.length];
  }
  
  return id;
}

function formatShippingAddress(address) {
  if (!address) return '';
  
  const addressParts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country
  ];
  
  return addressParts
    .filter(part => part && part.trim())
    .join(', ');
}