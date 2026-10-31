import { redirect } from 'next/navigation';

export default function SellersRedirect() {
  redirect('/dashboard/sellers');
}