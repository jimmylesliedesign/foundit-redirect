export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const payload = await request.json();
    console.log('Webhook payload type:', payload.type);
    
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const tagId = session.client_reference_id;
      const customerEmail = session.payment_intent.payment_method?.billing_details?.email 
        || session.customer?.email;

      console.log('Processing:', { tagId, customerEmail });

      const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
      
      const response = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
        }
      });

      const data = await response.json();
      const record = data.records.find(r => r.fields['Tag ID'] === tagId);

      if (record) {
        console.log('Found record:', record.id);
        
        const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              'Status': 'Active',
              'Email': customerEmail
            }
          })
        });

        const result = await updateResponse.json();
        console.log('Update result:', result);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
