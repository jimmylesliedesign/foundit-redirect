exports.handler = async (event) => {
  try {
    // Verify the webhook is from Stripe
    const signature = event.headers['stripe-signature'];
    let webhookEvent;
    try {
      webhookEvent = stripe.webhooks.constructEvent(
        event.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error(`Webhook signature verification failed.`);
      return { statusCode: 400, body: `Webhook error: ${err.message}` };
    }

    // Extract the Tag ID from the webhook data
    const { tagId } = webhookEvent.data.object;

    // Update the Airtable record using the Tag ID
    await updateAirtableRecord(tagId, 'Active');

    return { statusCode: 200, body: 'Webhook processed successfully' };
  } catch (err) {
    console.error(`Error processing Stripe webhook: ${err.message}`);
    return { statusCode: 500, body: `Webhook processing error: ${err.message}` };
  }
};

async function updateAirtableRecord(tagId, status) {
  // Code to update the Airtable record using the Tag ID and new status
}
