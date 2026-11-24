'use client';
import { usePathname } from 'next/navigation';
/** No consent UI, attribution or third-party scripts on this private workflow. */
export function PrivateRoute({children}:{children:React.ReactNode}) { const path=usePathname();return path==='/salvation-army/sponsorship-review'||path.startsWith('/salvation-army/sponsorship-review/')?null:<>{children}</>; }
