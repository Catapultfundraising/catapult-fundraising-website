"use client";
import { useEffect, useState } from "react";

// True only when the viewer has an employee dashboard login for that client.
export function useBoardReviewStaff(client: string) {
  const [staff, setStaff] = useState(false);
  useEffect(() => {
    let on = true;
    fetch(`/api/board-review/staff?client=${client}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { staff: false }))
      .then((j) => on && setStaff(!!j.staff))
      .catch(() => {});
    return () => { on = false; };
  }, [client]);
  return staff;
}
