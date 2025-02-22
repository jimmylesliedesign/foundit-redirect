export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await request.formData();
    
    // Log all form fields we receive
    const formFields = {};
    for (const [key, value] of formData.entries()) {
      formFields[key] = value;
    }
    console.log('Received form fields:', formFields);
    
    const tagId = formData.get('TagID');
    if (!tagId) {
      throw new Error('TagID is required');
    }

    // Get form values with exact Framer field names
    const customerName = formData.get('full-name');
    const trustedContact = formData.get('trusted-contact');
    const phoneNumber = formData.get('phone-number');

    // Update Airtable with form details
    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
    const filterFormula = encodeURIComponent(`{TagID}='${tagId}'`);
    
    const response = await fetch(`${airtableUrl}?filterByFormula=${filterFormula}`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    const record = data.records?.[0];

    if (!record) {
      return new Response(JSON.stringify({ error: 'Tag not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate WhatsApp URL
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      `Hi ${trustedContact}, I found ${customerName}'s phone! Let me know how I can return it.`
    )}`;

    // Update record with form data using exact Airtable column names
    const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Customer Name': customerName,
          'Trusted Contact': trustedContact,
          'Phone Number': phoneNumber,
          'WhatsApp URL': whatsappUrl
        }
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update Airtable record: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Form processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
