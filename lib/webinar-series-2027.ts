import programs from "@/lib/webinar-series-2027.json";

export interface Webinar2027 {
  date: string;
  start: string;
  end: string;
  month: string;
  presenter: string;
  presenter_name: string;
  title: string;
  description: string;
  learning_objectives: string[];
  slug: string;
  format: string;
  registration_url: string | null;
}

// Separate from the retired CGA webinar metadata. Approved public copy and
// future registration links belong in this JSON file, not in page markup.
export const WEBINARS_2027: Webinar2027[] = programs;

export function formatWebinarDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
