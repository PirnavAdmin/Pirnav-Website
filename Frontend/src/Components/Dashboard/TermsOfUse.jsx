import "./LegalPages.css";

const termsSections = [
  "By accessing and using this site, you accept the following terms and conditions, without limitation or qualification.",
  "Unless otherwise stated, the contents of this site including, but not limited to, the text and images contained herein and their arrangement are the property of Pirnav Software Solutions Pvt. Ltd. All trademarks used or referred to in this website are the property of their respective owners.",
  "Nothing contained in this site shall be construed as conferring by implication, estoppel, or otherwise, any license or right to any copyright, patent, trademark or other proprietary interest of Pirnav Software Solutions Pvt. Ltd. or any third party. This site and the content provided in this site, including, but not limited to, graphic images, audio, video, html code, buttons, and text, may not be copied, reproduced, republished, uploaded, posted, transmitted, or distributed in any way, without the prior written consent of Pirnav Software Solutions Pvt. Ltd., except that you may download, display, and print one copy of the materials on any single computer solely for your personal, non-commercial use, provided that you do not modify the material in any way and you keep intact all copyright, trademark, and other proprietary notices.",
  "The information provided on this site is free of charge and for informational purposes only and does not create a business or professional services relationship between you and Pirnav Software Solutions Pvt. Ltd. Links on this site may lead to services or sites not operated by Pirnav Software Solutions Pvt. Ltd. No judgment or warranty is made with respect to such other services or sites; Pirnav Software Solutions Pvt. Ltd. takes no responsibility for such other sites or services. A link to another site or service is not an endorsement of that site or service. Any use you make of the information provided on this site, or any site or service linked to by this site, is at your own risk.",
  'This site and its contents are provided "as is", and Pirnav Software Solutions Pvt. Ltd. makes no representation or warranty of any kind with respect to this site or any site or service accessible through this site. Pirnav Software Solutions Pvt. Ltd. expressly disclaims all express and implied warranties including, but not limited to, the implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement.',
  "Pirnav Software Solutions Pvt. Ltd. maintains this site in Hyderabad, Telangana and you agree that these terms of use and any legal action or proceeding relating to this site shall be governed by the laws of the State of Telangana without reference to its choice of law rules.",
  "You are responsible for complying with the laws of the jurisdiction from which you are accessing this site, and you agree that you will not access or use the information on this site in violation of such laws. Unless expressly stated otherwise herein, any information submitted by you through this site shall be deemed non-confidential and non-proprietary.",
  "Pirnav Software Solutions Pvt. Ltd. does not accept unauthorized idea submissions outside of established business relationships. Any ideas disclosed to Pirnav Software Solutions Pvt. Ltd. outside a pre-existing and documented confidential business relationship are not confidential and may therefore be developed, used, disclosed or published without compensation.",
];

const TermsOfUse = () => {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <div className="legal-shell">
          <span className="legal-kicker">Pirnav Legal</span>
          <h1>Terms of Use</h1>
          <p>
            Please read these terms carefully before using the Pirnav Software
            Solutions website and related digital services.
          </p>
        </div>
      </section>

      <section className="legal-content-section">
        <div className="legal-shell">
          <article className="legal-content">
            <h2>PIRNAV Software Solutions Pvt. Ltd. Terms of Use</h2>
            {termsSections.map((section) => (
              <p key={section}>{section}</p>
            ))}
          </article>
        </div>
      </section>
    </main>
  );
};

export default TermsOfUse;
