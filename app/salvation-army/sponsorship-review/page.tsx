import type { Metadata } from 'next';
import { SponsorshipReview } from '@/components/sa-sponsorship-review';
import './review.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:{absolute:'Sponsorship review | The Salvation Army Southwest Division'},description:'Private board and committee sponsorship review.',robots:{index:false,follow:false,nocache:true},referrer:'no-referrer',openGraph:null,twitter:null};
export default function Page(){return <SponsorshipReview preview={process.env.VERCEL_ENV !== 'production'}/>;}
