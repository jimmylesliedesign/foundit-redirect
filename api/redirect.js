export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // If it's a POST request, handle it as a webhook
  if (request.method === 'POST') {
    try {
      const payload = await request.json();
      console.log('1. Webhook received:', payload.type);

      if (payload.type === 'checkout.session.completed') {
        const session = payload.data.object;
        console.log('Full session data:', JSON.stringify(session, null, 2));
        const tagId = session.client_reference_id;
        console.log('Tag ID we got:', tagId);
        console.log('Looking for Tag ID:', tagId);

        // Update Airtable
        const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
        console.log('Airtable URL:', airtableUrl);
        
        const response = await fetch(airtableUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        console.log('All Airtable records:', JSON.stringify(data, null, 2));

        const record = data.records.find(r => {
          console.log('Checking record:', r.fields['Tag ID']);
          return r.fields['Tag ID'] === tagId;
        });
        console.log('Found matching record:', record);

        if (record) {
          console.log('6. Attempting to update record:', record.id);
          const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fields: {
                'Status': 'Active'
              }
            })
          });
          const updateResult = await updateResponse.json();
          console.log('7. Update result:', updateResult);
        } else {
          console.log('No matching record found for TagID:', tagId);
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

  // For GET requests, handle the normal redirect
  try {
    const url = new URL(request.url);
    const tagId = url.pathname.slice(1);

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
    console.error('Error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://foundit-tags.webflow.io/sign-up'
      }
    });
  }
}
