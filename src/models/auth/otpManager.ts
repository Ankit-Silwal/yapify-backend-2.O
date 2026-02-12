import REDIS_CLIENT from "../../config/redis.js";
import { generateOtp } from "../../utils/generateOtp.js";
import pool from "../../config/db.js";

const OTP_TTL = 300;

type ApiResponse = {
  success: boolean;
  message: string;
};

export async function generateAndStoreOtp(userId: string): Promise<string> {
  const otp = generateOtp();
  const key = `verify:otp:${userId}`;
  await REDIS_CLIENT.set(key, otp, { EX: OTP_TTL });
  return otp;
}

export async function generateAndStoreForgotPasswordOtp(userId: string): Promise<string> {
  const otp = generateOtp();
  const key = `verify:forgotPasswordOtp:${userId}`;
  await REDIS_CLIENT.set(key, otp, { EX: OTP_TTL });
  return otp;
}

export async function verifyAndConsumeOtp(userId: string, submittedOtp: string): Promise<ApiResponse> {
  const key = `verify:otp:${userId}`;
  const stored = await REDIS_CLIENT.get(key);
  if (!stored) {
    return {
      success: false,
      message: "OTP expired"
    };
  }
  if (stored !== submittedOtp) {
    return {
      success: false,
      message: "The OTP didn't match"
    };
  }
  await REDIS_CLIENT.del(key);
  const user = await pool.query(
    `UPDATE users
     SET is_verified = TRUE
     WHERE id = $1
     RETURNING id, email, is_verified`,
    [userId]
  );
  if (user.rowCount === 0) {
    return {
      success: false,
      message: "The required user doesn't exist"
    };
  }
  return {
    success: true,
    message: "The OTP was verified"
  };
}

export async function verifyAndConsumeForgotPasswordOtp(userId: string, submittedOtp: string): Promise<ApiResponse> {
  const key = `verify:forgotPasswordOtp:${userId}`;
  const stored = await REDIS_CLIENT.get(key);
  if (!stored) {
    return {
      success: false,
      message: "OTP expired"
    };
  }
  if (stored !== submittedOtp) {
    return {
      success: false,
      message: "The OTP didn't match"
    };
  }
  await REDIS_CLIENT.del(key);
  return {
    success: true,
    message: "The OTP was verified"
  };
}

export async function resendOtp(userId: string): Promise<string> {
  const key = `verify:otp:${userId}`;
  await REDIS_CLIENT.del(key);
  const otp = generateOtp();
  await REDIS_CLIENT.set(key, otp, { EX: OTP_TTL });
  return otp;
}

export async function verifyResentOtp(userId: string, submittedOtp: string): Promise<ApiResponse> {
  return verifyAndConsumeOtp(userId, submittedOtp);
}

export async function resendForgotPasswordOtp(userId: string): Promise<string> {
  const key = `verify:forgotPasswordOtp:${userId}`;
  await REDIS_CLIENT.del(key);
  const otp = generateOtp();
  await REDIS_CLIENT.set(key, otp, { EX: OTP_TTL });
  return otp;
}

export async function verifyResentForgotPasswordOtp(userId: string, submittedOtp: string): Promise<ApiResponse> {
  return verifyAndConsumeForgotPasswordOtp(userId, submittedOtp);
}
