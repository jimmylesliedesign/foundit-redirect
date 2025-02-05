const record = await getAirtableRecord(tagId);
    
    // If we can't get the record, default to sign-up page
    if (!record) {
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `https://foundit-tags.webflow.io/sign-up?tagId=${tagId}&error=connectivity`
        }
      });
    }

    const redirectUrl = record.fields['Status'] === 'Active' 
      ? record.fields['WhatsApp URL']
      : `https://foundit-tags.webflow.io/sign-up?tagId=${tagId}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
        // Add cache control headers to help with international access
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error('Redirect error:', error);
    
    // In case of any error, redirect to sign-up page with error parameter
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': 'https://foundit-tags.webflow.io/sign-up?error=unknown'
      }
    });
  }
}
