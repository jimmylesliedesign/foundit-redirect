export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const tagId = url.pathname.slice(1);

    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Table%201`;
    
    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    // Updated to match your Airtable column names
    const record = data.records.find(r => r.fields['Tag ID'] === tagId);

    if (record?.fields['Status'] === 'Active') {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': record.fields['WhatsApp URL']  // Use the actual WhatsApp URL from Airtable
        }
      });
    } else {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': 'https://webflow.io'
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
