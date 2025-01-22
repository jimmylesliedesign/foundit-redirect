<script>
(function() {
  window.addEventListener('load', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tagId = urlParams.get('tagId');
    const token = urlParams.get('token');
    
    // Validate token
    function validateToken(token, tagId) {
      try {
        const decoded = atob(token);
        const [encodedTagId, timestamp] = decoded.split(':');
        
        // Check if token is for correct tagId
        if (encodedTagId !== tagId) return false;
        
        // Check if token is less than 15 minutes old
        const tokenTime = parseInt(timestamp);
        const now = Date.now();
        return (now - tokenTime) < (15 * 60 * 1000); // 15 minutes
      } catch {
        return false;
      }
    }

    // If no token or invalid token, redirect to error page
    if (!token || !tagId || !validateToken(token, tagId)) {
      window.location.href = '/error';
      return;
    }

    // If valid token, update Stripe checkout link
    if (tagId) {
      const checkoutLink = document.querySelector('a[href="https://buy.stripe.com/test_dR64jN9dCfJCglGfYY"]');
      if (checkoutLink) {
        checkoutLink.href = `${checkoutLink.href}?client_reference_id=${tagId}`;
        console.log('Updated Stripe checkout URL:', checkoutLink.href);
      }
    }
  });
})();
</script>
