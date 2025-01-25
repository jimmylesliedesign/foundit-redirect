export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await request.json();
    console.log('Webhook received:', payload.type);

    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const tagId = session.client_reference_id;
      const customerEmail = session.customer_details.email;

      console.log('Processing checkout:', { tagId, customerEmail });

      await updateAirtableRecord(tagId, {
        'Status': 'Active',
        'Email': customerEmail
      });
    } else if (payload.data) {
      // Handle form submission
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
  console.log('Updating Airtable:', { tagId, fields });
  
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
    const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    });

    const result = await updateResponse.json();
    console.log('Airtable update result:', result);
    return result;
  }

  throw new Error(`No record found for Tag ID: ${tagId}`);
}
