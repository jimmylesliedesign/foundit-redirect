export default function Redirect({ destination }) {
  return null;
}

export async function getServerSideProps({ params }) {
  const path = params?.path?.[0] || '';
  
  if (path === 'test123') {
    return {
      redirect: {
        destination: 'https://wa.me/1234567890',
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: 'https://webflow.io',
      permanent: false,
    },
  };
}
