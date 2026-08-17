import { redirect } from 'next/navigation';
export default function RegisterPage(){redirect(process.env.NEXT_PUBLIC_SELLER_APPLICATION_URL ?? 'http://localhost:3000/devenir-vendeur');}
