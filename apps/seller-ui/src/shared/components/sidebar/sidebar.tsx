'use client';

import useSeller from '@/hooks/useSeller';
import useSidebar from '@/hooks/useSidebar';
import { usePathname } from 'next/navigation';
import React, { useEffect } from 'react';
import Box from '../box';
import { Sidebar } from './sidebar.styles';
import Link from 'next/link';
import Logo from '@/assets/svgs/logo';
import SidebarItem from './sidebar.item';
import Home from '@/assets/svgs/icons/home';
import SidebarMenu from './sidebar.menu';
import { BellPlus, Headset, ListOrdered, LogOut, Mail, PackageSearch, Settings, SquarePlus, TicketPercent } from 'lucide-react';
import Payment from '@/assets/svgs/icons/payment';

const SidebarWrapper = () => {
  const { activeSidebar, setActiveSidebar } = useSidebar();
  const pathName = usePathname();
  const { seller } = useSeller();

  useEffect(() => {
    setActiveSidebar(pathName);
  }, [pathName, setActiveSidebar]);

  const getIconColor = (route: string) =>
    activeSidebar === route ? '#0085ff' : '#969696';
  return (
    <Box
      css={{
        height: '100vh',
        zIndex: '202',
        position: 'sticky',
        padding: '8px',
        top: '0',
        overflowY: 'scroll',
        scrollbarWidth: 'none',
      }}
      className="sidebar-wrapper"
    >
      <Sidebar.Header>
        <Box>
          <Link href={'/'} className="flex justify-center text-center gap-2">
            <Logo />
            <Box>
              <h3 className="text-xl font-medium text-[#ecedee]">
                {seller?.shop?.name}
              </h3>
              <h5 className="font-medium text-xs text-[#ecedeecf] whitespace-nowrap overflow-hidden pl-2 text-ellipsis max-w-[170px]">
                {seller?.shop?.address}
              </h5>
            </Box>
          </Link>
        </Box>
      </Sidebar.Header>
      <div className="block my03 h-full">
        <Sidebar.Body className="body sidebar">
          <SidebarItem
            title="Dashboard"
            icon={<Home height={36} width={36} fill={getIconColor('/dashboard')} />}
            isActive={activeSidebar === '/dashboard'}
            href="/dashboard"
          />
          <div className="m-t block">
            <SidebarMenu title="Main Menu">
              <SidebarItem
                isActive={activeSidebar === '/dashboard/orders'}
                title="Orders"
                href="/dashboard/orders"
                icon={
                  <ListOrdered size={26} color={getIconColor('/dashboard/accounts')} />
                }
              />
              <SidebarItem
                isActive={activeSidebar === '/dashboard/payments'}
                title="Payments"
                href="/dashboard/payments"
                icon={
                  <Payment width={26} height={26} fill={getIconColor('/dashboard/payments')} />
                }
              />
              </SidebarMenu>
              <SidebarMenu title='Products'>
              <SidebarItem
                isActive={activeSidebar === '/dashboard/create-product'}
                title="Create Product"
                href="/dashboard/create-product"
                icon={
                  <SquarePlus size={22} color={getIconColor('/dashboard/create-products')} />
                }
              />
               <SidebarItem
                isActive={activeSidebar === '/dashboard/all-products'}
                title="All Products"
                href="/dashboard/all-products"
                icon={
                  <PackageSearch size={22} color={getIconColor('/dashboard/all-products')} />
                }
              />
              </SidebarMenu>
              <SidebarMenu title='Events'>
               <SidebarItem
                isActive={activeSidebar === '/dashboard/create-event'}
                title="Create Event"
                href="/dashboard/create-event"
                icon={
                  <SquarePlus size={22} color={getIconColor('/dashboard/create-event')} />
                }
              />
              <SidebarItem
                isActive={activeSidebar === '/dashboard/all-events'}
                title="All Events"
                href="/dashboard/all-events"
                icon={ <BellPlus
                   size={22} color={getIconColor('/dashboard/all-events')} />
                }
              />
            </SidebarMenu>
            <SidebarMenu title='Controllers'>
              <SidebarItem
                isActive={activeSidebar === '/dashboard/inbox'}
                title="Inbox"
                href="/dashboard/inbox"
                icon={ <Mail
                   size={20} color={getIconColor('/dashboard/inbox')} />
                }
              />
               <SidebarItem
                isActive={activeSidebar === '/dashboard/settings'}
                title="Settings"
                href="/dashboard/settings"
                icon={ <Settings
                   size={22} color={getIconColor('/dashboard/settings')} />
                }
              />
               <SidebarItem
                isActive={activeSidebar === '/dashboard/notifications'}
                title="Notifications"
                href="/notifications"
                icon={ <Headset
                   size={22} color={getIconColor('/dashboard/notifications')} />
                }
              />
            </SidebarMenu>
            <SidebarMenu title='Extras'>
              <SidebarItem
                isActive={activeSidebar === '/dashboard/discount-codes'}
                title="Discount Codes"
                href="/dashboard/discount-codes"
                icon={ <TicketPercent
                   size={22} color={getIconColor('/dashboard/discount-codes')} />
                }
              />
               <SidebarItem
                isActive={activeSidebar === '/logout'}
                title="Logout"
                href="/"
                icon={ <LogOut
                   size={22} color={getIconColor('/dashboard/discount-codes')} />
                }
              />
            </SidebarMenu>
          </div>
        </Sidebar.Body>
      </div>
    </Box>
  );
};

export default SidebarWrapper;
