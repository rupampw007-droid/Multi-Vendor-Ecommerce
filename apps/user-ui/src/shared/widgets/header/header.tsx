import { CartIcon } from '@/assets/svgs/cart-icon';
import { HeartIcon } from '@/assets/svgs/heart-icon';
import ProfileIcon from '@/assets/svgs/profie-icon'; 
import { Search } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import HeaderBottom from './header-bottom';

const Header = () => {
  return (
    <div className="w-full bg-white">
      {/* Top bar */}
      <div className="w-[80%] py-5 m-auto flex items-center justify-between">
        {/* Logo */}
        <div>
          <Link href={'/'}>
            <span className="text-xl font-[500]">Eshop</span>
          </Link>
        </div>

        {/* Search bar */}
        <div className="w-[50%] relative">
          <input
            type="text"
            placeholder="Search for products..."
            className="w-full px-4 font-Poppins font-medium border-[2.5px] border-[#3489ff] outline-none h-[55px]"
          />
          <div className="w-[60px] cursor-pointer flex items-center justify-center h-[55px] bg-[#3489ff] absolute top-0 right-0">
            <Search color="white" />
          </div>
        </div>

        {/* Profile + actions */}
        <div className="flex items-center gap-5">
          <Link href={'/login'} className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <ProfileIcon />
            </div>
            <div>
              <span className="block font-medium text-sm">Hello,</span>
              <span className="block font-semibold text-sm">Sign In</span>
            </div>
          </Link>

          <Link href={'/wishlist'} className="relative">
            <HeartIcon />
            <div className="w-5 h-5 border-2 border-white bg-red-500 rounded-full flex items-center justify-center absolute -top-2 -right-2">
              <span className="text-white font-medium text-[10px]">0</span>
            </div>
          </Link>

          <Link href={'/cart'} className="relative">
            <CartIcon />
            <div className="w-5 h-5 border-2 border-white bg-red-500 rounded-full flex items-center justify-center absolute -top-2 -right-2">
              <span className="text-white font-medium text-[10px]">0</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Divider + bottom nav — outside the flex row */}
      <div className="border-b border-b-[#99999968]" />
      <HeaderBottom />
    </div>
  );
};

export default Header;