"use client"
import GoogleButton from '@/assets/svgs/google-icon';
import SignInWithGoogleButton from '@/shared/components';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'
import {Form, useForm} from 'react-hook-form'

type FormData = {
    email: string;
    password: string;
}

const Login = () => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null)
    const [rememberMe, setRememberMe] = useState(false)
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState : {errors}
    } = useForm<FormData>()

    const onSubmit = (data: FormData) => {

    }
  return (
    <div className='w-full py-10 min-h-[85vh] bg-[#f1f1f1]' >
        <h1 className='text-4xl font-Poppins font-semibold text-black text-center'>
            Login
        </h1>
        <p className='text-center text-lg font-medium py-3 text-[#000099]'>
            Home . Login
        </p>
    <div className="w-full flex justify-center">
        <div className=" md:w-[480px] p-8 bg-white shadow rounded-lg">
            <h3 className='text-3xl font-semibold text-center mb-2'>

            </h3>
            <p className='text-center text-gray-500 mb-4'>
                Don't have an account?{" "}
                <Link href={'/signup'} className='text-blue-500'>
                    Sign up
                </Link>
            </p>
            <div className='w-full flex justify-center' >
                <SignInWithGoogleButton />
            </div>
            
            <div className="flex items-center my-5 text-gray-400 text-sm">
                <div className="flex-1 border-t border-gray-300"/>
                <span className='px-3' >or Sign in with Email</span>
                <div className="flex-1 border-t border-gray-300"/>

            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
                <label className='block text-gray-700 mb-1'>Email</label>
                <input
                    type="email"
                    placeholder='rupambasak01@gmail.com'
                    className='w-full p-2 border border-gray-300 outline-0 rounded mb-1'
                    {...register("email", {
                        required: "Email is required",
                        pattern: {
                            value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 
                            message: "Invalid email address"
                        }
                    })}
                />
                {errors.email && (
                    <p className='text-red-500 text-sm'>
                        {String(errors.email.message)}
                    </p>
                )}
            </form>
        </div>
    </div>
    </div>
  )
}

export default Login