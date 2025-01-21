export const config = {
  runtime: 'edge',
};

// Simple token generation function (unchanged)
function generateToken(tagId) {
  const timestamp = Date.now();
  return btoa(`${tagId}:${timestamp}`);
}

export default async function handler(request) {
  // If it's a POST request, handle it as a webhook
  if (request.method === 'POST') {
    try {
      const payload = await request.json();
      console.log('1. Webhook type received:', payload.type);

      if (payload.type === 'checkout.session.completed') {
        const session = payload.data.object;
        console.log('2. Full session data:', JSON.stringify(session, null, 2));
        const tagId = session.client_reference_id;
        const customerEmail = session.customer_details.email;
        console.log('3. Tag ID from Stripe:', tagId);

        if (!tagId) {
          console.log('WARNING: No Tag ID received from Stripe!');
          return new Response(JSON.stringify({ received: true, warning: 'No Tag ID' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Update Airtable
        const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
        console.log('4. Checking Airtable at:', airtableUrl);
        
        const response = await fetch(airtableUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        const record = data.records.find(r => r.fields['Tag ID'] === tagId);
        
        console.log('5. Found record:', record ? 'Yes' : 'No');

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
                'Status': 'Active',
                'Email Address': customerEmail,
                'Purchase Date': new Date().toISOString().split('T')[0],
                'Renewal Date': new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
                'Subscription ID': session.subscription
              }
            })
          });
          const updateResult = await updateResponse.json();
          console.log('7. Update result:', updateResult);
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

  // Handle GET requests (URL redirects)
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
      // Generate a token for this setup attempt
      const setupToken = generateToken(tagId);
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://foundit-tags.webflow.io/sign-up?tagId=${tagId}&token=${setupToken}`
        }
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://foundit-tags.webflow.io/error'
      }
    });
  }
}
