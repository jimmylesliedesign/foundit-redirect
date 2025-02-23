export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const payload = await request.json();
    
    // Verify we have a checkout.session.completed event
    if (payload.type !== 'checkout.session.completed') {
      return new Response(JSON.stringify({ error: 'Invalid event type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = payload.data.object;
    const tagId = session.client_reference_id;
    const email = session.customer_details?.email;

    // Validate required data
    if (!tagId || !email) {
      return new Response(JSON.stringify({ 
        error: 'Missing required data',
        tagId: !!tagId,
        email: !!email
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update Airtable record
    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
    const filterFormula = encodeURIComponent(`{TagID}='${tagId}'`);
    
    const response = await fetch(`${airtableUrl}?filterByFormula=${filterFormula}`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable fetch failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.records?.length) {
      return new Response(JSON.stringify({ 
        error: `No record found for tagId: ${tagId}`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const record = data.records[0];
    const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Status': 'Active',
          'Email': email
        }
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Airtable update failed: ${updateResponse.status}`);
    }

    // Return success
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Tag activated successfully',
      tagId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Activation webhook error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
