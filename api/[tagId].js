export const config = {
  runtime: 'edge',
};

async function checkAirtable(tagId) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Tags`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
    },
  });
  
  const data = await response.json();
  const record = data.records.find(r => r.fields.tagId === tagId);
  
  return record?.fields?.status === 'Active';
}

export default async function handler(req) {
  const url = new URL(req.url);
  const tagId = url.pathname.slice(1);

  try {
    const isActive = await checkAirtable(tagId);
    
    if (isActive) {
      return Response.redirect('https://wa.me/1234567890', 302);
    } else {
      return Response.redirect('https://webflow.io', 302);
    }
  } catch (error) {
    console.error('Error:', error);
    return Response.redirect('https://webflow.io', 302);
  }
}
