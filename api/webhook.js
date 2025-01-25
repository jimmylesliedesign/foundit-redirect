export default async function handler(request) {
  if (request.method === 'POST') {
    try {
      const payload = await request.json();

      if (payload.type === 'checkout.session.completed') {
        const session = payload.data.object;
        const tagId = session.client_reference_id;
        const customerEmail = session.customer_details.email;

        if (!tagId) {
          return new Response(JSON.stringify({ received: true, warning: 'No Tag ID' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Send webhook response immediately to prevent timeout
        const response = new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

        // Update Airtable asynchronously
        updateAirtableRecord(tagId, customerEmail);

        return response;
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}

async function updateAirtableRecord(tagId, email) {
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
  
  try {
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
        body: JSON.stringify({
          fields: {
            'Status': 'Active',
            'Email': email
          }
        })
      });
    }
  } catch (error) {
    console.error('Airtable update error:', error);
  }
}
