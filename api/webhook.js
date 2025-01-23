export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const payload = await request.json();
    const session = payload.data.object;
    
    if (payload.type === 'checkout.session.completed') {
      const tagId = session.client_reference_id;
      const customerEmail = session.customer?.email;

      if (!customerEmail) {
        throw new Error('No email found in session');
      }

      const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;

      // First get the record
      const response = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      });

      const data = await response.json();
      const record = data.records.find(r => r.fields['Tag ID'] === tagId);

      if (record) {
        // Update with both status and email
        const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              'Status': 'Active',
              'Email': customerEmail // Ensure exact field name match
            }
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update Airtable record');
        }
      }
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
