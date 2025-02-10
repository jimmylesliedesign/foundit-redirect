export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname.slice(1);
    
    // Prevent direct access to sign-up page
    if (pathname === 'sign-up') {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': 'https://foundit-tags.com'
        }
      });
    }

    // Handle home and other static pages
    if (['', 'home', '404'].includes(pathname)) {
      return new Response(null, { 
        status: 404,
        statusText: 'Not Found'
      });
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
    
    if (record?.fields['Status'] === 'Active') {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': record.fields['WhatsApp URL']
        }
      });
    }

    return new Response(null, {
      status: 302,
      headers: {
        'Location': `https://foundit-tags.com/sign-up?tagId=${pathname}`
      }
    });

  } catch (error) {
    console.error('Redirect error:', error);
    return new Response(null, {
      status: 404,
      statusText: 'Not Found'
    });
  }
}
