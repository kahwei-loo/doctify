import React, { useState } from "react";
import { Mail, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store";
import { selectUser } from "@/store/selectors/authSelectors";
import { useUpdateProfileMutation } from "@/store/api/authApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AccountTabProps {
  isDemoMode: boolean;
}

export const AccountTab: React.FC<AccountTabProps> = ({ isDemoMode }) => {
  const user = useAppSelector(selectUser);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await updateProfile({ full_name: fullName }).unwrap();
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to update profile");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Update your personal information</p>
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="email" value={user?.email || ""} disabled className="pl-10 bg-muted" />
          </div>
          <p className="text-xs text-muted-foreground">Email cannot be changed</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            disabled={isDemoMode}
            className={cn(isDemoMode && "bg-muted")}
          />
        </div>
      </div>
      <div className="border-t border-border mt-6 pt-6 flex justify-end">
        <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile || isDemoMode}>
          {isUpdatingProfile ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
};
