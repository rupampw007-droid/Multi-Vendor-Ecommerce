'use client'
import styled from 'styled-components'

// style the SidebarWrapper component
export const SidebarWrapper = styled.div<{ $isOpen?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  width: 280px;
  height: 100vh;
  background-color: #0f172a; /* slate-900 */
  border-right: 1px solid rgba(148, 163, 184, 0.1); /* slate-400/10 */
  font-family: var(--font-poppins), sans-serif;
  transform: translateX(${({ $isOpen }) => ($isOpen ? '0' : '-100%')});
  transition: transform 0.25s ease-in-out;

  @media (min-width: 1024px) {
    position: sticky;
    transform: translateX(0);
  }
`

// Style the overlay component
export const Overlay = styled.div<{ $isOpen?: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 40;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.25s ease-in-out;

  @media (min-width: 1024px) {
    display: none;
  }
`

// style the header component
export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  color: #f8fafc; /* slate-50 */
  font-weight: 500;
  font-size: 1.125rem;
`

// style the body component
export const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  color: #cbd5e1; /* slate-300 */

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #334155; /* slate-700 */
    border-radius: 9999px;
  }
`

// style Footer component
export const Footer = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  color: #94a3b8; /* slate-400 */
  font-size: 0.875rem;
`

export const Sidebar = {
  Wrapper: SidebarWrapper,
  Header,
  Body,
  Overlay,
  Footer
}