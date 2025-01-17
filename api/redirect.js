export default async function handler(req) {
  const url = new URL(req.url);
  const tagId = url.pathname.slice(1); // Gets 'abc123' from '/abc123'

  // Check Airtable using their API
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Tags`;
  
  try {
    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
      }
    });

    const data = await response.json();
    const record = data.records.find(r => r.fields.tagId === tagId);

    if (record?.fields?.status === 'Active') {
      // If active, redirect to WhatsApp
      return Response.redirect('https://wa.me/1234567890', 302);
    } else {
      // If not active, redirect to setup page
      return Response.redirect('https://yourwebflow.site/setup', 302);
    }
  } catch (error) {
    // If anything goes wrong, redirect to setup
    return Response.redirect('https://yourwebflow.site/setup', 302);
  }
}
