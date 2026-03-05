/**
 * WelcomeEmptyState Component
 *
 * Welcome screen for new users with guided onboarding steps.
 * Week 6 Dashboard Optimization
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Database, Bot, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OnboardingStep {
  number: number;
  icon: React.ElementType;
  title: string;
  description: string;
  action: string;
  path: string;
  completed?: boolean;
}

interface WelcomeEmptyStateProps {
  userName?: string;
  hasDocuments?: boolean;
  hasKnowledgeBases?: boolean;
  hasAssistants?: boolean;
  className?: string;
}

const WelcomeEmptyState: React.FC<WelcomeEmptyStateProps> = ({
  userName,
  hasDocuments = false,
  hasKnowledgeBases = false,
  hasAssistants = false,
  className,
}) => {
  const navigate = useNavigate();

  const steps: OnboardingStep[] = [
    {
      number: 1,
      icon: Upload,
      title: "Upload your first document",
      description: "Start by uploading a PDF, image, or document for AI processing.",
      action: "Upload Document",
      path: "/documents",
      completed: hasDocuments,
    },
    {
      number: 2,
      icon: Database,
      title: "Create a knowledge base",
      description: "Organize your documents into searchable knowledge bases.",
      action: "Create KB",
      path: "/knowledge-base",
      completed: hasKnowledgeBases,
    },
    {
      number: 3,
      icon: Bot,
      title: "Build an AI assistant",
      description: "Create an AI assistant that can answer questions about your documents.",
      action: "Create Assistant",
      path: "/assistants",
      completed: hasAssistants,
    },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  const allCompleted = completedSteps === steps.length;

  // If all steps are completed, don't show welcome state
  if (allCompleted) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">
          Welcome to Doctify{userName ? `, ${userName}` : ""}!
        </CardTitle>
        <CardDescription className="text-base">
          Let's set up your workspace in 3 easy steps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.completed ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {step.completed ? <CheckCircle2 className="h-5 w-5" /> : step.number}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 ${step.completed ? "bg-green-500" : "bg-muted"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Steps list */}
        <div className="space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  step.completed
                    ? "bg-green-500/5 border-green-500/20"
                    : "hover:bg-muted/50 cursor-pointer"
                }`}
                onClick={() => !step.completed && navigate(step.path)}
              >
                <div
                  className={`p-2.5 rounded-lg ${
                    step.completed ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${step.completed ? "text-green-600" : ""}`}>
                    {step.completed ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {step.title}
                      </span>
                    ) : (
                      step.title
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {!step.completed && (
                  <Button variant="outline" size="sm">
                    {step.action}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => navigate("/documents")}>
            Explore Dashboard
          </Button>
          <Button onClick={() => navigate(steps.find((s) => !s.completed)?.path || "/documents")}>
            <Sparkles className="mr-2 h-4 w-4" />
            Start Quick Setup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeEmptyState;
