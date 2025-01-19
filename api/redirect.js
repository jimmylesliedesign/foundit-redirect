export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // If it's a POST request, handle it as a webhook
  if (request.method === 'POST') {
    try {
      const payload = await request.json();

      if (payload.type === 'checkout.session.completed') {
        const session = payload.data.object;
        
        const tagId = session.client_reference_id;

        if (!tagId) {
          return new Response(JSON.stringify({ received: true, warning: 'No Tag ID' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Update Airtable
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
          await fetch(`${airtableUrl}/${record.id}`, {
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
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://foundit-tags.webflow.io/sign-up'
      }
    });
  }
}
