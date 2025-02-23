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
      const tagId = session.client_reference_id;
      const email = session.customer_details.email;
      
      if (!tagId) {
        throw new Error('No tagId provided in client_reference_id');
      }

      await updateAirtableRecord(tagId, email);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Activation webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function updateAirtableRecord(tagId, email) {
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
    throw new Error(`Airtable update failed: ${updateResponse.status}`);
  }
}
