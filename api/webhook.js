export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const payload = await request.json();
    console.log('Webhook type:', payload.type);
    console.log('Full payload:', JSON.stringify(payload, null, 2));

    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      console.log('Session data:', JSON.stringify(session, null, 2));
      
      const tagId = session.client_reference_id;
      const customerEmail = session.customer?.email;

      const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
      const updateBody = {
        fields: {
          'Status': 'Active',
          'Email': customerEmail
        }
      };
      console.log('Update payload:', updateBody);

      const getResponse = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      });
      const data = await getResponse.json();
      const record = data.records.find(r => r.fields['Tag ID'] === tagId);

      if (record) {
        const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateBody)
        });
        console.log('Airtable response:', await updateResponse.text());
      }
    }

    return new Response(JSON.stringify({ received: true }));
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}
