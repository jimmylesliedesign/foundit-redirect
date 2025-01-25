@@ -3,17 +3,34 @@ export const config = {
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  try {
    const payload = await request.json();
    
    console.log('Received webhook payload:', payload);
    // Handle Stripe webhook
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const tagId = session.client_reference_id;
      await updateAirtableRecord(tagId, { 'Status': 'Active' });
      const customerEmail = session.customer_details.email;
      if (!tagId) {
        return new Response(JSON.stringify({ received: true, warning: 'No Tag ID' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      await updateAirtableRecord(tagId, {
        'Status': 'Active',
        'Email': customerEmail
      });
    }
    // Handle form submission
    else if (payload.data) {
    else if (payload.type === 'form_submission' && payload.data) {
      const tagId = payload.data['Tag-ID'];
      await updateAirtableRecord(tagId, {
        'Customer': payload.data['Name'],
@@ -36,6 +53,10 @@ export default async function handler(request) {
}

async function updateAirtableRecord(tagId, fields) {
  if (!tagId) {
    throw new Error('Tag ID is required');
  }
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;

  const response = await fetch(airtableUrl, {
@@ -45,17 +66,29 @@ async function updateAirtableRecord(tagId, fields) {
    }
  });

  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status}`);
  }
  const data = await response.json();
  const record = data.records.find(r => r.fields['Tag ID'] === tagId);

  if (record) {
    await fetch(`${airtableUrl}/${record.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    });
  if (!record) {
    throw new Error(`No record found for Tag ID: ${tagId}`);
  }
  const updateResponse = await fetch(`${airtableUrl}/${record.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  if (!updateResponse.ok) {
    throw new Error(`Failed to update Airtable: ${updateResponse.status}`);
  }
  return updateResponse.json();
}
