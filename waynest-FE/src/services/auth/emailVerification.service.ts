import { postJson } from "@/services/http/apiService";
import { EMAIL_VERIFICATION_ENDPOINTS } from "@/services/http/endpoints";

export const verifyEmailCode = async (code: string) =>
  postJson(EMAIL_VERIFICATION_ENDPOINTS.VERIFY, { code });

export const resendEmailVerificationCode = async (identifier: string) =>
  postJson(EMAIL_VERIFICATION_ENDPOINTS.RESEND, { identifier });
