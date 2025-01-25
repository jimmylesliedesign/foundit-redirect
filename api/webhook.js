export default async function handler(request) {
  try {
    const payload = await request.json();
    
    // Handle Stripe webhook
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const tagId = session.client_reference_id;
      const customerEmail = session.customer_details.email;
      
      await updateAirtableRecord(tagId, {
        'Status': 'Active',
        'Email': customerEmail
      });
    }
    // Handle form submission
    else if (payload.data) {
      const tagId = payload.data['Tag-ID'];
      await updateAirtableRecord(tagId, {
        'Customer': payload.data['Name'],
        'Trusted Contact': payload.data['Trusted-Contact'],
        'Phone Number': payload.data['Phone-Number']
      });
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
