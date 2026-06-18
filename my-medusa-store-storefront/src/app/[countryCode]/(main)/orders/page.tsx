export const dynamic = "force-dynamic";

import Link from "next/link";
import { listOrders } from "@lib/data/orders";
import { retrieveCustomer } from "@lib/data/customer";
import OrderHistory from "components/OrderHistory";
import { redirect } from "next/navigation";

export default async function OrdersPage(props: { params: Promise<{ countryCode: string }>; searchParams: Promise<{ page?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const countryCode = params.countryCode;

  // 1. Fetch the customer securely
  const rawCustomerData = await retrieveCustomer().catch(() => null);
  let customer = rawCustomerData?.customer || rawCustomerData;

  // Stop Ghost Sessions
  if (customer && !customer.id) {
    customer = null;
  }

  // If they aren't logged in, redirect them to the login page!
  if (!customer) {
    redirect(`/${countryCode}/login`);
  }

  // 2. Fetch the orders for the logged-in user
  let ordersResponse = await listOrders().catch((err) => {
    console.error("❌ Error fetching orders:", err);
    return null;
  });

  const orders = ordersResponse?.orders || ordersResponse?.data || (Array.isArray(ordersResponse) ? ordersResponse : []);
  const itemsPerPage = 10;
  const currentPage = parseInt(searchParams.page || "1", 10);
  const totalPages = Math.ceil(orders.length / itemsPerPage);

  // Slice the array to get ONLY the 10 items for the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = orders.slice(startIndex, endIndex);
  return (
    <>
      {/* Top Banner */}
      <div className="bg-success py-5">
        <div className="container text-center text-white">
          <h1 className="fw-bold mb-2">My Orders</h1>
          <p className="lead m-0 text-white-50">View and track your past orders</p>
        </div>
      </div>

      <section className="py-5 bg-light osahan-main-body min-vh-100">
        <div className="container">

          {/* Back Button */}
          <div className="mb-4">
            <Link href={`/${countryCode}/profile`} className="btn btn-outline-success fw-bold px-4">
              <i className="icofont-arrow-left me-2"></i> Back to Profile
            </Link>
          </div>

          {/* Main Content Area */}
          <div className="bg-white rounded-3 shadow-sm p-4 border">
            <h4 className="fw-bold mb-4">Order History</h4>
            <OrderHistory
              orders={paginatedOrders}
              currentPage={currentPage}
              totalPages={totalPages}
            />
          </div>

        </div>
      </section>
    </>
  );
}