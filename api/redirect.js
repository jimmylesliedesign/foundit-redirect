export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const tagId = url.pathname.slice(1);
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
      // Create new record if TagID doesn't exist
      await fetch(airtableUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            fields: {
              'TagID': tagId,
              'Status': 'Not Active'
            }
          }]
        })
      });
    }

    const redirectUrl = record?.fields['Status'] === 'Active' 
      ? record.fields['WhatsApp URL']
      : `https://foundit-tags.webflow.io/sign-up?tagId=${tagId}&verified=true`;

    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl }
    });

  } catch (error) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://foundit-tags.webflow.io/404'
      }
    });
  }
}
