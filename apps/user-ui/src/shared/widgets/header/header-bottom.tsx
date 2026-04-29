'use client';

import { CartIcon } from '@/assets/svgs/cart-icon';
import ProfileIcon from '@/assets/svgs/profie-icon';
import { navItems } from '@/configs/constants';
import { AlignLeft, ChevronDownIcon, HeartIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const HeaderBottom = () => {
  const [show, setShow] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`w-full transition-all duration-300 ${
        isSticky ? 'fixed top-0 left-0 z-[100] bg-white shadow-lg' : 'relative'
      }`}
    >
      <div
        className={`w-[80%] m-auto flex items-center ${isSticky ? 'py-3' : 'py-0'}`}
      >
        {/* All Departments dropdown trigger */}
        <div
          className={`w-[260px] ${isSticky && 'mb-2'} cursor-pointer flex items-center justify-between px-5 h-[50px] bg-[#3489ff]`}
          onClick={() => setShow(!show)}
        >
          <div className="flex items-center gap-2">
            <AlignLeft color="white" />
            <span className="text-white font-medium">All Departments</span>
          </div>
          <ChevronDownIcon color="white" />
        </div>

        {/* Dropdown menu */}
        {show && (
          <div
            className={`absolute left-[10%] ${
              isSticky ? 'top-[70px]' : 'top-[50px]'
            } w-[260px] h-[400px] bg-[#f5f5f5] shadow-md z-50`}
          />
        )}

        {/* Navigation Links */}
        <div className="flex items-center">
          {navItems.map((i: NavItemsTypes, index: number) => (
            <Link className="px-5 font-medium text-lg" href={i.href} key={index}>
              {i.title}
            </Link>
          ))}
        </div>

        <div>
          {isSticky && (
            <div className="flex items-center gap-5">
              <Link href="/login" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <ProfileIcon />
                </div>
                <div>
                  <span className="block font-medium text-sm">Hello,</span>
                  <span className="block font-semibold text-sm">Sign In</span>
                </div>
              </Link>

              <Link href="/wishlist" className="relative">
                <HeartIcon />
                <div className="w-5 h-5 border-2 border-white bg-red-500 rounded-full flex items-center justify-center absolute -top-2 -right-2">
                  <span className="text-white font-medium text-[10px]">0</span>
                </div>
              </Link>

              <Link href="/cart" className="relative">
                <CartIcon />
                <div className="w-5 h-5 border-2 border-white bg-red-500 rounded-full flex items-center justify-center absolute -top-2 -right-2">
                  <span className="text-white font-medium text-[10px]">0</span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderBottom;
