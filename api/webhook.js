export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await request.json();
    console.log('Received webhook payload:', payload);
    
    const response = new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const TagId = session.client_reference_id;
      const email = session.customer_details.email;
      
      console.log('Processing session:', { TagId, Email });
      
      if (TagId) {
        updateAirtableRecord(TagId, email).catch(error => {
          console.error('Airtable update failed:', error);
        });
      }
    }

    return response;

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function updateAirtableRecord(TagId, email) {
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
  
  try {
    console.log('Fetching Airtable records for TagId:', TagId);
    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable fetch failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Airtable response:', data);
    
    const record = data.records.find(r => r.fields['TagID'] === TagId);
    
    if (!record) {
      throw new Error(`No record found for TagId: ${TagId}`);
    }

    console.log('Updating record:', record.id);
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

    console.log('Airtable update successful');
  } catch (error) {
    console.error('Error in updateAirtableRecord:', error);
    throw error;
  }
}
