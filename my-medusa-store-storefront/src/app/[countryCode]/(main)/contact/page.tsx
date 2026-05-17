import Link from 'next/link';

export default function ContactPage() {
  return (
    <>
      {/* 1. Top Green Header */}
      <section className="pt-5 bg-success">
        <div className="container py-5 px-5 text-center">
          <div className="row gx-5 justify-content-center">
            <div className="col-lg-8">
              <h1 className="text-white display-5 mb-2 fw-bold">Contact us</h1>
              <p className="lead text-white-50 m-0">Have questions? We're here to help!</p>
            </div>
          </div>
        </div>
        {/* Decorative Wave SVG */}
        <div className="svg-border-rounded text-light">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144.54 17.34" preserveAspectRatio="none" fill="currentColor">
            <path d="M144.54,17.34H0V0H144.54ZM0,0S32.36,17.34,72.27,17.34,144.54,0,144.54,0"></path>
          </svg>
        </div>
      </section>

      {/* 2. Info Cards */}
      <section className="py-5 text-center">
        <div className="container">
          <div className="row gx-5 row-cols-2 row-cols-lg-4 py-5">
            <div className="col">
              <div className="feature bg-warning bg-gradient text-white rounded-pill mb-3"><i className="icofont-chat"></i></div>
              <div className="h5 mb-2 fw-bold text-black">Chat with us</div>
              <p className="text-muted mb-0">Chat live with one of our support specialists.</p>
            </div>
            <div className="col">
              <div className="feature bg-warning bg-gradient text-white rounded-pill mb-3"><i className="icofont-people"></i></div>
              <div className="h5 fw-bold text-black">Ask the community</div>
              <p className="text-muted mb-0">Explore our community forums and communicate with other users.</p>
            </div>
            <div className="col">
              <div className="feature bg-warning bg-gradient text-white rounded-pill mb-3"><i className="icofont-question-circle"></i></div>
              <div className="h5 fw-bold text-black">Support center</div>
              <p className="text-muted mb-0">Browse FAQ's and support articles to find solutions.</p>
            </div>
            <div className="col">
              <div className="feature bg-warning bg-gradient text-white rounded-pill mb-3"><i className="icofont-telephone"></i></div>
              <div className="h5 fw-bold text-black">Call us</div>
              <p className="text-muted mb-0">Call us during normal business hours at (555) 892-9403.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Contact Form & Map */}
      <section className="bg-white">
        <div className="container">
          <div className="row align-items-center">
            
            <div className="col-lg-6">
              <div className="pe-lg-5">
                <div className="py-5">
                  <div className="display-5 text-dark fw-bold mb-2">Get In Touch.</div>
                  <p className="pt-1 pb-3 lead">Fill in the form to the right to get in touch with someone on our team, and we will reach out shortly.</p>
                  
                  <form>
                    <div className="d-flex gap-3 justify-content-between">
                      <div className="w-100">
                        <input type="text" className="form-control" placeholder="Enter Your E-Mail" aria-label="Email" />
                      </div>
                      <div className="w-100">
                        <input type="text" className="form-control" placeholder="Mobile No" aria-label="Mobile Number" />
                      </div>
                    </div>
                    <div className="my-3">
                      <textarea className="form-control" placeholder="Message" rows={6}></textarea>
                    </div>
                    <button type="button" className="btn btn-success btn-lg px-4 text-uppercase">Submit</button>
                  </form>
                  
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              {/* Note: allowFullScreen is camelCase in React */}
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d30703620.672472216!2d64.4139098985941!3d20.050418843029934!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30635ff06b92b791%3A0xd78c4fa1854213a6!2sIndia!5e0!3m2!1sen!2sin!4v1642570609485!5m2!1sen!2sin" 
                width="100%" 
                height="700px" 
                className="border-0" 
                allowFullScreen 
                loading="lazy"
              ></iframe>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}