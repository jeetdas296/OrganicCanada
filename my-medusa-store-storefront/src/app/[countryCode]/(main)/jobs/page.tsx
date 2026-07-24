import Link from 'next/link';
export default async function JobsPage(props: { params: Promise<{ countryCode: string }> }) {
  const params = await props.params;
  const countryCode = params.countryCode;
  return (
    <>
      <section className="pt-5 bg-success">
        <div className="container py-5 px-5 text-center">
          <div className="row gx-5 justify-content-center">
            <div className="col-lg-8">
              <h1 className="text-white display-5 mb-2 fw-bold">Join Our Team</h1>
              <p className="lead text-white-50 m-0">Help us deliver happiness, 15 minutes at a time.</p>
            </div>
          </div>
        </div>
        <div className="svg-border-rounded text-light">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144.54 17.34" preserveAspectRatio="none" fill="currentColor">
            <path d="M144.54,17.34H0V0H144.54ZM0,0S32.36,17.34,72.27,17.34,144.54,0,144.54,0"></path>
          </svg>
        </div>
      </section>
      <section className="py-5 bg-white">
        <div className="container my-5 text-center">
          <div className="mb-5">
            <i className="bi bi-briefcase text-success" style={{ fontSize: '4rem' }}></i>
          </div>
          <h2 className="fw-bolder mb-3">No Open Positions</h2>
          <p className="lead fw-normal text-muted mb-4">
            We are currently fully staffed, but we are always looking for passionate people. <br />
            Check back soon or drop us a line on our Contact page!
          </p>
          <Link href={`/${countryCode}/contact`} className="btn btn-outline-success rounded-pill py-3 px-4 btn-lg">
            Get in touch
          </Link>
        </div>
      </section>
    </>
  );
}