import SidebarWrapper from '@/shared/components/sidebar/sidebar'
import React from 'react'

const Layout = ({children}: {children: React.ReactNode}) => {
  return (
    <div className='flex h-full bg-black min-h-screen'>
        {/* Sidebar */}
        <aside className='w-[280px] min-w-[250px] max-w-[300px] border-r text-white border-r-slate-800 p-4'>
            <div className='sticky top-0'>
                <SidebarWrapper/>
            </div>
        </aside>
       
       {/* Main content area */}
       <main className='flex-1'>
        <div className= 'overflow-auto'>
          {children}
        </div>
       </main>
    </div>
  )
}

export default Layout