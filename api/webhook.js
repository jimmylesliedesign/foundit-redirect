export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // Debug response to test if we're hitting this handler
  if (request.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'webhook handler responding',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const payload = await request.json();
    console.log('Webhook payload:', payload);
    
    if (payload.type !== 'checkout.session.completed') {
      return new Response(JSON.stringify({ error: 'Invalid event type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = payload.data.object;
    
    // Determine if this is a purchase or activation
    const isPurchase = session.metadata?.type === 'physical_purchase';
    console.log('Processing webhook:', { isPurchase });

    if (isPurchase) {
      return handlePurchase(session);
    } else {
      return handleActivation(session);
    }

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Activation flow - keep exactly as is to avoid any issues
async function handleActivation(session) {
  const tagId = session.client_reference_id;
  const email = session.customer_details?.email;

  if (!tagId || !email) {
    return new Response(JSON.stringify({ 
      error: 'Missing required data for activation',
      tagId: !!tagId,
      email: !!email
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Update Airtable record
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
  const filterFormula = encodeURIComponent(`{TagID}='${tagId}'`);
  
  const response = await fetch(`${airtableUrl}?filterByFormula=${filterFormula}`, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Airtable fetch failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.records?.length) {
    return new Response(JSON.stringify({ 
      error: `No record found for tagId: ${tagId}`
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const record = data.records[0];
  const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        'Status': 'Active',
        'Email': email
      }
    })
  });

  if (!updateResponse.ok) {
    throw new Error(`Airtable update failed: ${updateResponse.status}`);
  }

  return new Response(JSON.stringify({ 
    success: true,
    message: 'Tag activated successfully',
    tagId
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function generateTagId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 12 }, () => 
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}

// Modified purchase flow to handle quantities
async function handlePurchase(session) {
  const email = session.customer_details?.email;
  const shippingDetails = session.shipping;

  if (!email || !shippingDetails) {
    return new Response(JSON.stringify({ 
      error: 'Missing required data for purchase',
      email: !!email,
      shipping: !!shippingDetails
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Determine quantity from metadata or try to fetch it
  let quantity = 1; // Default to 1
  
  // First check if quantity is in metadata (easier approach if you can set this)
  if (session.metadata?.quantity) {
    quantity = parseInt(session.metadata.quantity, 10) || 1;
  } 
  // If no quantity in metadata, try to get it from Stripe API directly
  else {
    try {
      // Only make this API call for purchase flow, not for activation
      const sessionResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session.id}?expand[]=line_items`, {
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (sessionResponse.ok) {
        const fullSession = await sessionResponse.json();
        
        if (fullSession.line_items?.data?.length > 0) {
          quantity = fullSession.line_items.data[0].quantity || 1;
          console.log(`Retrieved quantity from Stripe API: ${quantity}`);
        }
      } else {
        console.error(`Failed to retrieve session from Stripe: ${sessionResponse.status}`);
      }
    } catch (error) {
      console.error(`Error retrieving session from Stripe: ${error.message}`);
      // Continue with default quantity = 1
    }
  }
  
  console.log(`Creating ${quantity} Foundit tag records`);
  
  // Create Airtable records - one for each quantity
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
  const address = shippingDetails.address;
  const formattedAddress = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country
  ].filter(Boolean).join(', ');
  
  const currentDate = new Date().toISOString();
  
  // Create multiple records based on quantity
  const createdRecords = [];
  const errors = [];
  
  for (let i = 0; i < quantity; i++) {
    try {
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
            'Shipping Name': shippingDetails.name,
            'Shipping Address': formattedAddress,
            'Order Date': currentDate
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Airtable create failed for record ${i+1}: ${response.status}`);
      }
      
      const data = await response.json();
      createdRecords.push(data);
    } catch (error) {
      errors.push(`Error creating record ${i+1}: ${error.message}`);
    }
  }
  
  return new Response(JSON.stringify({ 
    success: errors.length === 0,
    message: `Purchase recorded: created ${createdRecords.length} of ${quantity} records`,
    records: createdRecords,
    errors: errors.length > 0 ? errors : undefined
  }), {
    status: errors.length === 0 ? 200 : 207, // Using 207 Multi-Status for partial success
    headers: { 'Content-Type': 'application/json' }
  });
}
