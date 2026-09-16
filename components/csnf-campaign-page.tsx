import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

// CSN Foundation Northwest Campus campaign page.
//
// Client-facing page linked from the feasibility study interview invitation
// email. Deliberately NOT indexed (noindex/nofollow below, disallowed in
// app/robots.ts, absent from app/sitemap.ts) and deliberately NOT styled as
// Catapult: it carries CSN Foundation branding so recipients feel they are
// reading their own institution's campaign material. Catapult chrome is
// suppressed for this route by components/bare-route.tsx.
//
// Shared by /csnf and /csnfvip (identical page, different Calendly link).
//
// Copy is verbatim from Anthony's OneDrive "CSN Web" folder:
// "CSNF Case Summary FINAL 9.15.26.docx" and "CSNF FAQs FINAL 9.15.26.docx".
// Do not paraphrase or add figures. CSNF reviews and approves the page.

const CONTACT_EMAIL = "feasibilitystudy@catapultfr.com";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the College of Southern Nevada?",
    a: "The College of Southern Nevada (CSN) is Nevada\u2019s largest community college, operating three main campuses and several learning centers across the Las Vegas metropolitan area. CSN offers associate and bachelor\u2019s degrees, as well as certificate programs, that prepare our graduates to enter the workforce and/or transfer to another university.",
  },
  {
    q: "How many campuses does CSN operate, and how many students does it serve?",
    a: "CSN operates three main campuses: Henderson, West Charleston, and North Las Vegas. The College also has satellite learning centers and online learning options across Southern Nevada. CSN enrolls more than 41,000 students annually in its over 180 degree and certificate programs.",
  },
  {
    q: "Does CSN need another campus?",
    a: "Yes! Currently, Northwest Las Vegas is experiencing extraordinary growth, yet access to higher education has not kept pace with the needs of the community. Today, approximately 250,000 people live in Northwest Las Vegas, a population nearly the size of Reno. At the same time, an estimated 10,000 current College of Southern Nevada students already call the Northwest home, demonstrating a significant existing demand for higher education in the region. Those students often commute 30 to 90 minutes to take courses. The Northwest Campus will also serve as the new home for CSN\u2019s Southern Desert Regional Police Academy, with future phases expanding public safety training and other in-demand workforce pathways.",
  },
  {
    q: "Why is CSN undertaking this project now?",
    a: "CSN has planned the Northwest campus property for over two decades, watching the area transform from barren desert to thriving community. During that time, CSN has carefully studied the needs of the area and the region, noting the increasing number of students who reside in the Northwest Valley and the lack of higher education resources there. CSN has also closely tracked the workforce development and public safety needs of Las Vegas. CSN now feels confident that it is ready to build a campus to meet these dual needs. Additionally, because this is land from the Bureau of Land Management, CSN must commence construction no later than 2032.",
  },
  {
    q: "What will be the first building on the new campus?",
    a: "The first building on the new campus will be a state-of-the-art, 60,000-square-foot facility. It will provide general education courses and comprehensive student support services while serving as the new home of CSN\u2019s Southern Desert Regional Police Academy, relocating from Henderson to expand training capacity for regional law enforcement agencies. Future phases of the campus will bring additional workforce training programs, including fire and EMS, as the site develops over time.",
  },
  {
    q: "How many students will the Northwest Campus serve?",
    a: "When it first opens, the first building on campus will be able to serve 1,900 students through general education and law enforcement academy courses. But that is only the beginning. Federal and state dollars from the campaign will prepare a good portion of the parcel for construction, making it easier to construct additional buildings and house more programs as the campus further develops.",
  },
  {
    q: "What kinds of courses will be taught in the first building at the Northwest Campus?",
    a: "CSN will offer general education courses in English, math, and social sciences, providing the foundational courses for many of the college\u2019s 180 degree and certificate programs. Additionally, courses taught at the Police Academy will be offered.",
  },
  {
    q: "Why is CSN relocating its Police Academy to the Northwest Campus?",
    a: "CSN has trained law enforcement recruits for multiple agencies for decades, but its current Henderson facility limits how many officers can be trained at once. Relocating and expanding the Southern Desert Regional Police Academy to the Northwest Campus will allow CSN to train more officers for agencies across the Valley, saving on facility costs while providing more modern, cutting-edge training space.",
  },
  {
    q: "Will the Northwest Campus support dual enrollment and high school students?",
    a: "Yes. The first building will also establish CSN\u2019s first Northwest presence for CSN High School, expanding access to dual enrollment so local high school students can begin earning college credit before graduating.",
  },
  {
    q: "What other services and resources will be available to students?",
    a: "The Northwest Campus will have a full suite of administrative and student support services, including an admissions office, financial aid counselors, faculty offices, and academic advising. Plans also call for student-centered spaces such as study areas and a library. This will make the Northwest campus a one-stop-shop for students, allowing them to launch their higher education journey in their own backyard.",
  },
  {
    q: "How will the public-private partnership work?",
    a: "CSN is pursuing public funding at the local, state, and federal levels to advance site infrastructure and construction of the first campus building, while the CSN Foundation leads a $10 million philanthropic campaign to help build and equip the building with the educational technology, training resources, and student-facing spaces it needs.",
  },
  {
    q: "Will I be asked to make a gift during my interview?",
    a: "No, the interview is for informational purposes only, to gather feedback and perspectives from key stakeholders and community members for planning purposes.",
  },
];

const FIRST_BUILDING_POINTS = [
  "Bring affordable higher education closer to nearly 10,000 current CSN students.",
  "Bring higher education closer to the approximately 250,000 people who live in Northwest Las Vegas, a population nearly the size of Reno.",
  "Establish the first higher education campus serving this growing area with CSN\u2019s first new full-service campus in nearly four decades.",
  "Provide general education, admissions, advising, financial aid, library resources, and other essential student support services.",
  "House CSN\u2019s Southern Desert Regional Police Academy, expanding training capacity for regional law enforcement agencies.",
  "Establish the first Northwest presence of CSN High School and expand access to dual enrollment.",
];

function WrapFigure({
  src,
  alt,
  width,
  height,
  side = "right",
  caption,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  side?: "left" | "right";
  caption?: string;
}) {
  const sideClasses =
    side === "right"
      ? "sm:float-right sm:ml-7 sm:mr-0"
      : "sm:float-left sm:mr-7 sm:ml-0";
  return (
    <figure className={`mb-6 mt-2 w-full sm:w-[46%] ${sideClasses}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="w-full rounded-md object-cover"
      />
      {caption ? (
        <figcaption className="mt-2 text-sm text-[#1f2933]/70">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold uppercase tracking-wide text-[#004990] sm:text-3xl">
      {children}
    </h2>
  );
}

export default function CsnfCampaignPage({
  schedulingLink,
}: {
  schedulingLink: string;
}) {
  return (
    <div className="bg-white font-sans text-[#1f2933]">
      {/* Masthead */}
      <header className="border-b-4 border-[#FFD51D] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-6">
          <Image
            src="/csnf/csnf-logo.png"
            alt="College of Southern Nevada Foundation"
            width={553}
            height={283}
            className="h-16 w-auto sm:h-20"
            priority
          />
          <p className="hidden text-right text-sm font-semibold uppercase tracking-widest text-[#004990] sm:block">
            Northwest Campus
            <br />
            Campaign
          </p>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="relative h-[300px] w-full sm:h-[420px]">
          <Image
            src="/csnf/campus-main-entrance.jpg"
            alt="Architectural rendering of the main entrance of the CSN Northwest Campus"
            fill
            className="object-cover object-left sm:object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#00263F]/95 via-[#004990]/75 to-[#004990]/30" />
        </div>
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-5xl px-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#FFD51D]">
              A $10 Million Philanthropic Campaign
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-white sm:text-5xl">
              Bringing higher education home to the Northwest Valley
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/90 sm:text-lg">
              The CSN Northwest Campus will open the doors of affordable college
              education, workforce training, and public safety careers to one of
              the fastest-growing communities in Southern Nevada.
            </p>
          </div>
        </div>
      </section>

      {/* Interview invitation */}
      <section className="border-b border-[#d8e3ef] bg-[#CFE0F2]">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h2 className="text-xl font-bold text-[#004990] sm:text-2xl">
            Thank you for agreeing to share your perspective
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed">
            The CSN Foundation has engaged Catapult Fundraising to conduct a
            confidential feasibility study for the Northwest Campus campaign.
            Please take a few minutes to read the campaign summary and
            frequently asked questions below before your interview. There is no
            preparation required and you will not be asked for a gift.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href={schedulingLink}
              className="inline-flex items-center rounded-md bg-[#004990] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#003668]"
            >
              Schedule your interview
            </a>
            <p className="text-sm text-[#1f2933]/80">
              Questions? Email{" "}
              <a
                className="font-semibold text-[#004990] underline"
                href={`mailto:${CONTACT_EMAIL}`}
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Case for support */}
      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="space-y-5 text-base leading-relaxed">
          <p>
            Southern Nevada is one of the nation&rsquo;s fastest-growing
            regions, yet access to affordable higher education has not kept pace
            with that growth.
          </p>
          <p>
            Nearly 10,000 College of Southern Nevada (CSN) students living in
            the Northwest Valley commute 30 to 90 minutes to the nearest campus,
            creating unnecessary barriers to enrollment, persistence, and degree
            completion. At the same time, continued population growth is
            increasing demand for an educated and highly skilled workforce
            across Southern Nevada.
          </p>
          <p>
            These challenges affect students, families, employers, and the
            long-term economic vitality of the region. As Southern Nevada
            continues to grow, the need for accessible higher education,
            workforce development, and student support services close to home
            have never been greater.
          </p>
        </div>

        <div className="mt-12">
          <SectionHeading>A proven solution for Southern Nevada</SectionHeading>
          <div className="mt-5 space-y-5 text-base leading-relaxed after:block after:clear-both after:content-['']">
            <WrapFigure
              src="/csnf/students-library.jpg"
              alt="CSN students studying together in a campus library"
              width={542}
              height={361}
              side="right"
            />
            <p>
              For more than 55 years, the College of Southern Nevada has
              provided affordable, high-quality education that helps students
              achieve degrees, workforce credentials, and career advancement. As
              Nevada&rsquo;s largest community college and the state&rsquo;s
              first Hispanic-Serving Institution and Minority Serving
              Institution, CSN serves more than 41,000 students annually through
              three main campuses, satellite learning centers, and online
              learning while offering more than 180 degree and certificate
              programs.
            </p>
            <p>
              Today, CSN is ready to expand that mission by establishing its
              fourth full-service campus, bringing higher education closer to
              one of the fastest-growing areas of Southern Nevada.
            </p>
          </div>
        </div>

        <div className="mt-12">
          <SectionHeading>The CSN Northwest Campus</SectionHeading>
          <div className="mt-5 space-y-5 text-base leading-relaxed">
            <WrapFigure
              src="/csnf/campus-entrance.jpg"
              alt="Rendering of the entrance to the first building on the CSN Northwest Campus"
              width={883}
              height={456}
              side="left"
              caption="Rendering of the first building on the CSN Northwest Campus."
            />
            <p>
              More than 20 years ago, CSN acquired over 40 acres for a future
              campus in Northwest Las Vegas. That long-awaited vision is now
              moving closer to reality.
            </p>
            <p>
              The first phase will establish the campus through construction of
              a 60,000-square-foot building that will serve as the cornerstone
              of future development. It will provide general education courses
              and comprehensive student support services while also serving as
              the new home of CSN&rsquo;s Southern Desert Regional Police
              Academy, relocating from Henderson to expand training capacity for
              regional law enforcement agencies. Future phases of the campus
              will add additional buildings and bring additional workforce
              training programs, including Fire, EMS, and Allied Health Programs
              as the site develops over time.
            </p>
            <p>
              The first building on the CSN Northwest Campus will be able to
              enroll 1,900 students in its first term, and plans include
              additional buildings to be constructed over the course of several
              years. The first building on the new campus will:
            </p>
          </div>
          <ul className="mt-5 space-y-3 after:block after:clear-both after:content-['']">
            {FIRST_BUILDING_POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-base leading-relaxed">
                <span
                  aria-hidden="true"
                  className="mt-2 h-2 w-2 shrink-0 rounded-sm bg-[#FFD51D]"
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12">
          <SectionHeading>
            Phase one: the Southern Desert Regional Police Academy
          </SectionHeading>
          <div className="mt-5 space-y-5 text-base leading-relaxed after:block after:clear-both after:content-['']">
            <WrapFigure
              src="/csnf/police-academy.jpg"
              alt="Recruits at CSN's Southern Desert Regional Police Academy"
              width={878}
              height={586}
              side="right"
            />
            <p>
              The first building&rsquo;s anchor tenant will be CSN&rsquo;s
              Southern Desert Regional Police Academy, relocating from its
              current Henderson location to the Northwest Campus. For decades,
              CSN has provided law enforcement training for agencies throughout
              Southern Nevada. This move will expand capacity to train more
              officers for agencies across the Valley, saving CSN $475K annually
              in facility costs while providing more expansive, cutting-edge
              training space.
            </p>
            <p>
              As the campus develops in future phases, CSN envisions a broader
              public safety training hub that includes law enforcement, fire,
              and EMS training together under one roof.
            </p>
          </div>
        </div>

        <div className="mt-12">
          <SectionHeading>A transformational investment</SectionHeading>
          <div className="mt-5 space-y-5 text-base leading-relaxed">
            <p>
              Development of the Northwest Campus represents a significant
              public-private partnership, bringing together CSN, public
              entities, and philanthropic partners around a shared investment in
              Southern Nevada&rsquo;s future. The project is being advanced
              through a braided funding plan involving public and private
              resources. CSN is pursuing funding at the local, state, and
              federal levels, while the CSN Foundation is leading a $10 million
              philanthropic campaign to demonstrate community commitment and
              help make the Northwest Campus a reality.
            </p>
            <p>
              Importantly, the Nevada System of Higher Education (NSHE) Board of
              Regents has recently designated the CSN Northwest Campus building
              as its No. 1 capital project priority for legislative
              consideration. Additionally, the Southern Nevada Forum recently
              prioritized the CSN Northwest Campus as a top priority going into
              the legislative session. These prioritizations underscore the
              importance of the project to Nevada&rsquo;s higher education
              system and the community.
            </p>
            <p>
              An investment in the CSN Northwest Campus is an investment in
              educational opportunities, workforce readiness, economic growth,
              and safer communities. Donors will have the opportunity to help
              create lasting change by expanding access to higher education
              while preparing the next generation of a highly skilled workforce.
            </p>
          </div>
        </div>

        <div className="mt-12">
          <SectionHeading>
            Support from the community is critical
          </SectionHeading>
          <div className="mt-5 space-y-5 text-base leading-relaxed after:block after:clear-both after:content-['']">
            <WrapFigure
              src="/csnf/gift-chart.png"
              alt="Gift chart showing giving levels from $10,000 to $2,000,000 and above"
              width={519}
              height={519}
              side="left"
            />
            <p>
              CSN&rsquo;s Northwest Campus campaign will require support at many
              different levels to reach the $10 million philanthropic goal.
              Every gift, no matter the size, will play a vital role in
              establishing the campus and bringing the first building to
              fruition. This chart illustrates the kinds of gifts that will make
              a campaign like this possible.
            </p>
            <p className="clear-both">
              The community has waited for two decades for the Northwest Campus
              to come to life, and the time has now come. The first building on
              the CSN Northwest campus will transform the area, bringing
              affordable higher education to the Northwest Valley for the first
              time and providing a new home for CSN&rsquo;s Southern Desert
              Regional Police Academy.
            </p>
          </div>
        </div>

        {/* History and leadership */}
        <div className="mt-12">
          <SectionHeading>History</SectionHeading>
          <p className="mt-5 text-base leading-relaxed">
            Founded in 1971 as Clark County Community College, CSN&rsquo;s early
            days saw only a few hundred students enrolled in a single building
            in North Las Vegas. Over the course of the next two decades, the
            college steadily grew and expanded, opening the Henderson and West
            Charleston campuses in the mid-1980s. In 1991, the school was
            renamed the Community College of Southern Nevada, and what is today
            known as the CSN Foundation was established. To reflect its growing
            importance in the region and the number of types of degrees it
            awarded, the school became the College of Southern Nevada in 2007.
          </p>

          <div className="mt-12">
            <SectionHeading>Leadership committed to success</SectionHeading>
            <div className="mt-5 space-y-5 text-base leading-relaxed">
              <p>
                <strong className="text-[#004990]">
                  Dr. Stacy Klippenstein, President,
                </strong>{" "}
                came to CSN in 2025, bringing more than 30 years of experience
                in higher education administration and leadership. Known to
                colleagues and students as &ldquo;Dr. Klip,&rdquo; he believes
                in creating and nurturing a community of thinkers and
                collaborators and is passionate about helping students earn
                their degrees and workforce credentials. Prior to coming to CSN,
                he was president of Mohave College in Arizona and Miles
                Community College in Montana.
              </p>
              <p>
                <strong className="text-[#004990]">Dr. James R. McCoy</strong>{" "}
                serves as Executive Vice President for Academic Affairs and
                Chief Academic Officer, where he oversees approximately 1,400
                faculty serving about 40,000 students each year and draws upon
                more than 26 years of higher education leadership experience,
                including prior service as Assistant Vice Chancellor for Student
                Success for the Nevada System of Higher Education. As one of the
                executive sponsors for CSN&rsquo;s proposed Northwest Campus,
                Dr. McCoy is helping to lead the planning and development of the
                transformational new campus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission and vision */}
      <section className="bg-[#CFE0F2] py-12">
        <div className="mx-auto max-w-5xl px-6">
          <Image
            src="/csnf/mission-vision.jpg"
            alt="Mission and vision statements of the College of Southern Nevada and the CSN Foundation"
            width={1476}
            height={695}
            className="w-full"
          />
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="border-t border-[#d8e3ef] bg-[#f5f8fc] py-14"
      >
        <div className="mx-auto max-w-3xl px-6">
          <SectionHeading>Frequently asked questions</SectionHeading>
          <div className="mt-6 divide-y divide-[#d8e3ef] border-y border-[#d8e3ef]">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-semibold text-[#004990]">
                  <span>{faq.q}</span>
                  <span
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-xl leading-none text-[#FFD51D] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-base leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-[#004990] py-14 text-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            We look forward to your interview
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/90">
            Your perspective will help shape the plan for the CSN Northwest
            Campus campaign. Interviews are confidential and for informational
            purposes only.
          </p>
          <div className="mt-7 flex flex-col items-center gap-4">
            <a
              href={schedulingLink}
              className="inline-flex items-center rounded-md bg-[#FFD51D] px-7 py-3 text-sm font-bold text-[#003668] transition-colors hover:bg-[#f0c400]"
            >
              Schedule your interview
            </a>
            <p className="text-sm text-white/85">
              or contact Kayla Jones, Engagement Director, at{" "}
              <a
                className="font-semibold underline"
                href={`mailto:${CONTACT_EMAIL}`}
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-[#FFD51D] bg-white py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 text-center">
          <Image
            src="/csnf/csnf-logo.png"
            alt="College of Southern Nevada Foundation"
            width={553}
            height={283}
            className="h-14 w-auto"
          />
          <p className="text-sm text-[#1f2933]/70">
            Powered by{" "}
            <Link href="/" className="font-semibold text-[#004990] underline">
              Catapult Fundraising
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
