
export default function handler(req, res) {
  // Get the tagId from the URL
  const { tagId } = req.query;

  // For testing: if tagId is 'test123', redirect to WhatsApp, otherwise to setup
  if (tagId === 'test123') {
    // Replace this URL with your actual WhatsApp link
    res.redirect('https://wa.me/1234567890');
  } else {
    // Replace with your actual setup page URL
    res.redirect('https://yoursite.webflow.io/setup');
  }
}
