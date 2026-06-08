'use client';
import SignInWithGoogleButton from '@/shared/components';
import { useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { EyeIcon, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

type FormData = {
  email: string;
  password: string;
};

const Login = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const loginMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/login-user`,
        data,
        { withCredentials: true },
      );
      return response.data
    },
    onSuccess: (data) => {
      setServerError(null);
      router.push('/')
    },
    onError: (error: AxiosError) => {
      const errorMessage = (error.response?.data as {message?: string})?.message || "Invalid creadentials!"
      setServerError(errorMessage)
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      // your auth logic here
      loginMutation.mutate(data)
    } catch (err) {
      setServerError('Invalid email or password. Please try again.');
    } 
  };

  return (
    <div className="w-full py-10 min-h-[85vh] bg-[#f1f1f1]">
      <h1 className="text-4xl font-Poppins font-semibold text-black text-center">
        Login
      </h1>
      <p className="text-center text-lg font-medium py-3 text-[#000099]">
        Home . Login
      </p>
      <div className="w-full flex justify-center">
        <div className="md:w-[480px] p-8 bg-white shadow rounded-lg">
          <p className="text-center text-gray-500 mb-4">
            Don't have an account?{' '}
            <Link href={'/signup'} className="text-blue-500">
              Sign up
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

          <form onSubmit={handleSubmit(onSubmit)}>
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

            {/* Remember Me + Forgot Password */}
            <div className="flex items-center justify-between my-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                Remember me
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-blue-500 hover:text-blue-700 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full mt-2 py-2.5 bg-[#000099] hover:bg-[#0000cc] disabled:bg-[#000099]/60 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors duration-200"
            >
              {loginMutation?.isPending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
