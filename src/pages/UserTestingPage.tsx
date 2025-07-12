import { UserTestingDashboard } from '@/components/testing/UserTestingDashboard';

const UserTestingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <UserTestingDashboard />
      </div>
    </div>
  );
};

export default UserTestingPage;