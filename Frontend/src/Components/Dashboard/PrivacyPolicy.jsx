import "./LegalPages.css";

const securityCommitments = [
  "Protection of information and assets against existing and emerging threats by deploying adequate security controls covering physical, logical, personnel and information security, including cyber security.",
  "Secure deployment of emerging technologies like Artificial Intelligence, Blockchain, Quantum and related technologies.",
  "Compliance with legal, statutory and regulatory requirements across operations.",
  "Continuity of operations in line with business requirements and obligations to stakeholders.",
  "Inclusion of security responsibilities for departments and individuals to adhere to this policy.",
  "Adequate security awareness and competence among associates at all levels to fulfill these responsibilities.",
  "Avenues for associates and other stakeholders to report security weaknesses, violations or disruption of services.",
  "A robust framework to identify security weakness, protect against exploitation, detect and respond to violations, and recover from disruption of services.",
  "Governance of security performance against appropriate targets and objectives, enabling continuous improvements.",
  "Third party and supply chain risk management, including their personnel.",
];

const PrivacyPolicy = () => {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <div className="legal-shell">
          <span className="legal-kicker">Pirnav Legal</span>
          <h1>Privacy Policy</h1>
          <p>
            Pirnav Software Solutions protects business-sensitive information,
            personal information and technology assets with clear security and
            governance practices.
          </p>
        </div>
      </section>

      <section className="legal-content-section">
        <div className="legal-shell">
          <article className="legal-content">
            <h2>Pirnav Security / Legal Policy</h2>
            <p>
              Pirnav Software Solutions Pvt. Ltd. is a digital transformation
              and technology partner of choice for industry-leading
              organizations. Since its inception in 2016, Pirnav Software
              Solutions Pvt. Ltd. has upheld high standards of innovation,
              engineering excellence and customer service.
            </p>
            <p>
              As part of its operations, Pirnav Software Solutions Pvt. Ltd. has
              access to business-sensitive information, including personal
              information, the protection of which is crucial to Pirnav Software
              Solutions Pvt. Ltd. and its clients' business interests.
            </p>
            <p>
              Our security vision is to make Pirnav Software Solutions Pvt.
              Ltd. reliable, resilient and prepared for an evolving environment
              of change, accidents, attacks and failures.
            </p>
            <p>
              This policy reiterates our commitment to protect all information
              and assets that we own or are responsible for, ensuring an
              efficient, safe and secure working environment for Pirnav Software
              Solutions Pvt. Ltd. and its customers.
            </p>

            <h3>Pirnav Software Solutions Pvt. Ltd. will deploy a convergent security model to ensure:</h3>
            <ul>
              {securityCommitments.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <p>
              This policy will be supported by standards, procedures and
              guidelines through a Security Management System and will be made
              available to stakeholders who are expected to contribute towards
              effective implementation and deployment of these security norms.
            </p>
            <p>
              An independent security organization, led by the Chief Information
              Security Officer, will be responsible for the Security Management
              System. The system will be periodically reviewed to ensure its
              continuing applicability and relevance to operations and evolving
              stakeholder expectations.
            </p>
            <p>
              This policy extends to Pirnav Software Solutions Pvt. Ltd.
              globally and its wholly owned subsidiaries in all geographies. It
              applies to associates, business associates and external parties
              having access and usage rights to infrastructure, IT systems or
              information resources.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
};

export default PrivacyPolicy;
