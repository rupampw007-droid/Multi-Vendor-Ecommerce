'use client';
import SignInWithGoogleButton from '@/shared/components';
import { useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { response } from 'express';
import { EyeIcon, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';

type FormData = {
  email: string;
  password: string;
};

const ForgotPassword = () => {
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(true);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [userData, setUserData] = useState<FormData | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const isOtpComplete = otp.every((digit) => digit.length === 1);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const startResendTimer = () => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const requestOtpMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/forgot-password-user`,
        { email },
      );
      return response.data;
    },
    onSuccess: (_, { email }) => {
      setUserEmail(email);
      setStep('otp');
      setServerError(null);
      setCanResend(false);
      startResendTimer();
    },
    onError: (error: AxiosError) => {
      const errormessage =
        (error.response?.data as { message?: string }).message ||
        'Invalid OTP. Try again!';
      setServerError(errormessage);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      if (!userEmail) {
        throw new Error('Email is required to verify OTP');
      }
      const otpCode = otp.join('');
      if (otpCode.length !== 4) {
        throw new Error('Please enter the 4-digit OTP');
      }
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/verify-forgot-password-user`,
        { email: userEmail, otp: otpCode },
      );
      return response.data;
    },
    onSuccess: () => {
      setStep('reset');
      setServerError(null);
    },
    onError: (error: AxiosError) => {
      const errorMessage = (error.response?.data as { message: string })
        .message;
      setServerError(errorMessage || 'Invalid OTP. Try again!');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ password }: { password: string }) => {
      if (!password) return;
      if (!userEmail) {
        throw new Error('Email is required to reset password');
      }
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/reset-password-user`,
        { email: userEmail, newPassword: password },
      );
      return response.data;
    },
    onSuccess: () => {
      setStep('email');
      toast.success(
        'Password reset successfully! Please login with your new password',
      );
      setServerError(null);
      router.push('/login');
    },
    onError: (error: AxiosError) => {
      const errorMessage = (error.response?.data as { message: string })
        .message;
      setServerError(
        errorMessage || 'Unable to reset password. Please try again.',
      );
    },
  });

  const handleotpChanage = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  const resendOtp = () => {
    if (userEmail) {
      requestOtpMutation.mutate({ email: userEmail });
      setTimer(60);
      setCanResend(false);
      startResendTimer();
    }
  };

  const onSubmitEmail = ({ email }: { email: string }) => {
    requestOtpMutation.mutate({ email });
  };

  const onSubmitPassword = ({ password }: { password: string }) => {
    resetPasswordMutation.mutate({ password });
  };

  return (
    <div className="w-full py-10 min-h-[85vh] bg-[#f1f1f1]">
      <h1 className="text-4xl font-Poppins font-semibold text-black text-center">
        Forgot Password
      </h1>
      <p className="text-center text-lg font-medium py-3 text-[#000099]">
        Home . Forgot Password
      </p>
      <div className="w-full flex justify-center">
        <div className="md:w-[480px] p-8 bg-white shadow rounded-lg">
          <p className="text-center text-gray-500 mb-4">
            Go back to?{' '}
            <Link href={'/login'} className="text-blue-500">
              Login
            </Link>
          </p>

          {serverError && (
            <p className="text-red-500 text-sm text-center mb-3 bg-red-50 border border-red-200 rounded p-2">
              {serverError}
            </p>
          )}

          {step === 'email' && (
            <>
              <form onSubmit={handleSubmit(onSubmitEmail)}>
                {/* Email */}
                <label className="block text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="rupambasak01@gmail.com"
                  className="w-full p-2 border focus:outline-none border-gray-300 rounded mb-1"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message: 'Invalid email address',
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mb-2">
                    {String(errors.email?.message)}
                  </p>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={requestOtpMutation.isPending}
                  className="w-full mt-2 py-2.5 bg-[#000099] hover:bg-[#0000cc] disabled:bg-[#000099]/60 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors duration-200"
                >
                  Submit
                </button>
              </form>
            </>
          )}
          {step === 'otp' && (
            <div className="">
              <h3 className="text-xl font-semibold text-center mb-4">
                Enter OTP
              </h3>
              <div className="flex justify-center gap-6 ">
                {otp?.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    ref={(el) => {
                      if (el) inputRefs.current[index] = el;
                    }}
                    maxLength={1}
                    className="w-12 h-12 text-center border border-gray-300 outline-none !rounded"
                    value={digit}
                    onChange={(e) => handleotpChanage(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  />
                ))}
              </div>
              <button
                className="w-full mt-4 text-lg cursor-pointer bg-blue-500 text-white py-2 disabled:cursor-not-allowed "
                disabled={verifyOtpMutation.isPending || !isOtpComplete}
                onClick={() => verifyOtpMutation.mutate()}
              >
                {verifyOtpMutation.isPending ? (
                  <p>Verifying OTP...</p>
                ) : (
                  <p>Verify OTP</p>
                )}
              </button>
              <p className="text-center text-sm mt-4">
                {canResend ? (
                  <button
                    onClick={resendOtp}
                    className="text-blue-500 cursor-pointer"
                  >
                    Resend
                  </button>
                ) : (
                  `Resend OTP in ${timer}s`
                )}
              </p>
              {verifyOtpMutation.isError &&
                verifyOtpMutation.error instanceof AxiosError && (
                  <p className="text-red-500 text-sm mt-2">
                    {(
                      verifyOtpMutation.error.response?.data as {
                        message: string;
                      }
                    )?.message || verifyOtpMutation.error.message}
                  </p>
                )}
            </div>
          )}
          {step === 'reset' && (
            <>
              <h3 className="text-xl font-semibold text-center mb-4">
                Reset Password
              </h3>
              <form onSubmit={handleSubmit(onSubmitPassword)}>
                <label className="block text-gray-700 mb-1">New Password</label>
                <div className="w-full p-2 border border-gray-300 rounded mb-1 flex items-center justify-between">
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    placeholder="abcd@123"
                    className="flex-1 outline-none border-none focus:outline-none focus:ring-0"
                    {...register('password', {
                      required: 'Password is required',
                      pattern: {
                        value:
                          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                        message:
                          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
                      },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    {passwordVisible ? (
                      <EyeIcon size={18} />
                    ) : (
                      <EyeOff size={18} />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p className="text-red-500 text-sm mb-2">
                    {String(errors.password.message)}
                  </p>
                )}

                <button
                  type="submit" // ✅ let handleSubmit drive this
                  className="w-full mt-4 text-lg cursor-pointer bg-blue-500 text-white py-2 disabled:cursor-not-allowed"
                  disabled={resetPasswordMutation.isPending} // ✅ correct disable condition
                >
                  {resetPasswordMutation.isPending
                    ? 'Resetting...'
                    : 'Reset Password'}{' '}
                  {/* ✅ correct labels */}
                </button>

                {serverError && (
                  <p className="text-red-500 text-sm mt-2">{serverError}</p>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
