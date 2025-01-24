export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const payload = await request.json();
    
    // Handle Stripe webhook
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const tagId = session.client_reference_id;
      await updateAirtableRecord(tagId, { 'Status': 'Active' });
    }
    // Handle form submission
    else if (payload.data) {
      const tagId = payload.data['Tag-ID'];
      await updateAirtableRecord(tagId, {
        'Customer': payload.data['Name'],
        'Trusted Contact': payload.data['Trusted-Contact'],
        'Phone Number': payload.data['Phone-Number']
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function updateAirtableRecord(tagId, fields) {
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
  
  const response = await fetch(airtableUrl, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  const record = data.records.find(r => r.fields['Tag ID'] === tagId);

  if (record) {
    await fetch(`${airtableUrl}/${record.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    });
  }
}
