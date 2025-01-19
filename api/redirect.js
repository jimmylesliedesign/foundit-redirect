export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // If it's a POST request, handle it as a webhook
  if (request.method === 'POST') {
    try {
      const payload = await request.json();
      console.log('1. Webhook type received:', payload.type);

      if (payload.type === 'checkout.session.completed') {
        const session = payload.data.object;
        console.log('2. Full Stripe session:', JSON.stringify(session, null, 2));
        console.log('3. URL from session:', session.url);
        
        const tagId = session.client_reference_id;
        console.log('4. Tag ID from Stripe:', tagId);
        console.log('5. Session metadata:', session.metadata);

        if (!tagId) {
          console.log('WARNING: No Tag ID received from Stripe!');
          return new Response(JSON.stringify({ received: true, warning: 'No Tag ID' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Update Airtable
        const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
        console.log('6. Checking Airtable at:', airtableUrl);
        
        const response = await fetch(airtableUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        console.log('7. Airtable records:', JSON.stringify(data, null, 2));

        const record = data.records.find(r => {
          console.log('8. Checking record Tag ID:', r.fields['Tag ID'], 'against:', tagId);
          return r.fields['Tag ID'] === tagId;
        });
        
        console.log('9. Found record:', record ? 'Yes' : 'No', record);

        if (record) {
          console.log('10. Attempting to update record:', record.id);
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
          console.log('11. Update result:', updateResult);
        } else {
          console.log('ERROR: No matching record found for Tag ID:', tagId);
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

  // For GET requests, handle the normal redirect (unchanged)
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
