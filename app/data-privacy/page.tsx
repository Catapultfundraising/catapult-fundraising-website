import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { FIRM_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Data Privacy Policy",
  description:
    "Catapult Fundraising, Inc.'s Data Privacy Policy: what personal information we collect on catapultfr.com, how we use it, and your rights.",
  alternates: { canonical: "/data-privacy" },
};

export default function DataPrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Data Privacy Policy"
        description="How Catapult Fundraising, Inc. collects, uses, and protects the personal information you provide on catapultfr.com."
      />
      <section className="mx-auto max-w-3xl px-6 py-16 lg:px-10">
        <div className="prose prose-neutral max-w-none space-y-10 text-[rgb(var(--ink))] [&_h2]:mt-10 [&_h3]:mt-6 [&_p]:mt-4 [&_p:first-child]:mt-0 [&_ul]:mt-3 [&_li]:mt-2">
          <p className="text-sm text-[rgb(var(--ink))]/60">Effective Date: January 2016 (Updated 2026)</p>

          <p>
            Catapult Fundraising, Inc. ("Catapult Fundraising") has created this Data Privacy
            Policy ("Policy") in order to describe how we collect and use the personal
            information you provide on our website Catapultfr.com and all its sub-sites and
            related sites (together, the "Site"). Your privacy is of great importance to us.
            Please read the following to learn more about our Policy.
          </p>
          <p>
            By visiting or using the Website or Services (as defined below) in any manner, you
            acknowledge that you accept the practices and policies outlined in this Policy and
            you hereby consent that we will collect, use, and share your information in the
            following ways. Any capitalized terms used herein without definition shall have the
            meaning given to them in our Terms of Use.
          </p>
          <p>
            Catapult Fundraising complies with all applicable data privacy laws of the US Federal
            and State governments.
          </p>

          <div>
            <h2 className="font-display text-2xl">1. What Does This Policy Cover?</h2>
            <p>
              This Policy covers our treatment of personally identifiable information ("Personal
              Information") that we gather when you are accessing or using our Website or
              Services. This policy does not apply to the practices of companies that we do not
              own or control, or to individuals that we do not employ or manage.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">2. Collected Information</h2>

            <h3 className="font-display text-xl">2.1 Information that you provide to us</h3>
            <p>
              We require customers who use the services offered on our Site (collectively, the
              "Service") to give us contact information, such as their name, company name,
              address, phone number, and e-mail address, and financial qualification and billing
              information, such as billing name and address, credit card number. At the time you
              express interest in attaining additional information, or when you register for the
              Service, we may also ask for additional personal information, such as title,
              department name, fax number, or additional company information.
            </p>

            <h3 className="font-display text-xl">2.2 Information that is collected automatically</h3>
            <p>
              Catapult Fundraising may also collect certain information from visitors to and
              customers of the Site, such as Internet addresses. This information is logged to
              help diagnose technical problems, and to administer our Site in order to
              constantly improve the quality of the Service. We may also track and analyze
              non-identifying and aggregate usage and volume statistical information from our
              visitors and customers.
            </p>
            <p>
              Technologies such as cookies, beacons, scripts and tags are used by us and our
              third party partners. These technologies are used in analyzing trends,
              administering the website, tracking users' movements around the site, and
              gathering demographic information about our user base as a whole. We may receive
              reports based on the use of these technologies by these companies on an individual
              and aggregated basis. Various browsers may offer their own management tools for
              removing these types of tracking technologies.
            </p>
            <p>
              We use Local Shared Objects, such as Flash cookies, and Local Storage, such as
              HTML5, to store content information and preferences. Various browsers may offer
              their own management tools for removing HTML5. Third parties with whom we partner
              to provide certain features on our website or to display advertising based upon
              your web browsing activity also use Flash cookies to collect and store
              information.
            </p>
            <p>
              Our website may include social media features, such as the Facebook Like button,
              and widgets, such as the Share this button or interactive mini-programs that run
              on our website. These features may collect your Internet protocol address, which
              page you are visiting on our website, and may set a cookie to enable the feature to
              function properly. Social media features and widgets are either hosted by a third
              party or hosted directly on our website. Your interactions with these features are
              governed by the privacy Policy of the company providing it.
            </p>

            <h3 className="font-display text-xl">2.3 Cookies</h3>
            <p>
              When you interact with the Catapult Fundraising Website we strive to make that
              experience easy and meaningful. When you come to our Web site, our Web server
              sends a cookie to your computer. Cookies are files that Web browsers place on a
              computer's hard drive and are used to tell us whether customers and visitors have
              visited the Site previously. If you click on a link to a third party website, such
              third party may also transmit cookies to you.
            </p>
            <p>
              Standing alone, cookies do not identify you personally. They merely recognize your
              browser. Unless you choose to identify yourself to Catapult Fundraising, either by
              responding to an offer, or providing information on a form, you remain anonymous
              to Catapult Fundraising. Cookies come in two flavors: session and persistent-based.
              Session cookies exist only during an online session. They disappear from your
              computer when you close your browser software or turn off your computer.
              Persistent cookies remain on your computer after you've closed your browser or
              turned off your computer. They include such information as a unique identifier for
              your browser.
            </p>
            <p>
              Catapult Fundraising uses session cookies containing encrypted information to
              allow the system to uniquely identify you while you are logged in. This information
              allows Catapult Fundraising to process your online transactions and requests.
              Session cookies help us make sure you are who you say you are after you've logged
              in and are required in order to use the Catapult Fundraising application. Catapult
              Fundraising uses persistent cookies, that only Catapult Fundraising can read and
              use, to identify the fact that you are a Catapult Fundraising customer or prior
              Catapult Fundraising Website visitor (whatever the case may be). We are especially
              careful about the security and confidentiality of the information stored in
              persistent cookies. For example, we do not store account numbers or passwords in
              persistent cookies. Users who disable their Web browsers' ability to accept
              cookies will still be able to browse our Website.
            </p>
            <p>
              For a full list of the specific cookies and tracking tools used on this Site, see
              our{" "}
              <a href="/cookie-policy" className="underline underline-offset-2">
                Cookie Policy
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">3. Use of Your Information</h2>
            <p>
              No information collected will be sold or disseminated to a third party. We may use
              the service to send you service information and Catapult Fundraising news and
              events. Customers can opt out of being contacted by us, or receiving such
              information from us, at any time by sending an email to{" "}
              <a href={`mailto:${FIRM_EMAIL}`} className="underline underline-offset-2">
                {FIRM_EMAIL}
              </a>
              .
            </p>
            <p>
              Separately, customers are also asked to provide an email address when using our
              FTP services, in order to receive a username and password. We may also email
              information regarding updates to the Service or company, and will send a Customer
              Newsletter. Again, email will not be distributed or shared and customers can opt
              out of receiving any communication by emailing us at the time it is distributed, or
              at the time any customer registers for the Service.
            </p>
            <p>
              Except as we explicitly state at the time we request information, or as provided
              for below, in our terms of service or any other separate agreement which you may
              enter into with us, we do not disclose to any third-party the information provided.
              Catapult Fundraising uses a third-party intermediary to manage the credit card
              processing. This intermediary is solely a link in the distribution chain, and is
              not permitted to store, retain, or use the information provided, except for the
              sole purpose of credit card processing. Other third parties, such as content
              providers, may provide content on the web Site but they are not permitted to
              collect any information nor does Catapult Fundraising share any user information
              with these parties.
            </p>
            <p>
              Customers of the Service will be using the Site to host data and information
              ("Data"). Catapult Fundraising will not review, share, distribute, print, or
              reference any such Data except as provided in the Catapult Fundraising terms of
              use or in any other separate agreement entered into with you, or as may be required
              by law. Individual records may at times be viewed or accessed only for the purpose
              of resolving a problem, or as may be required by law. Of course, customers are
              responsible for maintaining the confidentiality and security of their user
              credentials.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">4. Third-Party Sites</h2>
            <p>
              The Site contains links to other web sites. Catapult Fundraising is not
              responsible for the privacy practices or the content of these other web sites.
              Customers and visitors will need to check the policy of these other web sites to
              understand their policies. Customers and visitors who access a linked site may be
              disclosing their private information. It is the responsibility of the user to keep
              such information private and confidential.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">5. Storage Location of Personal Information</h2>
            <p>
              If you are located outside the United States, the information that we collect from
              you may be transferred to, and stored and processed at, a destination in the
              United States. By submitting information, you agree to this transfer, storing or
              processing. We will take all steps reasonably necessary to ensure that your
              information is treated securely and in accordance with this Policy.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">6. Security</h2>
            <p>
              The security of your Personal Information is important to us. We use commercially
              reasonable efforts to store and maintain your Personal Information in a secure
              environment. We take technical, contractual, administrative, and physical security
              steps designed to protect Personal Information that you provide to us. We have
              implemented procedures designed to limit the dissemination of your Personal
              Information to only such designated staff as are reasonably necessary to carry out
              the stated purposes we have communicated to you. You are also responsible for
              helping to protect the security of your Personal Information. For instance, never
              give out your email account information or password for the Services to third
              parties.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">7. Sharing of Information</h2>
            <p>
              We neither rent nor sell your Personal Information or constituent data to anyone.
              All data is owned by you and will be destroyed upon request.
            </p>

            <h3 className="font-display text-xl">7.1 Business Transfers</h3>
            <p>
              We may choose to buy or sell assets. In these types of transactions, customer
              information is typically one of the business assets that is transferred. Also, if
              we (or substantially all of our assets) are acquired, or if we go out of business,
              enter bankruptcy, or go through some other change of control, Personal Information
              would be one of the assets transferred to or acquired by a third party. You will be
              notified via email and/or a prominent notice on our Web site of any change in
              ownership or uses of your personal information, as well as any choices you may have
              regarding your personal information.
            </p>

            <h3 className="font-display text-xl">7.2 Protection of Catapult Fundraising and Others</h3>
            <p>
              We reserve the right to access, read, preserve, and disclose any information that
              we reasonably believe is necessary to comply with law or a court order; enforce or
              apply our conditions of use and other agreements; or protect the rights, property,
              or safety of Catapult Fundraising, our employees, our users, or others. This
              includes exchanging information with other companies and organizations for fraud
              protection and credit risk reduction. We also may be required to disclose an
              individual's Personal Information in response to a lawful request by public
              authorities, including to meet federal security or law enforcement requirements.
            </p>

            <h3 className="font-display text-xl">7.3 With Your Consent</h3>
            <p>
              Except as set forth above, you will be notified when your Personal Information may
              be shared with third parties, and will be able to prevent the sharing of this
              information.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">8. Opt-Out Policy</h2>
            <p>
              Catapult Fundraising offers its visitors and customers a means to choose how we may
              use information provided. If, at any time after registering for information or
              ordering the Service, you change your mind about receiving information from us or
              about sharing your information, send us a request specifying your new choice to{" "}
              <a href={`mailto:${FIRM_EMAIL}`} className="underline underline-offset-2">
                {FIRM_EMAIL}
              </a>
              . Customers can also opt out of being contacted by us, or receiving information
              from us, at any time by sending an email to the same address.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">9. Changes to This Policy</h2>
            <p>
              We may amend this Policy from time to time. Use of information we collect now is
              subject to the Policy in effect at the time such information is used. If we make
              material changes or changes in the way we use Personal Information, we will notify
              you by posting an announcement on our Website or sending you an email prior to the
              change becoming effective. You are bound by any changes to the Policy when you use
              the Website after such changes have been first posted.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">10. Additional Information and Contact Details</h2>
            <p>
              Questions regarding this Policy or the practices of this Site should be directed to
              Catapult Fundraising by e-mailing such questions to{" "}
              <a href={`mailto:${FIRM_EMAIL}`} className="underline underline-offset-2">
                {FIRM_EMAIL}
              </a>{" "}
              or by mail to:
            </p>
            <p>
              Catapult Fundraising, Inc.
              <br />
              2551 N. Green Valley Parkway, Suite 202B
              <br />
              Henderson, NV 89014
            </p>
          </div>

          <hr className="border-[rgb(var(--line))]" />

          <div>
            <h2 className="font-display text-2xl">Addendum 1: For Clients Transferring Constituent Data</h2>
            <p>
              All materials exchanged between client and Catapult Fundraising, Inc. are
              considered confidential and will not be disclosed except under court order or the
              written permission of client. Catapult will never sell, disseminate or use client
              data for any reason at any time.
            </p>
            <p>
              Upon completion of the contractual agreement with the Client, Catapult
              Fundraising, Inc. shall deliver or destroy all records, notes, data, memorandum,
              models, and equipment of any nature that are in Catapult Fundraising, Inc.'s
              possession, or under Catapult Fundraising, Inc.'s control, and the Client's
              property or relate to Client's constituents.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">
              Addendum 2: Commonly Asked Questions About Catapult's Information Data Handling and
              Security
            </h2>

            <h3 className="font-display text-xl">
              1) What methods of network security do you use to protect the Foundation's data?
            </h3>
            <p>
              Data is stored on a server that has access control restrictions in place. Only
              individuals with proper authorization have access to the directory on the server in
              which the data is stored. The entire network is also protected by two firewalls
              with active intrusion detection. The server room is secured and locked with a
              camera system to protect it from unauthorized physical access.
            </p>
            <p>
              Catapult has data redundancy software in place. All of our data is backed up daily
              both internally and to our offices in New Jersey. This is designed to make sure
              your data is never lost. If a disaster were to occur we can have the data back
              on-line within a couple of hours.
            </p>

            <h3 className="font-display text-xl">
              2) When you scan or have data scanned, what methods are used to protect our
              information? In other words, when our data leaves your server, how is it
              protected?
            </h3>
            <p>
              Data does not leave the server. Reporting is presented through the Catapult
              website. These reports are disseminated only to Client personnel with a username
              and password. More importantly, the data is presented through a secure session that
              uses an SSL certificate to prove the authenticity of the server and to encrypt the
              data from the server to the browser using state-of-the-art 256 bit encryption.
            </p>

            <h3 className="font-display text-xl">
              3) What policies/procedures, internal to your operations, protect our data? In
              particular, relating to how people use/handle data?
            </h3>
            <p>
              Data is accessed only by senior Catapult staff. This is typically limited to two
              people, the Vice President of Client Services and one senior member of the company
              that performs queries against the data. Limited amounts of data are given to
              callers for the purpose of making a phone call to raise funds.
            </p>

            <h3 className="font-display text-xl">4) Does Catapult sell or share data with other vendors or any outside agencies?</h3>
            <p>
              Absolutely not, and we put this in writing in our contract. Your data is
              proprietary and we will use it only for the purposes outlined in our agreement with
              the client.
            </p>
          </div>

          <div id="addendum-3">
            <h2 className="font-display text-2xl">Addendum 3: Privacy Policy (Updated)</h2>
            <p className="text-sm text-[rgb(var(--ink))]/60">Last Updated: June 23, 2026</p>
            <p>
              Catapult Fundraising ("we," "our," or "us") is committed to protecting your
              privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard
              your information when you visit our website Catapultfr.com. Please read this
              Privacy Policy carefully. If you do not agree with the terms, please do not access
              the site.
            </p>

            <h3 className="font-display text-xl">1. Information We Collect</h3>
            <p>
              We may collect information about you in a variety of ways. The information we may
              collect includes:
            </p>
            <p>
              <strong>Personal Data.</strong> Name, email address, phone number, mailing address,
              and other information you voluntarily provide through forms, subscriptions, or
              service requests.
            </p>
            <p>
              <strong>Derivative Data.</strong> IP address, browser type, operating system,
              access times, and pages viewed.
            </p>
            <p>
              <strong>Financial Data.</strong> Payment information processed through third-party
              payment processors.
            </p>
            <p>
              <strong>Mobile Device Data.</strong> Device identifiers, model, and location data
              if enabled.
            </p>
            <p>
              <strong>SMS Messaging Data.</strong> If you opt in to SMS messaging, we collect your
              mobile phone number, your SMS opt-in and consent records, records of SMS messages
              sent and received, and information you voluntarily provide via SMS.
            </p>

            <h3 className="font-display text-xl">2. How We Use Your Information</h3>
            <p>We use your information to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Provide and manage services</li>
              <li>Respond to inquiries and support requests</li>
              <li>Process transactions</li>
              <li>Improve website performance</li>
              <li>Send updates and communications</li>
              <li>Prevent fraud and maintain security</li>
              <li>Send SMS/text messages when you have provided consent</li>
            </ul>
            <p>
              SMS messages may include appointment reminders, scheduling updates, service
              communications, and other messages you have agreed to receive.
            </p>

            <h3 className="font-display text-xl">3. Disclosure of Your Information</h3>
            <p>We may share information in the following limited situations:</p>
            <p>
              <strong>Service Providers (Strictly Limited Use).</strong> We may share information
              with third-party vendors who provide services on our behalf, such as SMS message
              delivery platforms, customer support systems, email services, hosting and analytics
              providers, and payment processors. These vendors may only access data as needed to
              perform contracted services on our behalf and are strictly prohibited from using
              the data for their own purposes, including marketing or analytics unrelated to
              service delivery.
            </p>
            <p>
              <strong>Legal Requirements.</strong> We may disclose information if required by law
              or to protect legal rights.
            </p>
            <p>
              <strong>Business Transfers.</strong> If we undergo a merger, acquisition, or sale of
              assets, your information may be transferred. Any receiving entity will be required
              to honor this Privacy Policy.
            </p>
            <p>
              <strong>Affiliates.</strong> We may share information with affiliated companies
              under common ownership or control only as necessary to operate our business and
              subject to this Privacy Policy.
            </p>
            <p>
              <strong>Marketing Communications.</strong> With your consent, we may send you
              marketing communications. We do not sell personal data.
            </p>

            <h3 className="font-display text-xl">4. SMS Messaging Privacy (Strict Compliance Section)</h3>
            <p>
              If you opt in to receive SMS/text messages from Catapult Fundraising, the following
              applies:
            </p>
            <p>
              <strong>SMS Data We Collect.</strong> We collect and maintain your mobile phone
              number, SMS opt-in and consent records, SMS message history, and information
              provided via SMS.
            </p>
            <p>
              <strong>How We Use SMS Data.</strong> We use SMS-related data only to send
              appointment reminders and updates, provide customer support, communicate regarding
              services or events, and deliver messages you explicitly consented to receive.
            </p>
            <p>
              <strong>Strict No-Sharing / No-Transfer Policy.</strong> We do not sell, rent,
              share, transfer, or disclose consumer SMS/mobile data, opt-in data, or consent
              records to any external organization for marketing, promotional, or unrelated
              purposes. SMS opt-in data and consent records are never used for external
              marketing or shared for third-party benefit.
            </p>
            <p>
              <strong>Permitted Vendor Access (Strictly Controlled).</strong> We may allow limited
              access to SMS-related data only to vendors that are contractually required to
              support SMS delivery (such as messaging platforms and carriers). Such vendors may
              only use data to provide contracted SMS delivery or technical support, are strictly
              prohibited from using data for their own marketing or independent purposes, and
              must comply with confidentiality and data protection obligations.
            </p>
            <p>
              <strong>Administrative, Technical, and Organizational Safeguards.</strong> We
              maintain reasonable safeguards to protect SMS and mobile data, including:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Access controls:</strong> Only authorized personnel may access SMS-related data.</li>
              <li><strong>Staff authorization limits:</strong> Access is restricted based on job responsibility and necessity.</li>
              <li><strong>Vendor-use restrictions:</strong> Vendors are contractually limited to service delivery only and cannot repurpose data.</li>
              <li><strong>Internal monitoring practices:</strong> We limit and monitor access to sensitive communication data to prevent unauthorized use or disclosure.</li>
            </ul>
            <p>
              <strong>Opt-Out.</strong> You may opt out at any time by replying STOP to any SMS
              message. You may receive one final confirmation message after opting out. For help,
              reply HELP or contact{" "}
              <a href={`mailto:${FIRM_EMAIL}`} className="underline underline-offset-2">
                {FIRM_EMAIL}
              </a>{" "}
              or 702-508-0101. Message and data rates may apply.
            </p>

            <h3 className="font-display text-xl">5. Security of Your Information</h3>
            <p>
              We use administrative, technical, and physical safeguards to protect your
              information. While we take reasonable steps to secure data, no system is completely
              secure.
            </p>

            <h3 className="font-display text-xl">6. Children's Privacy</h3>
            <p>We do not knowingly collect information from children under 13.</p>

            <h3 className="font-display text-xl">7. Changes to This Privacy Policy</h3>
            <p>
              We may update this Privacy Policy from time to time. Updates will be posted with a
              revised "Last Updated" date.
            </p>

            <h3 className="font-display text-xl">8. Contact Us</h3>
            <p>
              Catapult Fundraising
              <br />
              2551 N Green Valley Pkwy, Suite 202B
              <br />
              Henderson, NV 89014
              <br />
              Email:{" "}
              <a href={`mailto:${FIRM_EMAIL}`} className="underline underline-offset-2">
                {FIRM_EMAIL}
              </a>
              <br />
              Phone: 702-508-0101
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
