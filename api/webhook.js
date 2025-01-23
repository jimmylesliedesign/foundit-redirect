export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const payload = await request.json();
    console.log('Full Stripe payload:', JSON.stringify(payload.data.object, null, 2));
    
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const tagId = session.client_reference_id;
      const customerEmail = session.customer.email;

      // First, get current record
      const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
      const getResponse = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await getResponse.json();
      console.log('Airtable GET response:', JSON.stringify(data, null, 2));

      const record = data.records.find(r => r.fields['Tag ID'] === tagId);

      if (record) {
        // Log current record state
        console.log('Found record:', JSON.stringify(record, null, 2));
        
        const updateBody = {
          fields: {
            'Status': 'Active',
            'Email': customerEmail
          }
        };

        console.log('Sending update to Airtable:', JSON.stringify(updateBody, null, 2));

        const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateBody)
        });

        const updateResult = await updateResponse.json();
        console.log('Airtable update response:', JSON.stringify(updateResult, null, 2));
      }
    }

    return new Response(JSON.stringify({ received: true }));
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}
