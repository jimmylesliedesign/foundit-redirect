export const config = {
  runtime: 'edge',
};

// Simple token generation function
function generateToken(tagId) {
  const timestamp = Date.now();
  // Base64 encode the tagId and timestamp
  return btoa(`${tagId}:${timestamp}`);
}

export default async function handler(request) {
  // Handle POST (webhook) requests as before
  if (request.method === 'POST') {
    try {
      const payload = await request.json();
      console.log('1. Webhook type received:', payload.type);

      if (payload.type === 'checkout.session.completed') {
        // ... rest of your existing webhook code ...
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
