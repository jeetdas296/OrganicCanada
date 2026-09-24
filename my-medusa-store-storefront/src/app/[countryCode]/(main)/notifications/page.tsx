import NotificationsList from "@modules/account/components/notifications"
import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Notifications",
  description: "View your notifications and updates.",
}

export default async function NotificationsPage(props: { params: Promise<{ countryCode: string }> }) {
  const params = await props.params;
  const countryCode = params.countryCode;

  return (
    <>
      {/* Top Banner */}
      <div className="bg-success py-5">
        <div className="container text-center text-white">
          <h1 className="fw-bold mb-2">My Notifications</h1>
          <p className="lead m-0 text-white-50">View all your recent updates and alerts</p>
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
            <NotificationsList />
          </div>

        </div>
      </section>
    </>
  )
}
