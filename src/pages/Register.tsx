import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer";
import { RegisterForm } from "@/components/auth/RegisterForm";

const Register = () => {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('token');
  const referralToken = searchParams.get('ref');
  const prefilledEmail = searchParams.get('email');
  const roleParam = searchParams.get('role');
  const initialRole = roleParam === 'agent' ? 'agent' : 'client';

  // If they arrived via a super-partner recruitment link (ref + role=agent),
  // lock the role so they cannot switch to Client.
  const lockedRole: "agent" | undefined =
    referralToken && roleParam === 'agent' ? 'agent' : undefined;

  // Persist referral token for post-signup attribution
  useEffect(() => {
    if (referralToken) {
      try {
        localStorage.setItem(
          'crunchcarbon_ref',
          JSON.stringify({ token: referralToken, link_type: lockedRole === 'agent' ? 'agent' : undefined }),
        );
      } catch {
        /* noop */
      }
    }
  }, [referralToken, lockedRole]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <Link to="/" className="flex items-center text-carbon-gray-600 hover:text-carbon-green-600">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to home
            </Link>
          </div>

          <div className="retro-card">
            <div className="text-center mb-10">
              <h1 className="text-2xl md:text-3xl font-bold text-carbon-gray-900">Create an account</h1>
              <p className="text-carbon-gray-600 mt-3">Join CrunchCarbon and start earning from carbon credits</p>
            </div>

            <RegisterForm
              initialRole={initialRole as "client" | "agent"}
              lockedRole={lockedRole}
              invitationToken={invitationToken || undefined}
              prefilledEmail={prefilledEmail || undefined}
            />

            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-carbon-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="text-carbon-green-600 hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Register;
