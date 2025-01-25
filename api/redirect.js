@@ -3,68 +3,99 @@ export const config = {
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
  if (request.method === 'POST') {
    try {
      const payload = await request.json();

      const data = await response.json();
      console.log('5. Airtable response:', data);
      if (payload.type === 'checkout.session.completed') {
        const session = payload.data.object;
        const tagId = session.client_reference_id;
        const customerEmail = session.customer_details.email;

      const record = data.records.find(r => r.fields['Tag ID'] === tagId);
      console.log('6. Found record:', record);
        if (!tagId) {
          return new Response(JSON.stringify({ received: true, warning: 'No Tag ID' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

      if (record) {
        console.log('7. Attempting to update record ID:', record.id);
        const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
          method: 'PATCH',
        const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
        
        const response = await fetch(airtableUrl, {
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
          }
        });
        
        const updateResult = await updateResponse.json();
        console.log('8. Update result:', updateResult);
      } else {
        console.log('No matching record found for Tag ID:', tagId);
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
                'Email': customerEmail
              }
            })
          });
        }
      }
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  try {
    const url = new URL(request.url);
    const tagId = url.pathname.slice(1);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
    
    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    const record = data.records.find(r => r.fields['Tag ID'] === tagId);
    if (record?.fields['Status'] === 'Active') {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': record.fields['WhatsApp URL']
        }
      });
    } else {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://foundit-tags.webflow.io/sign-up?tagId=${tagId}`
        }
      });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    return new Response(null, {
      status: 302,
      headers: {
        'Content-Type': 'application/json'
        'Location': 'https://foundit-tags.webflow.io/sign-up'
      }
    });
  }
