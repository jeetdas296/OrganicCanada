import LoginRegisterForm from "components/LoginRegisterForm"; // Adjust import path if needed
import { retrieveCustomer } from "@lib/data/customer";
import { redirect } from "next/navigation";

export default async function LoginPage(props: { params: Promise<{ countryCode: string }> }) {
  const params = await props.params;
  
  // 1. Check if they are already logged in
  const customer = await retrieveCustomer().catch(() => null);

  // 2. If Medusa confirms they are logged in, send them straight to the profile!
  if (customer) {
    redirect(`/${params.countryCode}/profile`);
  }

  // 3. Otherwise, draw the beautiful auth screen
  return (
    <div className="bg-light py-5 min-vh-100 d-flex align-items-center osahan-main-body">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-8 col-sm-10 text-center mb-4">
            <h2 className="fw-bold mb-2">Welcome to Eatsie</h2>
            <p className="text-muted">Sign in to track your orders and save your favorites.</p>
          </div>
        </div>
        
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-8 col-sm-10">
            {/* 🎯 Drop our interactive Client Component right here */}
            <LoginRegisterForm countryCode={params.countryCode} />
          </div>
        </div>
      </div>
    </div>
  );
}