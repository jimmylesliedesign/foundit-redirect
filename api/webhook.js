export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const payload = await request.json();
    
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const tagId = session.client_reference_id;
      const customerEmail = session.customer.email;

      console.log('Customer Email:', customerEmail); // Verify email
      
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
        
        console.log('Airtable Update Payload:', JSON.stringify(updateBody));

        const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateBody)
        });
        
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('Airtable Error:', errorText);
        } else {
          const result = await updateResponse.json();
          console.log('Airtable Success:', JSON.stringify(result));
        }
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
