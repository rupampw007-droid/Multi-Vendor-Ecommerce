'use client';
import SignInWithGoogleButton from '@/shared/components';
import { useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { EyeIcon, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

type FormData = {
  email: string;
  password: string;
  name: string;
};

const Signup = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false)
  const [timer, setTimer] = useState(60)
  const [showotp, setShowotp] = useState(false)
  const [otp, setOtp] = useState<string[]>(['', '', '', ''])
  const [userData, setUserData] = useState<FormData | null>(null)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const startResendTimer = () => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if(prev <= 1) {
          clearInterval(interval)
          setCanResend(true);
          return 0;
        }
        return prev-1
      })
    }, 1000)
  }

  const verifyOtoMutation = useMutation({
    mutationFn: async () => {
      if(!userData) return;
      const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/verify-user`,
        {
          ...userData,
          otp: otp.join("")
        }
      )
      return response.data
    },
    onSuccess: () => router.push('/login')
  })

  const signupMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/user-registration`, data)
      return response.data
    },
    onSuccess: (_, formData) => {
      setUserData(formData)
      setShowotp(true)
      setCanResend(false)
      setTimer(60)
      startResendTimer();
    } 
  }
  )

  const onSubmit = async (data: FormData) => {
    console.log(data)
    setServerError(null);
    try {
      signupMutation.mutate(data, {
        onError: () => setServerError('Something went wrong')
      })
      console.log({ ...data });
    } catch (err) {
      setServerError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
    
  };

  const handleotpChanage = (index : number, value : string) => {
    if(!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if(value && index < inputRefs.current.length-1) {
      inputRefs.current[index+1]?.focus()
    }
  }

  const handleOtpKeyDown = (index:number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if(e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index-1]?.focus()
    }
  }

   const resendOtp = () => {
    if(userData) {
      signupMutation.mutate(userData)
    }
  }

  return (
    <div className="w-full py-10 min-h-[85vh] bg-[#f1f1f1]">
      <h1 className="text-4xl font-Poppins font-semibold text-black text-center">
        Signup
      </h1>
      <p className="text-center text-lg font-medium py-3 text-[#000099]">
        Home . Signup
      </p>
      <div className="w-full flex justify-center">
        <div className="md:w-[480px] p-8 bg-white shadow rounded-lg">
          <p className="text-center text-gray-500 mb-4">
            Aleady have an account?{' '}
            <Link href={'/login'} className="text-blue-500">
              Sign in
            </Link>
          </p>
          <div className="w-full flex justify-center">
            <SignInWithGoogleButton />
          </div>

          <div className="flex items-center my-5 text-gray-400 text-sm">
            <div className="flex-1 border-t border-gray-300" />
            <span className="px-3">or Sign in with Email</span>
            <div className="flex-1 border-t border-gray-300" />
          </div>

          {serverError && (
            <p className="text-red-500 text-sm text-center mb-3 bg-red-50 border border-red-200 rounded p-2">
              {serverError}
            </p>
          )}

          {!showotp? (
            <form onSubmit={handleSubmit(onSubmit)}>
            {/* Name */}
            <label className="block text-gray-700 mb-1">Name</label>
            <input
              type="text"
              placeholder="Rupam Basak"
              className="w-full p-2 border focus:outline-none border-gray-300 rounded mb-1"
              {...register('name', {
                required: 'Name is required',
              })}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mb-2">
                {String(errors.name?.message)}
              </p>
            )}

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

            {/* Password */}
            <label className="block text-gray-700 mb-1">Password</label>
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
                {passwordVisible ? <EyeIcon size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mb-2">
                {String(errors.password.message)}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={signupMutation.isPending}
              className="w-full mt-2 py-2.5 bg-[#000099] hover:bg-[#0000cc] disabled:bg-[#000099]/60 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors duration-200"
              
            >
              {isLoading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>
          ) : (
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
                      if(el) inputRefs.current[index] = el
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
                disabled={verifyOtoMutation.isPending}
                onClick={() => verifyOtoMutation.mutate()}
              >
               {verifyOtoMutation.isPending? (
                <p>Verifying OTP...</p>
               ): (
                <p>Verify OTP</p>
               )}
              </button>
              <p className="text-center text-sm mt-4">
                {canResend? (
                  <button
                  onClick={resendOtp}
                  className="text-blue-500 cursor-pointer">Resend</button>
                ) : (
                  `Resend OTP in ${timer}s`
                ) }
              </p>
              {verifyOtoMutation.isError && verifyOtoMutation.error instanceof AxiosError && (
                <p className="text-red-500 text-sm mt-2">
                  {
                    verifyOtoMutation.error.response?.data?.message || verifyOtoMutation.error.message
                  }
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
