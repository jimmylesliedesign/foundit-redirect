export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const payload = await request.json();
    
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const tagId = session.client_reference_id;
      const customerEmail = session.customer?.email;
      
      console.log('DEBUG - Full session:', JSON.stringify(session, null, 2));
      console.log('DEBUG - Customer email:', customerEmail);
      console.log('DEBUG - Tag ID:', tagId);

      const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
      
      const getResponse = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await getResponse.json();
      console.log('DEBUG - Airtable GET response:', JSON.stringify(data, null, 2));

      const record = data.records.find(r => r.fields['Tag ID'] === tagId);

      if (record) {
        const updatePayload = {
          fields: {
            'Status': 'Active',
            'Email': customerEmail
          }
        };
        
        console.log('DEBUG - Airtable update payload:', JSON.stringify(updatePayload, null, 2));
        
        const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        });
        
        const updateResult = await updateResponse.json();
        console.log('DEBUG - Airtable update response:', JSON.stringify(updateResult, null, 2));
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('DEBUG - Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
