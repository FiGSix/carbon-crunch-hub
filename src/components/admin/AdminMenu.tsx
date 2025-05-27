
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AdminMenu() {
  const navigate = useNavigate();

  const adminTools = [
    {
      title: 'Bulk PDF Generation',
      description: 'Generate PDFs for all proposals missing them',
      icon: FileText,
      path: '/admin/bulk-pdf-generation',
      color: 'text-blue-600'
    },
    {
      title: 'User Management',
      description: 'Manage users and their roles',
      icon: Users,
      path: '/admin/users',
      color: 'text-green-600',
      disabled: true
    },
    {
      title: 'Analytics',
      description: 'View system analytics and reports',
      icon: BarChart3,
      path: '/admin/analytics',
      color: 'text-purple-600',
      disabled: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {adminTools.map((tool, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <tool.icon className={`h-5 w-5 ${tool.color}`} />
              {tool.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{tool.description}</p>
            <Button 
              onClick={() => navigate(tool.path)}
              disabled={tool.disabled}
              className="w-full"
            >
              {tool.disabled ? 'Coming Soon' : 'Open'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
