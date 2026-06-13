export const dynamic = "force-dynamic";
import Link from "next/link";
import { listOrders } from "@lib/data/orders";
import { retrieveCustomer, signout } from "@lib/data/customer";
import AddressBook from "components/AddressBook"; 
import ProfileDetails from "components/ProfileDetails";
import { redirect } from "next/navigation";

export default async function ProfilePage(props: { params: Promise<{ countryCode: string }> }) {
  const params = await props.params;
  const countryCode = params.countryCode;

  // 🛡️ THE BULLETPROOF CUSTOMER FETCHER
  const rawCustomerData = await retrieveCustomer().catch(() => null);
  let customer = rawCustomerData?.customer || rawCustomerData;
  // 🛑 STRICT CHECK: Stop Ghost Sessions! 
  // If the object doesn't have an ID, they are NOT truly logged in.
  if (customer && !customer.id) {
    customer = null;
  }

  // 2. ONLY fetch orders if the customer exists!
  let ordersResponse = null;
  if (customer) {
    ordersResponse = await listOrders().catch((err) => {
      console.error("❌ Error fetching orders:", err);
      return null;
    });
  }
  
  // 3. Safely extract the orders
  const orders = ordersResponse?.orders || ordersResponse?.data || (Array.isArray(ordersResponse) ? ordersResponse : []);
  
  
  // Print exactly what Medusa hands us to your VS Code terminal!
  console.log("📦 Medusa Orders Response:", JSON.stringify(ordersResponse, null, 2));

  // Extract the orders whether they are hidden in .orders, .data, or just an array!

  const user = customer || {
    first_name: "Guest",
    last_name: "User",
    email: "guest@eatsie.com",
    phone: "Not provided",
    hasAccount: false,
  };

  async function handleLogout() {
    "use server";
    await signout(countryCode); 
  }

  return (
    <>
      {/* Top Banner */}
      <div className="bg-success py-5">
        <div className="container text-center text-white">
          <h1 className="fw-bold mb-2">My Profile</h1>
          <p className="lead m-0 text-white-50">Manage your account details and orders</p>
        </div>
      </div>

      <section className="py-5 bg-light osahan-main-body">
        <div className="container">
          <div className="row">
            
            {/* LEFT SIDEBAR: Navigation Menu */}
            <div className="col-lg-4 mb-4">
              <div className="bg-white rounded-3 shadow-sm p-4 text-center border">
                <img 
                  src="https://placehold.co/150x150/198754/FFFFFF/png?text=User" 
                  alt="Profile Avatar" 
                  className="img-fluid rounded-circle mb-3 shadow-sm"
                  style={{ width: "120px", height: "120px", objectFit: "cover" }}
                />
                <h5 className="fw-bold mb-1">{user.first_name} {user.last_name}</h5>
                <p className="text-muted mb-4">{user.email}</p>

                <div className="list-group list-group-flush text-start">
                  <Link href="#" className="list-group-item list-group-item-action text-success fw-bold">
                    <i className="icofont-ui-user me-2"></i> Account Details
                  </Link>
                  <Link href="#addresses" className="list-group-item list-group-item-action">
                    <i className="icofont-location-pin me-2"></i> Delivery Addresses
                  </Link>
                  <Link href={`/${countryCode}/orders`} className="list-group-item list-group-item-action">
                    <i className="icofont-list me-2"></i> Order History
                  </Link>
                  <Link href="/wishlist" className="list-group-item list-group-item-action">
                    <i className="icofont-heart me-2"></i> WishList
                  </Link>
                  <Link href={`/${countryCode}/subscriptions`} className="list-group-item list-group-item-action">
                    <i className="icofont-ui-calendar"></i> Subscriptions
                  </Link>
                  <Link href={`/${countryCode}/promos`} className="list-group-item list-group-item-action">
                    <i className="icofont-sale-discount me-2"></i> My Promos
                  </Link>
                  {/* <Link href="#ChangePassword" className="list-group-item list-group-item-action">
                    <i className="icofont-lock me-2"></i> Reset Password
                  </Link> */}
                  
                  {/* Show Login or Logout depending on if they have a real account */}
                  {user.hasAccount !== false ? (
                    
                    // 🚪 WRAP THE BUTTON IN A FORM TO CALL MEDUSA'S LOGOUT ACTION
                    <form action={handleLogout}>
                      <button type="submit" className="list-group-item list-group-item-action text-danger mt-3 fw-bold border-top w-100 text-start">
                        <i className="icofont-logout me-2"></i> Log Out
                      </button>
                    </form>

                  ) : (
                    <Link href={`/${countryCode}/login`} className="list-group-item list-group-item-action text-primary mt-3 fw-bold border-top">
                      <i className="icofont-login me-2"></i> Log In / Register
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT MAIN CONTENT: Profile Details & Orders */}
            <div className="col-lg-8">
              
              {!customer && (
                <div className="alert alert-warning border-warning border-opacity-50 shadow-sm mb-4">
                  <h6 className="fw-bold m-0">
                    <i className="icofont-warning text-warning fs-5 align-middle me-2"></i> 
                    You are currently viewing a Guest Profile. Please log in to see your real details.
                  </h6>
                </div>
              )}

{customer && <ProfileDetails customer={customer} />}

              {customer && (
                <AddressBook customer={customer} countryCode={countryCode} />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}