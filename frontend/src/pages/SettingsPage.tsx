import React, { useState } from "react";
import { Lock, User, Bell, Shield, Key, Bot } from "lucide-react";
import { useAppSelector } from "@/store";
import { selectUser, selectIsSuperuser } from "@/store/selectors/authSelectors";
import { useDemoMode } from "@/features/demo/hooks/useDemoMode";
import {
  AccountTab,
  SecurityTab,
  ApiKeysTab,
  AIModelsTab,
  NotificationsSection,
} from "@/features/settings";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/components/ui/project-avatar";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "ai-models", label: "AI Models", icon: Bot, adminOnly: true },
];

const SettingsPage: React.FC = () => {
  const { isDemoMode } = useDemoMode();
  const isSuperuser = useAppSelector(selectIsSuperuser);
  const user = useAppSelector(selectUser);
  const [activeSection, setActiveSection] = useState("profile");

  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || isSuperuser);

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <AccountTab isDemoMode={isDemoMode} />;
      case "notifications":
        return <NotificationsSection isDemoMode={isDemoMode} />;
      case "security":
        return <SecurityTab isDemoMode={isDemoMode} />;
      case "api-keys":
        return <ApiKeysTab isDemoMode={isDemoMode} />;
      case "ai-models":
        return isSuperuser ? <AIModelsTab /> : null;
      default:
        return <AccountTab isDemoMode={isDemoMode} />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                  Settings are read-only in demo mode
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-0.5">
                  Sign up to modify your account settings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Nav — horizontal scroll */}
      <div className="flex md:hidden overflow-x-auto gap-1 pb-3 -mb-3">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm rounded-lg whitespace-nowrap transition-colors",
                activeSection === item.id
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {item.adminOnly && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Admin
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop Layout — sidebar + content */}
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="hidden md:block w-52 flex-shrink-0">
          <div className="sticky top-24">
            {/* User Identity */}
            <div className="flex items-center gap-3 mb-6 px-3">
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm flex-shrink-0">
                {getInitials(user?.full_name || user?.email || "U")}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{user?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
              </div>
            </div>

            {/* Nav Items */}
            <nav className="space-y-1">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors",
                      activeSection === item.id
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {item.adminOnly && (
                      <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                        Admin
                      </Badge>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 max-w-2xl">{renderContent()}</div>
      </div>
    </div>
  );
};

export default SettingsPage;
