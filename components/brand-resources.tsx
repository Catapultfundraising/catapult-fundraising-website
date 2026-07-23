import { Download, Type, FileText, Image as ImageIcon, Share2 } from "lucide-react";

interface ResourceLink {
  label: string;
  href: string;
  external?: boolean;
}

interface ResourceCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  links: ResourceLink[];
  children?: React.ReactNode;
}

function ResourceCard({ icon: Icon, title, description, links, children }: ResourceCardProps) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--line))] bg-white p-8">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--navy))]/5">
        <Icon className="h-5 w-5 text-[rgb(var(--brass))]" />
      </span>
      <h3 className="mt-5 font-display text-xl text-[rgb(var(--navy))]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--ink))]/65">{description}</p>
      {children}
      <div className="mt-5 flex flex-wrap gap-3">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            download={!link.external || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--paper))] transition-colors hover:bg-[rgb(var(--navy-deep))]"
          >
            <Download className="h-4 w-4" />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function BrandResources() {
  return (
    <div className="mt-16 space-y-6">
      <div>
        <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          Brand Resources
        </p>
        <h2 className="mt-2 font-display text-3xl text-[rgb(var(--navy))]">
          Everything else you need to stay on-brand.
        </h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <ResourceCard
          icon={Type}
          title="Brand fonts"
          description="Catapult uses Fraunces (headings) and Manrope (body text). Download both font families below."
          links={[
            { label: "Download Fraunces", href: "https://fonts.google.com/download?family=Fraunces", external: true },
            { label: "Download Manrope", href: "https://fonts.google.com/download?family=Manrope", external: true },
          ]}
        >
          <div className="mt-4 rounded-xl bg-[rgb(var(--paper))] p-4 text-sm text-[rgb(var(--ink))]/70">
            <p className="font-semibold text-[rgb(var(--navy))]">How to install:</p>
            <p className="mt-1">
              <span className="font-semibold">Mac:</span> Unzip the download, double-click each .ttf file, then click
              &ldquo;Install Font&rdquo; in Font Book.
            </p>
            <p className="mt-1">
              <span className="font-semibold">Windows:</span> Unzip the download, select all the .ttf files, right-click,
              and choose &ldquo;Install.&rdquo;
            </p>
          </div>
        </ResourceCard>

        <ResourceCard
          icon={FileText}
          title="Letterhead template"
          description="The branded Word letterhead template for internal memos and formal correspondence."
          links={[
            {
              label: "Download Letterhead (.docx)",
              href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/faf8dca6-e7de-4797-a33d-3a2f9f3bf699.docx",
            },
          ]}
        />

        <ResourceCard
          icon={ImageIcon}
          title="Logo files"
          description="The full logo package in high resolution, including the primary logo used on our letterhead, email signature, and website header (both a white-background version and a transparent-background version), plus horizontal, vertical, and icon-only versions in color and white, and print-ready vector files."
          links={[
            {
              label: "Download Logo Package (.zip)",
              href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/446f6865-2069-425e-91e4-61a334f434b8.zip",
            },
            {
              label: "Download Transparent Logo (.png)",
              href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/8d3afdfe-f114-40a4-836f-5bdb7b44ecb0.png",
            },
          ]}
        />

        <ResourceCard
          icon={Share2}
          title="LinkedIn & Facebook header"
          description="The official cover banner sized to LinkedIn's exact 1584×396 banner dimensions, built from our website hero photo with the centered headline 'The full-service partner that grows your donor base at every stage of the giving journey.' Upload the same image to both LinkedIn and Facebook for a consistent look."
          links={[
            {
              label: "Download Cover Image (.png)",
              href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ca30c11c-b1db-40c2-8538-c6f95db16bee.png",
            },
          ]}
        />
      </div>
    </div>
  );
}
