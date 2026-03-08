import React from "react";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="relative mx-auto w-32 h-32 mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center">
              <FileQuestion className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">?</span>
          </div>
        </div>

        {/* Text */}
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          Oops! The page you're looking for doesn't exist or has been moved. Let's get you back on
          track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button onClick={() => navigate("/dashboard")}>
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </div>

        {/* Suggestions */}
        <div className="mt-12 pt-8 border-t border-border">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            You might be looking for:
          </h3>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="ghost" size="sm" onClick={() => navigate("/documents")}>
              Documents
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
              Projects
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
              Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
