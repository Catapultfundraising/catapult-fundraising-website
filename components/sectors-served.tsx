import Image from "next/image";

const SECTORS = [
  {
    title: "Faith-Based Organizations",
    description: "Diocesan campaigns, parish legacy giving, and congregational annual funds.",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/e6d5927c-17e7-4f71-93d5-86fdf9bbdae6.jpeg",
  },
  {
    title: "Higher Education",
    description: "Campus capital campaigns, alumni annual giving, and planned gift outreach.",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/62ebe036-cc54-4a61-8952-61060ecd662c.jpeg",
  },
  {
    title: "Human Services",
    description: "Community-facing nonprofits building sustainable, donor-centered fundraising programs.",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/f814dca4-4b83-4023-925a-9a7274bbf2d2.jpeg",
  },
  {
    title: "Arts & Culture",
    description: "Performing arts centers and cultural institutions growing their donor base.",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/513c85b8-7588-44b1-9dcb-41e3cf4f486e.jpeg",
  },
  {
    title: "Healthcare Foundations",
    description: "Hospital and healthcare foundation campaigns and grateful-patient giving programs.",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/af5dde0b-e111-4e99-a958-ae6527c37e76.jpeg",
  },
  {
    title: "Youth Development",
    description: "Scouting, mentorship, and character-building organizations engaging lifelong supporters.",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/6d87d722-c1cc-47ac-82d6-2675e8c2162e.jpeg",
  },
];

export function SectorsServed() {
  return (
    <section className="border-t border-[rgb(var(--line))] bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <p className="font-display text-xl sm:text-[22.5px] uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
          Who We Serve
        </p>
        <h2 className="mt-4 max-w-2xl font-display text-6xl tracking-tight text-[rgb(var(--navy))] sm:text-[75px]">
          Sectors where donor loyalty runs deep.
        </h2>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SECTORS.map((sector) => (
            <div
              key={sector.title}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl"
            >
              <Image
                src={sector.image}
                alt={sector.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--navy-deep))]/90 via-[rgb(var(--navy-deep))]/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <h3 className="font-display text-[25px] text-[rgb(var(--paper))]">{sector.title}</h3>
                <p className="mt-1 text-[17.5px] text-[rgb(var(--paper))]/75">{sector.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
