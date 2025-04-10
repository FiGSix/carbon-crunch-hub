
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer";
import { RegisterForm } from "@/components/auth/RegisterForm";

const Register = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'agent' ? 'agent' : 'client';
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md px-4">
          <div className="mb-6">
            <Link to="/" className="flex items-center text-carbon-gray-600 hover:text-carbon-green-600">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to home
            </Link>
          </div>
          
          <div className="retro-card">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-carbon-gray-900">Create an account</h1>
              <p className="text-carbon-gray-600 mt-2">Join CrunchCarbon and start earning from carbon credits</p>
            </div>
            
            <RegisterForm initialRole={initialRole as "client" | "agent"} />
            
            <div className="mt-6 text-center">
              <p className="text-carbon-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="text-carbon-green-600 hover:underline">
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
