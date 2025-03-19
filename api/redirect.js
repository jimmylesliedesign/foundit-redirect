export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const tagId = url.pathname.slice(1);
    
    // Check if tagId is empty (just found-it.co/)
    if (!tagId || tagId.trim() === '') {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': 'https://foundit-tags.com'
        }
      });
    }
    
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

    // Determine which URL to redirect to based on Status and Order Date
    let redirectUrl;
    
    if (record?.fields['Status'] === 'Active') {
      // Case 1: Active tag -> WhatsApp URL
      redirectUrl = record.fields['WhatsApp URL'];
    } else if (record?.fields['Order Date']) {
      // Case 2: Inactive but purchased -> No-payment setup form
      redirectUrl = `https://foundit-tags.com/setup-purchased?tagId=${tagId}`;
    } else {
      // Case 3: Inactive and not purchased -> Payment required setup form
      redirectUrl = `https://foundit-tags.com/setup?tagId=${tagId}`;
    }

    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl }
    });

  } catch (error) {
    // Default redirect on error
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://foundit-tags.com'
      }
    });
  }
}
