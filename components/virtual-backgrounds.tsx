import { Download, MonitorPlay } from "lucide-react";

const BACKGROUND_URL =
  "/images/generated/4e087e4d-24c2-4a99-9328-e3d5a388d3f2.webp";

export function VirtualBackgrounds() {
  return (
    <div className="mt-16 space-y-6">
      <div>
        <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          Virtual Meeting Background
        </p>
        <h2 className="mt-2 font-display text-3xl text-[rgb(var(--navy))]">
          Look on-brand on every video call.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--ink))]/65">
          Our branded office background, featuring the Henderson, NV desert
          skyline, for Microsoft Teams and Zoom.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-[rgb(var(--line))] bg-white">
          <img
            src={BACKGROUND_URL}
            alt="Catapult Fundraising branded virtual meeting background featuring the Henderson, NV desert view"
            className="aspect-[3/2] w-full object-cover"
          />
          <div className="p-6">
            <a
              href={BACKGROUND_URL}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--paper))] transition-colors hover:bg-[rgb(var(--navy-deep))]"
            >
              <Download className="h-4 w-4" />
              Download Background (.png)
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-[rgb(var(--line))] bg-white p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--navy))]/5">
            <MonitorPlay className="h-5 w-5 text-[rgb(var(--brass))]" />
          </span>
          <h3 className="mt-5 font-display text-xl text-[rgb(var(--navy))]">
            How to upload it
          </h3>

          <div className="mt-4 space-y-5 text-sm leading-relaxed text-[rgb(var(--ink))]/70">
            <div>
              <p className="font-semibold text-[rgb(var(--navy))]">
                Microsoft Teams
              </p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>
                  Before or during a meeting, click the three dots (<span className="font-semibold">More</span>) on your call controls and select{" "}
                  <span className="font-semibold">
                    Background effects / Video effects
                  </span>
                  .
                </li>
                <li>
                  In the panel on the right, scroll down and click{" "}
                  <span className="font-semibold">Add new</span>.
                </li>
                <li>
                  Select the downloaded Catapult background image, then click
                  on its thumbnail to apply it.
                </li>
                <li>
                  Click <span className="font-semibold">Apply</span> (or{" "}
                  <span className="font-semibold">Apply and join</span>).
                </li>
              </ol>
            </div>

            <div>
              <p className="font-semibold text-[rgb(var(--navy))]">Zoom</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>
                  Open <span className="font-semibold">Settings</span> in the
                  Zoom desktop app, then go to{" "}
                  <span className="font-semibold">Background &amp; Effects</span>.
                </li>
                <li>
                  Click the <span className="font-semibold">+</span> icon under
                  Virtual Backgrounds and choose{" "}
                  <span className="font-semibold">Add Image</span>.
                </li>
                <li>Select the downloaded Catapult background file.</li>
                <li>
                  Click it to select it as your active virtual background. (A
                  green screen isn't required, but good, even lighting
                  gives the cleanest edge detection.)
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
