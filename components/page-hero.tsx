import Image from "next/image";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  backgroundImage?: string;
}

export function PageHero({ eyebrow, title, description, backgroundImage }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-[rgb(var(--navy))] text-[rgb(var(--paper))]">
      {backgroundImage ? (
        <>
          <Image
            src={backgroundImage}
            alt=""
            fill
            priority
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--navy))] via-[rgb(var(--navy))]/85 to-[rgb(var(--navy))]/40" />
        </>
      ) : (
        <div className="grain absolute inset-0" />
      )}
      <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
        <p className="font-display text-base uppercase tracking-[0.25em] text-[rgb(var(--brass-light))] sm:text-lg">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-4xl font-display text-5xl tracking-tight text-balance sm:text-6xl lg:text-7xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-xl leading-relaxed text-[rgb(var(--paper))]/75">
          {description}
        </p>
      </div>
    </section>
  );
}
