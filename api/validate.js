export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const tagId = url.pathname.split('/validate/')[1];
    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
    
    const filterFormula = encodeURIComponent(`{TagID}='${tagId}'`);
    const response = await fetch(`${airtableUrl}?filterByFormula=${filterFormula}`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!data.records?.length) {
      return new Response(null, { status: 404 });
    }

    return new Response(null, { status: 200 });

  } catch (error) {
    return new Response(null, { status: 500 });
  }
}
