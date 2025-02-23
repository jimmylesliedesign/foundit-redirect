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
      const email = session.customer_details.email;
      const shippingDetails = session.shipping_details;
      
      if (!email || !shippingDetails) {
        throw new Error('Missing required customer details');
      }

      await createAirtableRecord({
        email,
        shippingName: shippingDetails.name,
        shippingAddress: formatAddress(shippingDetails.address),
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Purchase webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function formatAddress(address) {
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country
  ].filter(Boolean);
  
  return parts.join(', ');
}

function generateTagId() {
  // Generate a random string of 12 characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 12 }, () => 
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}

async function createAirtableRecord({ email, shippingName, shippingAddress }) {
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
  
  const response = await fetch(airtableUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        'TagID': generateTagId(),
        'Status': 'Not Active',
        'Email': email,
        'Shipping Name': shippingName,
        'Shipping Address': shippingAddress,
        'Order Date': new Date().toISOString()
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Airtable create failed: ${response.status}`);
  }
}
