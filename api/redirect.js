export const config = {
  runtime: 'edge',
};
export default async function handler(request) {
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
        const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
        console.log('4. Checking Airtable at:', airtableUrl);
<script>
(function() {
  window.addEventListener('load', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tagId = urlParams.get('tagId');
    const token = urlParams.get('token');
    
    // Validate token
    function validateToken(token, tagId) {
      try {
        const decoded = atob(token);
        const [encodedTagId, timestamp] = decoded.split(':');

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
          
          const today = new Date();
          const renewalDate = new Date(today);
          renewalDate.setFullYear(renewalDate.getFullYear() + 1);
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
                'Purchase Date': today.toISOString().split('T')[0],
                'Renewal Date': renewalDate.toISOString().split('T')[0],
                'Subscription ID': session.subscription
              }
            })
          });
          const updateResult = await updateResponse.json();
          console.log('7. Update result:', updateResult);
        }
        // Check if token is for correct tagId
        if (encodedTagId !== tagId) return false;
        
        // Check if token is less than 15 minutes old
        const tokenTime = parseInt(timestamp);
        const now = Date.now();
        return (now - tokenTime) < (15 * 60 * 1000); // 15 minutes
      } catch {
        return false;
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
    // If no token or invalid token, redirect to error page
    if (!token || !tagId || !validateToken(token, tagId)) {
      window.location.href = '/error';
      return;
    }
  }

  try {
    const url = new URL(request.url);
    const tagId = url.pathname.slice(1);
    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
    
    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
    // If valid token, update Stripe checkout link
    if (tagId) {
      const checkoutLink = document.querySelector('a[href="https://buy.stripe.com/test_dR64jN9dCfJCglGfYY"]');
      if (checkoutLink) {
        checkoutLink.href = `${checkoutLink.href}?client_reference_id=${tagId}`;
        console.log('Updated Stripe checkout URL:', checkoutLink.href);
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
        'Location': 'https://foundit-tags.webflow.io/error'
      }
    });
  }
}
  });
})();
</script>
