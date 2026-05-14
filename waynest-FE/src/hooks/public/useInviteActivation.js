import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { getApiErrorMessage } from "@/utils/errors";
import { activateInviteLink } from "@/api/auth";

export const useInviteActivation = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const fingerprint =
    typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEYS.deviceFingerprint)
      : null;
  const [status, setStatus] = useState(
    token && fingerprint ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    token
      ? fingerprint
        ? ""
        : t("invite.noFingerprint", {
            defaultValue:
              "Could not detect your device fingerprint. Please try again or use a different browser.",
          })
      : t("invite.invalidLink", {
          defaultValue: "Invalid invite link. No token found.",
        }),
  );

  useEffect(() => {
    if (!token || !fingerprint) {
      return;
    }

    const activate = async () => {
      try {
        await activateInviteLink(token);
        setStatus("success");
        setMessage(
          t("invite.activatedSuccess", {
            defaultValue:
              "Your device has been added successfully. You can now log in.",
          }),
        );
      } catch (error) {
        setStatus("error");
        setMessage(
          getApiErrorMessage(
            error,
            t("invite.alreadyUsedOrExpired", {
              defaultValue:
                "This invite link has already been used or has expired.",
            }),
          ),
        );
      }
    };

    void activate();
  }, [fingerprint, token]);

  return {
    message,
    status,
  };
};
