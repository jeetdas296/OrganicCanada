import LoginRegisterForm from "components/LoginRegisterForm"; // Adjust import path if needed
import { retrieveCustomer } from "@lib/data/customer";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";

const rateLimits = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const windowMs = 60 * 1000; // 1 minute
  const max = 15; // Max 15 loads per minute
  const now = Date.now();
  
  let record = rateLimits.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
  } else {
    record.count++;
  }
  
  rateLimits.set(ip, record);
  
  // Cleanup occasionally
  if (Math.random() < 0.01) {
    Array.from(rateLimits.entries()).forEach(([k, v]) => {
      if (now > v.resetTime) rateLimits.delete(k);
    });
  }
  
  return record.count <= max;
}

export default async function LoginPage(props: { 
  params: Promise<{ countryCode: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const message = searchParams.message as string | undefined;

  // 0. Rate limiting block
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  
  if (!checkRateLimit(ip)) {
    return (
      <div className="bg-light py-5 min-vh-100 d-flex justify-content-center align-items-center">
        <div className="text-center">
          <h2 className="fw-bold text-danger mb-3">Too Many Requests</h2>
          <p className="text-muted">You are doing that too often. Please try again later.</p>
        </div>
      </div>
    );
  }
  
  // 1. Check if they are already logged in
  const customer = await retrieveCustomer().catch(() => null);

  // 2. If Medusa confirms they are logged in, send them straight to the profile!
  if (customer) {
    redirect(`/${params.countryCode}/profile`);
  }

  // Check for remembered email cookie securely
  const cookieStore = await cookies();
  const rememberedEmail = cookieStore.get("remembered_email")?.value || null;

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

        {message && (
          <div className="row justify-content-center mb-4">
            <div className="col-lg-5 col-md-8 col-sm-10">
              <div className="alert alert-success shadow-sm d-flex align-items-center" role="alert">
                <i className="icofont-check-circled fs-4 me-2"></i>
                <div>{message}</div>
              </div>
            </div>
          </div>
        )}
        
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-8 col-sm-10">
            {/* 🎯 Drop our interactive Client Component right here */}
            <LoginRegisterForm countryCode={params.countryCode} rememberedEmail={rememberedEmail} />
          </div>
        </div>
      </div>
    </div>
  );
}