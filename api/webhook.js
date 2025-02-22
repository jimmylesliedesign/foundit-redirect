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
          console.log('Processing physical purchase:', session.id);
          const quantity = session.line_items?.data[0]?.quantity || 1;
          const shipping = session.shipping_details;

          await createAirtableRecords(quantity, shipping);
        } catch (error) {
          console.error('Error processing physical purchase:', error);
          throw error;
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
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Existing activation function
async function updateAirtableRecord(tagId, email) {
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
  const filterFormula = encodeURIComponent(`{TagID}='${tagId}'`);
  
  try {
    console.log('Fetching Airtable records for tagId:', tagId);
    const response = await fetch(`${airtableUrl}?filterByFormula=${filterFormula}`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable fetch failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Airtable response:', JSON.stringify(data, null, 2));
    
    if (!data.records?.length) {
      throw new Error(`No record found for tagId: ${tagId}`);
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
      const errorText = await updateResponse.text();
      throw new Error(`Airtable update failed: ${updateResponse.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error in updateAirtableRecord:', error);
    throw error;
  }
}

// New function for creating records for physical purchases
async function createAirtableRecords(quantity, shipping) {
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
  
  try {
    console.log('Creating Airtable records for quantity:', quantity);
    const records = [];

    for (let i = 0; i < quantity; i++) {
      records.push({
        fields: {
          'TagID': generateTagId(),
          'Status': 'Not Active',
          'Shipping Name': shipping?.name || '',
          'Shipping Address': formatShippingAddress(shipping?.address),
          'Order Date': new Date().toISOString()
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

    console.log(`Successfully created ${quantity} new tag records`);
  } catch (error) {
    console.error('Error in createAirtableRecords:', error);
    throw error;
  }
}

// Helper functions for physical purchases
function generateTagId() {
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `FDT-${random}`;
}

function formatShippingAddress(address) {
  if (!address) return '';
  
  return [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country
  ].filter(Boolean).join('\n');
}
