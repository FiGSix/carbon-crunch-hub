

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthTabSwitcherProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  registerContent: React.ReactNode;
  loginContent: React.ReactNode;
}

export function AuthTabSwitcher({
  activeTab,
  onTabChange,
  registerContent,
  loginContent
}: AuthTabSwitcherProps) {
  return (
    <Tabs 
      value={activeTab} 
      onValueChange={onTabChange} 
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="register">New User</TabsTrigger>
        <TabsTrigger value="login">Returning User</TabsTrigger>
      </TabsList>
      
      <TabsContent value="register">
        {registerContent}
      </TabsContent>
      
      <TabsContent value="login">
        {loginContent}
      </TabsContent>
    </Tabs>
  );
}
