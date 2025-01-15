export default function handler(req, res) {
  // Get the tagId from the URL
  const { tagId } = req.query;

  // Log the tagId to see what we're receiving
  console.log('Received tagId:', tagId);

  // Simple response to test the route is working
  if (tagId === 'test123') {
    return res.redirect(302, 'https://wa.me/1234567890');
  } else {
    return res.redirect(302, 'https://webflow.io');  // Replace with your actual setup page URL
  }
}
