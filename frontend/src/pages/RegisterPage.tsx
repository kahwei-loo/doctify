import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import RegisterForm from '@/features/auth/components/RegisterForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <FileText className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold text-foreground">Doctify</span>
          </Link>
        </div>

        {/* Register Card */}
        <Card className="shadow-xl border-border/50">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription>
              Get started with intelligent document processing
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <RegisterForm />
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Secure document intelligence powered by AI
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
