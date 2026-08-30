'use client';
import { StripeLogo } from '@/assets/svgs/stripe-logo';
import CreateShop from '@/shared/modules/auth/create-shop';
import { useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { Eye, EyeOff, Store, Landmark, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';



const STEPS = [
  { label: 'Create Account', icon: UserRound },
  { label: 'Setup Shop', icon: Store },
  { label: 'Connect Bank', icon: Landmark },
];

const Signup = () => {
  const [activeStep, setActiveStep] = useState(3);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [timer, setTimer] = useState(60);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [sellerData, setSellerData] = useState<FormData | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [sellerId, setSellerId] = useState("")
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

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

  const resendOtp = () => {
    setCanResend(false);
    setTimer(60);
    startResendTimer();
  };

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      if (!sellerData) return;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/verify-seller`,
        {
          ...sellerData,
          otp: otp.join(''),
        },
      );
      return response.data;
    },
    onSuccess: (data) => {
      setSellerId(data?.seller?.id)
      setActiveStep(2)
    },
    onError: () => setServerError('Invalid or expired OTP. Please try again.'),
  });

  const signupMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/seller-registration`,
        data,
      );
      return response.data;
    },
    onSuccess: (_, formData) => {
      setSellerData(formData);
      setShowOtp(true);
      setCanResend(false);
      setTimer(60);
      startResendTimer();
    },
    onError: (error) => {
  if (error instanceof AxiosError) {
    console.log("STATUS:", error.response?.status);
    console.log("ERROR:", error.response?.data);
    console.log("MESSAGE:", error.message);

    setServerError(
      error.response?.data?.message ||
      error.message ||
      "Something went wrong"
    );
  }
}
  });

  const onSubmit = (data: any) => {
    setServerError(null);
    signupMutation.mutate(data);
  };

  const handleOtpChange = (index: number, value: string) => {
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

  const inputClass = (hasError?: boolean) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:ring-2 focus:ring-offset-0 ${
      hasError
        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
        : 'border-slate-300 focus:border-[#000099] focus:ring-[#000099]/10'
    }`;

    const connectStripe = async (params:type) => {
      try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/create-stripe-link`, {sellerId})
        if(response.data.url) {
          window.location.href = response.data.url
      
        }
      } catch (error) {
        console.log(error)
      }
    }

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center px-4 pt-12 pb-16">
      {/* Stepper */}
      <div className="w-full max-w-md mb-8">
        <div className="relative flex items-start justify-between">
          {/* connector track */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 mx-5" />
          <div
            className="absolute top-5 left-0 h-0.5 bg-[#000099] mx-5 transition-all duration-300"
            style={{
              width:
                activeStep === 1
                  ? '0%'
                  : `calc(${((activeStep - 1) / (STEPS.length - 1)) * 100}% - 10px)`,
            }}
          />

          {STEPS.map((step, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === activeStep;
            const isDone = stepNum < activeStep;
            const Icon = step.icon;
            return (
              <div
                key={step.label}
                className="relative z-10 flex flex-col items-center gap-2 w-1/3"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                    isDone
                      ? 'border-[#000099] bg-[#000099] text-white'
                      : isActive
                        ? 'border-[#000099] bg-white text-[#000099]'
                        : 'border-slate-300 bg-white text-slate-400'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <span
                  className={`text-xs text-center font-medium ${
                    isActive || isDone ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        {activeStep === 1 && (
          <>
            {!showOtp ? (
              <>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                  Create your seller account
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                  Step 1 of 3 — you can set up your shop next.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                  {/* Name */}
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Rupam Basak"
                    className={inputClass(!!errors.name)}
                    {...register('name', {
                      required: 'Name is required',
                    })}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1.5 mb-3">
                      {String(errors.name.message)}
                    </p>
                  )}
                  {!errors.name && <div className="mb-4" />}

                  {/* Email */}
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="rupambasak01@gmail.com"
                    className={inputClass(!!errors.email)}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value:
                          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                        message: 'Invalid email address',
                      },
                    })}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1.5 mb-3">
                      {String(errors.email.message)}
                    </p>
                  )}
                  {!errors.email && <div className="mb-4" />}

                  {/* phone number */}
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <div className={`${inputClass(!!errors.password)} flex items-center justify-between py-0`}>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      className="flex-1 bg-transparent py-2.5 outline-none border-none focus:ring-0"
                      {...register('phone_number', {
                        required: 'Phone number is required',
                        pattern: {
                          value:
                           /^[6-9][0-9]{9}$/ ,
                          message:
                            'Invalid phone number pattern',
                        },
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordVisible((v) => !v)}
                      className="ml-2 text-slate-400 hover:text-slate-600"
                      aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                    >
                      {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password */}
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className={`${inputClass(!!errors.password)} flex items-center justify-between py-0`}>
                    <input
                      type={passwordVisible ? 'text' : 'password'}
                      placeholder="abcd@123"
                      className="flex-1 bg-transparent py-2.5 outline-none border-none focus:ring-0"
                      {...register('password', {
                        required: 'Password is required',
                        pattern: {
                          value:
                            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                          message:
                            'Must be 8+ characters with upper, lower, number, and symbol',
                        },
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordVisible((v) => !v)}
                      className="ml-2 text-slate-400 hover:text-slate-600"
                      aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                    >
                      {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1.5 mb-3">
                      {String(errors.password.message)}
                    </p>
                  )}
                  {!errors.password && <div className="mb-5" />}

                  {serverError && (
                    <p className="text-red-500 text-sm mb-4 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                      {serverError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={signupMutation.isPending}
                    className="w-full py-2.5 bg-[#000099] hover:bg-[#0000cc] disabled:bg-[#000099]/60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                  >
                    {signupMutation.isPending ? 'Signing up…' : 'Sign Up'}
                  </button>

                  <p className="text-center text-sm text-slate-500 mt-4">
                    Already have an account?{' '}
                    <Link href="/login" className="text-[#000099] font-medium hover:underline">
                      Log in
                    </Link>
                  </p>
                </form>
              </>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 text-center mb-1">
                  Verify your email
                </h3>
                <p className="text-sm text-slate-500 text-center mb-6">
                  Enter the 4-digit code sent to{' '}
                  <span className="font-medium text-slate-700">{sellerData?.email}</span>
                </p>

                <div className="flex justify-center gap-3 mb-6">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      inputMode="numeric"
                      ref={(el) => {
                        if (el) inputRefs.current[index] = el;
                      }}
                      maxLength={1}
                      className="w-12 h-12 text-center text-lg font-semibold border border-slate-300 rounded-lg outline-none focus:border-[#000099] focus:ring-2 focus:ring-[#000099]/10"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    />
                  ))}
                </div>

                <button
                  className="w-full py-2.5 bg-[#000099] hover:bg-[#0000cc] disabled:bg-[#000099]/60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                  disabled={verifyOtpMutation.isPending || otp.some((d) => !d)}
                  onClick={() => verifyOtpMutation.mutate()}
                >
                  {verifyOtpMutation.isPending ? 'Verifying…' : 'Verify OTP'}
                </button>

                <p className="text-center text-sm mt-4 text-slate-500">
                  {canResend ? (
                    <button
                      onClick={resendOtp}
                      className="text-[#000099] font-medium hover:underline"
                    >
                      Resend code
                    </button>
                  ) : (
                    `Resend code in ${timer}s`
                  )}
                </p>

                {verifyOtpMutation.isError && (
                  <p className="text-red-500 text-sm mt-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-center">
                    {verifyOtpMutation.error instanceof AxiosError
                      ? verifyOtpMutation.error.response?.data?.message ||
                        verifyOtpMutation.error.message
                      : serverError}
                  </p>
                )}
              </div>
            )}
          </>
        )}
        {activeStep === 2 && (
          <CreateShop sellerId={sellerId} setActiveStep={setActiveStep}/>
        )}
        {activeStep === 3 && (
          <div className='text-center'>
            <h3 className='text-2xl font-semibold'>Withdraw Method</h3>
            <br/>
            <button onClick={connectStripe}>
              Connect Stripe <StripeLogo/>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Signup;