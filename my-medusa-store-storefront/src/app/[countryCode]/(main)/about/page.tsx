import Link from 'next/link';

export default function AboutPage() {
  return (
    <>
      {/* 1. Header Section */}
      <header className="py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 col-xxl-8">
              <div className="text-center my-5">
                <h1 className="fw-bolder mb-3">Our mission is to make building websites easier for everyone.</h1>
                <p className="lead fw-normal text-muted mb-4">Eatsie was built on the idea that quality, functional website templates and themes should be available to everyone. Use our open source, free products, or support us by purchasing one of our premium products or services.</p>
                <a className="btn btn-success rounded-pill py-3 px-4 btn-lg" href="#scroll-target"> 
                  <span className="px-3"> Read our story </span> 
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Vision Section */}
      <section className="py-5 bg-white" id="scroll-target">
        <div className="container my-5">
          <div className="row gx-5 align-items-center">
            <div className="col-lg-6">
              <img className="img-fluid rounded mb-5 mb-lg-0" src="/img/vision.jpg" alt="Our Vision" />
            </div>
            <div className="col-lg-6">
              <h2 className="fw-bolder">Our founding</h2>
              <p className="lead fw-normal text-muted mb-0">Lorem ipsum dolor sit amet consectetur adipisicing elit. Iusto est, ut esse a labore aliquam beatae expedita. Blanditiis impedit numquam libero molestiae et fugit cupiditate, quibusdam expedita, maiores eaque quisquam.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Mission Section */}
      <section className="py-5">
        <div className="container my-5">
          <div className="row gx-5 align-items-center">
            <div className="col-lg-6 order-first order-lg-last">
              <img className="img-fluid rounded mb-5 mb-lg-0" src="/img/mission.jpg" alt="Our Mission" />
            </div>
            <div className="col-lg-6">
              <h2 className="fw-bolder">Growth & beyond</h2>
              <p className="lead fw-normal text-muted mb-0">Lorem ipsum dolor sit amet consectetur adipisicing elit. Iusto est, ut esse a labore aliquam beatae expedita. Blanditiis impedit numquam libero molestiae et fugit cupiditate, quibusdam expedita, maiores eaque quisquam.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Team Section */}
      <section className="py-5 bg-white">
        <div className="container mt-5">
          <div className="text-center">
            <h2 className="fw-bolder">Our team</h2>
            <p className="lead fw-normal text-muted mb-5">Dedicated to quality and your success</p>
          </div>
          <div className="row gx-5 row-cols-1 row-cols-sm-2 row-cols-xl-4 justify-content-center">
            <div className="col mb-5 mb-xl-0">
              <div className="text-center">
                <img className="img-fluid rounded-circle mb-4 px-4" src="/img/team1.jpg" alt="Ibbie Eckart" />
                <h5 className="fw-bolder">Ibbie Eckart</h5>
                <div className="text-muted">Founder & CEO</div>
              </div>
            </div>
            <div className="col mb-5 mb-xl-0">
              <div className="text-center">
                <img className="img-fluid rounded-circle mb-4 px-4" src="/img/team2.jpg" alt="Arden Vasek" />
                <h5 className="fw-bolder">Arden Vasek</h5>
                <div className="text-muted">CFO</div>
              </div>
            </div>
            <div className="col mb-5 mb-sm-0">
              <div className="text-center">
                <img className="img-fluid rounded-circle mb-4 px-4" src="/img/team3.jpg" alt="Toribio Nerthus" />
                <h5 className="fw-bolder">Toribio Nerthus</h5>
                <div className="text-muted">Operations Manager</div>
              </div>
            </div>
            <div className="col mb-5">
              <div className="text-center">
                <img className="img-fluid rounded-circle mb-4 px-4" src="/img/team4.jpg" alt="Malvina Cilla" />
                <h5 className="fw-bolder">Malvina Cilla</h5>
                <div className="text-muted">CTO</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}