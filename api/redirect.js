export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname.slice(1);
    
    // Bypass processing for home
    if (!pathname) {
      return new Response(null, { status: 404 });
    }

    // Only allow sign-up with tagId
    if (pathname === 'sign-up') {
      const tagId = url.searchParams.get('tagId');
      if (!tagId) {
        return new Response(null, {
          status: 302,
          headers: { 'Location': 'https://foundit-tags.com' }
        });
      }
      return new Response(null, { status: 404 });
    }

    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Foundit%20Tags`;
    const filterFormula = encodeURIComponent(`{TagID}='${pathname}'`);
    const response = await fetch(`${airtableUrl}?filterByFormula=${filterFormula}`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    const record = data.records?.[0];

    return new Response(null, {
      status: 302,
      headers: {
        'Location': record?.fields['Status'] === 'Active'
          ? record.fields['WhatsApp URL']
          : `https://foundit-tags.com/sign-up?tagId=${pathname}`
      }
    });

  } catch (error) {
    return new Response(null, { status: 404 });
  }
}
