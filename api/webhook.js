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
      
      // Always try to activate if there's a client_reference_id
      if (session.client_reference_id) {
        const tagId = session.client_reference_id;
        const email = session.customer_details.email;
        await updateAirtableRecord(tagId, email);
      }
      
      // Handle physical purchase if it's a physical_purchase type
      if (session.metadata?.type === 'physical_purchase') {
        try {
          const quantity = parseInt(session.metadata.quantity) || 1;
          const shipping = {
            name: session.shipping?.name,
            address: session.shipping?.address
          };
          await createAirtableRecords(quantity, shipping, session);
        } catch (error) {
          console.error('Physical purchase processing failed:', error);
          throw error;
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

// Keep your existing createAirtableRecords and helper functions below
