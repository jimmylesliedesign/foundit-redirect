export default function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname.slice(1); // Remove leading slash

  if (path === 'test123') {
    return Response.redirect('https://wa.me/1234567890', 302);
  } else {
    return Response.redirect('https://webflow.io', 302);
  }
}

export const config = {
  runtime: 'edge',
};
