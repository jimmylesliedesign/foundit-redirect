export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
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
          'Location': 'https://foundit-tags.webflow.io/sign-up?tagId=${tagId}'
        }
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://webflow.io'
      }
    });
  }
}
