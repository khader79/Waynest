import { useEffect, useState } from "react";
import { useAuth } from "@/core/providers/AuthContext";
import { fetchUserProfile } from "@/services/user/user.service";

type UserProfileView = {
  email: string;
  fullName: string;
  phone: string;
};

export const useUserProfilePage = () => {
  const { loading: authLoading, user } = useAuth();
  const [profile, setProfile] = useState<UserProfileView>({
    email: "",
    fullName: "",
    phone: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (authLoading || !user?.userId) {
        return;
      }

      try {
        const payload = await fetchUserProfile(user.userId);
        setProfile({
          email: payload.email || "",
          fullName: `${payload.firstName ?? ""} ${payload.lastName ?? ""}`.trim(),
          phone: payload.phone || "",
        });
      } catch {
        setProfile({
          email: "",
          fullName: "",
          phone: "",
        });
      }
    };

    void loadProfile();
  }, [authLoading, user?.userId]);

  return profile;
};
