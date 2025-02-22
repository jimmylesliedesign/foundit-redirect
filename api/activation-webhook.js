export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await request.json();

    // Handle Stripe webhook events for activation payments
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const tagId = session.client_reference_id;
      
      if (!tagId) {
        return new Response(JSON.stringify({ error: 'No tagId provided in session' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Update Airtable record with payment confirmation and status
      await updateAirtableRecord(tagId, {
        email: session.customer_details.email,
        customerName: session.customer_details.name,
        status: 'Active'
      });

      return new Response(JSON.stringify({ 
        received: true, 
        action: 'tag_activated',
        tagId 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Handle form submissions for contact details
    else if (payload.type === 'form_submission') {
      const { tagId, customerName, trustedContactName, trustedContactPhone } = payload;
      
      if (!tagId || !trustedContactName || !trustedContactPhone) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields in form submission' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Format phone number for WhatsApp
      const formattedPhone = trustedContactPhone.replace(/\D/g, '');
      
      // Create WhatsApp URL with pre-filled message
      const whatsAppUrl = `https://wa.me/${formattedPhone}?text=Hi%20${encodeURIComponent(trustedContactName)}%2C%20I%20found%20a%20phone%20with%20your%20contact%20details.`;

      // Update Airtable record with form data
      await updateAirtableRecord(tagId, {
        customerName,
        trustedContactName,
        trustedContactPhone,
        whatsAppUrl
      });

      return new Response(JSON.stringify({ 
        received: true, 
        action: 'form_processed',
        tagId 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid event type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Activation webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function updateAirtableRecord(tagId, updates) {
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
  
  // Find the record with the given tagId
  const filterFormula = encodeURIComponent(`{TagID}='${tagId}'`);
  const searchResponse = await fetch(`${airtableUrl}?filterByFormula=${filterFormula}`, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!searchResponse.ok) {
    throw new Error(`Failed to find Airtable record: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  const record = searchData.records?.[0];

  if (!record) {
    throw new Error(`No record found for TagID: ${tagId}`);
  }

  // Prepare the update fields
  const fields = {
    ...record.fields,  // Keep existing fields
    ...(updates.email && { 'Email': updates.email }),
    ...(updates.customerName && { 'Customer Name': updates.customerName }),
    ...(updates.trustedContactName && { 'Trusted Contact Name': updates.trustedContactName }),
    ...(updates.trustedContactPhone && { 'Trusted Contact Phone': updates.trustedContactPhone }),
    ...(updates.whatsAppUrl && { 'WhatsApp URL': updates.whatsAppUrl }),
    ...(updates.status && { 'Status': updates.status })
  };

  // Update the record
  const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields
    })
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Airtable update failed: ${updateResponse.status} - ${errorText}`);
  }

  return updateResponse.json();
}