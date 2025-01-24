export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const payload = await request.json();
    console.log('1. Webhook received:', payload.type);
    
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const tagId = session.client_reference_id;
      const customerEmail = session.customer_details.email;
      console.log('2. Tag ID from session:', tagId);
      console.log('3. Customer email:', customerEmail);

      const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
      console.log('4. Using Airtable URL:', airtableUrl);
      
      const response = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('5. Airtable response:', data);

      const record = data.records.find(r => r.fields['Tag ID'] === tagId);
      console.log('6. Found record:', record);

      if (record) {
        console.log('7. Attempting to update record ID:', record.id);
        const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              'Status': 'Active',
              'Email': customerEmail,
              'Customer': record.fields['Customer'],
              'Trusted Contact': record.fields['Trusted Contact'],
              'Phone Number': record.fields['Phone Number']
            }
          })
        });
        
        const updateResult = await updateResponse.json();
        console.log('8. Update result:', updateResult);
      } else {
        console.log('No matching record found for Tag ID:', tagId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
