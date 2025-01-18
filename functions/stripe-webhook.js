const Airtable = require('airtable');
const base = new Airtable({apiKey: 'YOUR_AIRTABLE_API_KEY'}).base('YOUR_BASE_ID');

app.post('/stripe-webhook', async (req, res) => {
  try {
    const tagId = req.body.tagId; // Extract tagId from Stripe webhook data

    // Find the Airtable record with the matching tagId
    const records = await base('Tags').select({
      filterByFormula: `{Tag ID} = '${tagId}'`
    }).firstPage();

    if (records.length > 0) {
      // Update the "Status" field to "Active"
      await base('Tags').update([
        {
          "id": records[0].id,
          "fields": {
            "Status": "Active"
          }
        }
      ]);
      console.log('Airtable record updated successfully!');
    } else {
      console.log('Airtable record not found for tagId:', tagId);
    }

    res.sendStatus(200); // Send a success response to Stripe
  } catch (err) {
    console.error('Error updating Airtable:', err);
    res.sendStatus(500); // Send an error response to Stripe
  }
});
