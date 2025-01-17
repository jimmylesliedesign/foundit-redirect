export const config = { 
  runtime: 'edge', 
}; 

async function checkAirtable(tagId) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Tags`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
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
      return Response.redirect('https://wa.me/447514950683?text=Hi!%20It%20looks%20like%20I%20found%20your%20partner%20Jimmy\'s%20phone.%20Luckily%20they%20have%20a%20Foundit%20tag.%20What\'s%20the%20best%20way%20to%20return%20it?', 302);
    } else {
      return Response.redirect('http://webflow.io', 302);
    }
  } catch (error) {
    console.error('Error:', error);
    return Response.redirect('http://webflow.io', 302);
  }
}
