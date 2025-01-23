export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const payload = await request.json();
    console.log('1. Full webhook payload:', JSON.stringify(payload, null, 2));
    
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      console.log('2. Session details:', JSON.stringify(session, null, 2));
      
      const tagId = session.client_reference_id;
      const customerEmail = session.customer_details?.email;
      console.log('3. Tag ID:', tagId);
      console.log('4. Customer email:', customerEmail);

      if (!customerEmail) {
        console.error('No customer email found in session');
        return new Response(JSON.stringify({ error: 'No customer email found' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

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
        const updateBody = {
          fields: {
            'Status': 'Active',
            'Email': customerEmail
          }
        };
        console.log('5. Airtable update payload:', JSON.stringify(updateBody, null, 2));

        const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateBody)
        });
        
        const updateResult = await updateResponse.json();
        console.log('6. Airtable update response:', JSON.stringify(updateResult, null, 2));
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
