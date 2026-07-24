import Link from '@modules/common/components/localized-client-link';

export default function Footer() {
  return (
    <>
      {/* Top Pre-Footer Section (Areas we deliver to) */}
      <section className="footer py-5" style={{ backgroundColor: '#a6422e' }}>
        <div className="container">
          <div className="row">
            <h5 className="mb-4 fw-bold text-white">Areas we deliver to</h5>
            <div className="col-lg-3 col-md-6 col-6">
              <ul className="list-unstyled d-grid gap-2 mb-0">
                <li><Link href="/listing" className="text-decoration-none text-white">Chanakyapuri</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Greater Kailash 2</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Jasola</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Lajpat Nagar</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Mehruli</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Rashtrapati Bhavan</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Sarojini Nagar</Link></li>
              </ul>
            </div>
            <div className="col-lg-3 col-md-6 col-6">
              <ul className="list-unstyled d-grid gap-2 mb-0">
                <li><Link href="/listing" className="text-decoration-none text-white">Chhatarpur</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Green Park</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Kalkaji</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Ladhi Colony</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Munirka</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Sainik Farm</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">South Ext.</Link></li>
              </ul>
            </div>
            <div className="col-lg-3 col-md-6 col-6">
              <ul className="list-unstyled d-grid gap-2 mb-0">
                <li><Link href="/listing" className="text-decoration-none text-white">Connaught Place</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Hauz Khas</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Karol Bagh</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Mahipalpur</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">New Friends Colony</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Saket</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Vasant Kunj</Link></li>
              </ul>
            </div>
            <div className="col-lg-3 col-md-6 col-6">
              <ul className="list-unstyled d-grid gap-2 mb-0">
                <li><Link href="/listing" className="text-decoration-none text-white">Greater Kailash 1</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Khan Market</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Malviya Nagar</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">RK Puram</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Sarai Kala khan</Link></li>
                <li><Link href="/listing" className="text-decoration-none text-white">Vasant Vihar</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Main Footer Section */}
      <footer className="bg-footer py-5 d-none d-md-block">
        <div className="container">
          <div className="row mb-5">
            <div className="col-12 text-white">
              <h6 className="fw-bold mb-4">You can't stop time, but you can save it</h6>
              <p className="text-white-70 m-0">Living in the city, there is never enough time to shop for groceries, pick-up supplies, grab food and wade through traffic on the way back home. How about we take care of all of the above for you? What if we can give you all that time back? Send packages across the city and get everything from food, groceries, medicines and pet supplies delivered right to your doorstep. From any store to your door, just make a list and we’ll make it disappear. Just Eatsie It!</p>
            </div>
          </div>
          <hr className="text-white" />
          
          <div className="row text-white mt-5">
            <div className="col-md-4 col-12">
              <div>
                <img src="/img/logo_organic_canada_footer_1.png" alt="Footer Logo" className="img-fluid" />
              </div>
            </div>
            <div className="col-md-2 col-6">
              <h6 className="text-uppercase mb-4 fw-bold">Eatsie</h6>
              <ul className="list-unstyled d-grid gap-2 text-decoration-none">
                <li><Link className="text-decoration-none text-white" href="/about">About us</Link></li>
                <li><Link className="text-decoration-none text-white" href="/jobs">Jobs</Link></li>
                <li><Link className="text-decoration-none text-white" href="/contact">Contact Us</Link></li>
                <li><Link className="text-decoration-none text-white" href="/cupons">Cupons</Link></li>
              </ul>
            </div>
            <div className="col-md-2 col-6">
              <h6 className="text-uppercase mb-4 fw-bold">My Profile</h6>
              <ul className="list-unstyled d-grid gap-2">
                <li><Link className="text-decoration-none text-white" href="/profile">Orders List</Link></li>
                <li><Link className="text-decoration-none text-white" href="/profile">Addresses</Link></li>
                <li><Link className="text-decoration-none text-white" href="/profile">Manage Payments</Link></li>
                <li><Link className="text-decoration-none text-white" href="/profile">Eatsie Cash</Link></li>
                <li><Link className="text-decoration-none text-white" href="/profile">Support / Help</Link></li>
              </ul>
            </div>
            <div className="col-md-2 col-6">
              <h6 className="text-uppercase mb-4 fw-bold">Shop Pages</h6>
              <ul className="list-unstyled d-grid gap-2">
                <li><Link className="text-decoration-none text-white" href="/search">Search</Link></li>
                <li><Link className="text-decoration-none text-white" href="/listing">Listing</Link></li>
                <li><Link className="text-decoration-none text-white" href="/listing-detail">Listing Detail</Link></li>
                <li><Link className="text-decoration-none text-white" href="/product-detail">Product Detail</Link></li>
                <li><Link className="text-decoration-none text-white" href="/cart">Cart / Checkout</Link></li>
                <li><Link className="text-decoration-none text-white" href="/success-order">Success Order</Link></li>
              </ul>
            </div>
            <div className="col-md-2 col-6">
              <h6 className="text-uppercase mb-4 fw-bold">get in touch</h6>
              <ul className="list-unstyled d-grid gap-2">
                <li><a className="text-decoration-none text-white" href="#">Email</a></li>
                <li><a className="text-decoration-none text-white" href="#">Twitter</a></li>
                <li><a className="text-decoration-none text-white" href="#">Facebook</a></li>
                <li><a className="text-decoration-none text-white" href="#">Instagram</a></li>
                <li><a className="text-decoration-none text-white" href="#">Linkedin</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}