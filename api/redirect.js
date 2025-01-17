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

export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const tagId = url.pathname.slice(1);
    console.log('Looking for tag:', tagId);

    // Let's check if we're getting the environment variables
    console.log('Base ID:', process.env.AIRTABLE_BASE_ID);
    // Don't log full token for security, just first few chars
    console.log('Token starts with:', process.env.AIRTABLE_TOKEN?.substring(0, 5));

    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Table%201`;
    console.log('Airtable URL:', airtableUrl);

    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('Airtable Data:', JSON.stringify(data, null, 2));

    // Log the exact search we're doing
    console.log('Looking for Tag ID:', tagId);
    const record = data.records.find(r => {
      console.log('Checking record:', r.fields['Tag ID']);
      return r.fields['Tag ID'] === tagId;
    });
    console.log('Found record:', record);

    if (record?.fields['Status'] === 'Active') {
      console.log('Status is Active, going to WhatsApp');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': record.fields['WhatsApp URL']
        }
      });
    } else {
      console.log('Not active or not found, going to Webflow');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': 'https://webflow.io'
        }
      });
    }
  } catch (error) {
    console.error('Error occurred:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://webflow.io'
      }
    });
  }
}
