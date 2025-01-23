export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const payload = await request.json();
    
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const tagId = session.client_reference_id;
      // Try getting email from customer_details
      const customerEmail = session.customer_details?.email || session.customer?.email;

      console.log('Customer Email:', customerEmail);
      
      if (!customerEmail) {
        console.error('No email found in session');
        return new Response(JSON.stringify({ error: 'No email found' }), {
          status: 400
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
        
        console.log('Airtable Response:', await updateResponse.text());
      }
    }

    return new Response(JSON.stringify({ received: true }));
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}
