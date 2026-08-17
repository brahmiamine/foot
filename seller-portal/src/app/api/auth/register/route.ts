import { NextResponse } from 'next/server';
export async function POST(){return NextResponse.json({error:"L'inscription vendeur se fait depuis le site officiel du club.",applicationUrl:process.env.NEXT_PUBLIC_SELLER_APPLICATION_URL??null},{status:410});}
