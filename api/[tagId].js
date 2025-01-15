export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  const tagId = url.pathname.split('/').pop();

  if (tagId === 'test123') {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://wa.me/1234567890'
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
}
