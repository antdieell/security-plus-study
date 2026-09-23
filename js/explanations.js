/**
 * Builds post-answer review copy for practice questions.
 * Prefers stored explanations when they are specific; otherwise writes
 * original Security+ rationale from the stem, options, and concept map.
 */
var AnswerReview = (function () {
  const LETTERS = ["A", "B", "C", "D"];
  const GENERIC_RE = /does not best satisfy|do(?:es)? not meet that requirement|is a distractor in this item|is the best choice for this scenario|matches the (control, process, or outcome|Security\+ concept)|remaining distractor is weaker|not the best match for the required outcome/i;

  const TERMS = {
    "dnssec": { name: "DNSSEC", meaning: "DNSSEC (Domain Name System Security Extensions) adds digital signatures to DNS records so resolvers can detect spoofed or poisoned answers. It authenticates DNS data; it does not by itself encrypt the DNS query." },
    "sdns": { name: "SDNS", meaning: "SDNS is not a standard CompTIA Security+ control for stopping DNS poisoning. Do not confuse a made-up or unrelated label with DNSSEC, DNS over HTTPS, or DNS over TLS." },
    "sase": { name: "SASE", meaning: "SASE (Secure Access Service Edge) delivers networking plus cloud security services such as SWG, CASB, and ZTNA. It is an access architecture, not a DNS authenticity mechanism." },
    "sd-wan": { name: "SD-WAN", meaning: "SD-WAN is software-defined WAN: it chooses paths across commodity links and can replace or overlay MPLS. It manages connectivity, not DNS record authenticity." },
    "sdn": { name: "SDN", meaning: "Software-defined networking separates the control plane from the data plane so the network can be programmed centrally. It is not DNSSEC and not SD-WAN by itself." },
    "tls": { name: "TLS", meaning: "TLS (Transport Layer Security) encrypts a session between two endpoints. It replaced SSL for wrapping otherwise cleartext protocols such as HTTP, IMAP, or LDAP." },
    "ssl": { name: "SSL", meaning: "SSL is the deprecated predecessor of TLS. Security+ treats TLS as the current protocol used to wrap insecure services." },
    "ipsec": { name: "IPsec", meaning: "IPsec protects IP packets (often for site-to-site or host VPNs) with AH/ESP. It is a tunnel or transport VPN tool, not the usual way to wrap arbitrary application protocols the way TLS does." },
    "ipsec vpn": { name: "IPsec VPN", meaning: "An IPsec VPN encrypts traffic between networks or hosts at the IP layer. It is a valid secure path, but it is not the same as SD-WAN path control or DNS authenticity." },
    "tls vpn": { name: "TLS VPN", meaning: "A TLS VPN (often clientless or SSL/TLS portal) encrypts a session using TLS. It does not replace SD-WAN for steering many branch links." },
    "ike": { name: "IKE", meaning: "IKE negotiates IPsec security associations. It is a key-exchange protocol, not a general wrapper for insecure application protocols." },
    "isakmp": { name: "ISAKMP", meaning: "ISAKMP defines how to establish, negotiate, and manage security associations, typically with IKE/IPsec. It is not the protocol used to wrap everyday insecure services." },
    "ngfw": { name: "NGFW", meaning: "A next-generation firewall inspects applications and users at high throughput, combining traditional firewalling with deeper (often IPS/application) controls." },
    "a ngfw": { name: "NGFW", meaning: "A next-generation firewall inspects applications and users at high throughput, combining traditional firewalling with deeper (often IPS/application) controls." },
    "waf": { name: "WAF", meaning: "A web application firewall inspects HTTP(S) for attacks such as SQLi and XSS. It is specialized for web apps, not a general high-throughput network firewall." },
    "a waf": { name: "WAF", meaning: "A web application firewall inspects HTTP(S) for attacks such as SQLi and XSS. It is specialized for web apps, not a general high-throughput network firewall." },
    "utm": { name: "UTM", meaning: "A unified threat management appliance bundles several security functions. It is convenient but is often not the best choice when the requirement is high-throughput advanced firewalling." },
    "a utm": { name: "UTM", meaning: "A unified threat management appliance bundles several security functions. It is convenient but is often not the best choice when the requirement is high-throughput advanced firewalling." },
    "sd-fw": { name: "SD-FW", meaning: "SD-FW is not the standard Security+ term for a high-throughput application-aware firewall. The exam term for that device is NGFW." },
    "a sd-fw": { name: "SD-FW", meaning: "SD-FW is not the standard Security+ term for a high-throughput application-aware firewall. The exam term for that device is NGFW." },
    "file encryption": { name: "file encryption", meaning: "File encryption protects individual files at rest and typically stays with the file when it is copied between shares. It can apply per-user keys, which supports granular access." },
    "partition encryption": { name: "partition encryption", meaning: "Partition encryption protects one volume while it is at rest. A file copied off that partition is not automatically still encrypted, and it does not provide per-file, per-user access control." },
    "full-disk encryption": { name: "full-disk encryption", meaning: "Full-disk encryption (FDE) protects the entire drive at rest. After boot unlock, copied files are not necessarily encrypted, and FDE does not give per-user file permissions." },
    "full disk encryption": { name: "full-disk encryption", meaning: "Full-disk encryption (FDE) protects the entire drive at rest. After boot unlock, copied files are not necessarily encrypted, and FDE does not give per-user file permissions." },
    "record-level encryption": { name: "record-level encryption", meaning: "Record-level (field/column) encryption protects specific database records. It is not the usual control for files moving between file shares." },
    "record level encryption": { name: "record-level encryption", meaning: "Record-level (field/column) encryption protects specific database records. It is not the usual control for files moving between file shares." },
    "tokenization": { name: "tokenization", meaning: "Tokenization replaces a sensitive value with a token that has no exploitable meaning outside the token vault. The original data is not stored in the same place as the token." },
    "masking": { name: "masking", meaning: "Data masking hides part of a value for display (for example showing only the last four digits). It is not a substitute for encryption of data in motion or at rest." },
    "steganography": { name: "steganography", meaning: "Steganography hides the existence of a message inside other media. It is concealment, not an access-control or integrity control." },
    "hashing": { name: "hashing", meaning: "Hashing produces a one-way digest used to verify integrity. Hashes cannot be reversed to recover the original file the way decryption can." },
    "kerberos": { name: "Kerberos", meaning: "Kerberos is a ticket-based authentication protocol using a KDC and time-limited tickets, common in Active Directory. It authenticates; it is not an encryption algorithm for files." },
    "ldap": { name: "LDAP", meaning: "LDAP is a directory access protocol for querying users and objects. Unencrypted LDAP should be wrapped with TLS (LDAPS) when confidentiality is required." },
    "jump server": { name: "jump server", meaning: "A jump server (jump box) is a hardened intermediary used to reach a separate, more sensitive network. It reduces direct admin exposure." },
    "a jump server": { name: "jump server", meaning: "A jump server (jump box) is a hardened intermediary used to reach a separate, more sensitive network. It reduces direct admin exposure." },
    "segmentation": { name: "segmentation", meaning: "Segmentation divides a network into zones so a compromise cannot move freely. VLANs, firewalls, and microsegmentation are typical implementations." },
    "containerization": { name: "containerization", meaning: "Containerization isolates an app and its dependencies. On mobile, it can separate work apps/data from personal data." },
    "scada": { name: "SCADA", meaning: "SCADA systems monitor and control industrial processes. They are OT, with availability and safety as primary concerns, unlike typical IT user directories." },
    "buffer overflow": { name: "buffer overflow", meaning: "A buffer overflow writes more data than a buffer can hold so adjacent memory (often including execution flow) can be overwritten." },
    "session hijacking": { name: "session hijacking", meaning: "Session hijacking steals or predicts a session token so the attacker uses an authenticated session without the password." },
    "bluejacking": { name: "bluejacking", meaning: "Bluejacking sends unsolicited Bluetooth messages. It is harassment/spam, not the same as Bluesnarfing (data theft) or Bluebugging (device control)." },
    "spyware": { name: "spyware", meaning: "Spyware secretly gathers information about users or systems. It is not defined by self-replication the way a worm is." },
    "mtbf": { name: "MTBF", meaning: "Mean Time Between Failures is a reliability figure for how long a system typically runs between failures." },
    "an mtbf": { name: "MTBF", meaning: "Mean Time Between Failures is a reliability figure for how long a system typically runs between failures." },
    "mttr": { name: "MTTR", meaning: "Mean Time to Repair (or restore) is how long recovery typically takes after a failure. It is not the business downtime allowance (RTO) or data-loss allowance (RPO)." },
    "an mttr": { name: "MTTR", meaning: "Mean Time to Repair (or restore) is how long recovery typically takes after a failure. It is not the business downtime allowance (RTO) or data-loss allowance (RPO)." },
    "data owner": { name: "data owner", meaning: "The data owner is the business role accountable for a data set, including classification and who may access it." },
    "data processor": { name: "data processor", meaning: "A data processor handles personal data on behalf of the controller (typical of many SaaS/cloud vendors under GDPR)." },
    "data controller": { name: "data controller", meaning: "The data controller decides why and how personal data is processed. Processors act on the controller's instructions." },
    "trade secrets": { name: "trade secrets", meaning: "Trade secrets are proprietary information with economic value that is protected by confidentiality, not by a public registration the way a patent is." },
    "fines": { name: "fines", meaning: "Fines are a financial penalty after a regulatory or contractual failure. They are an impact, not a technical control." },
    "version control": { name: "version control", meaning: "Version control records changes so you can compare, revert, and see who changed what. In change management it supports rollback and accountability." },
    "having a backout plan": { name: "backout plan", meaning: "A backout (rollback) plan is how you undo a change if it fails. It is critical, but it is not the same as recording versions of the change." },
    "stakeholder analysis": { name: "stakeholder analysis", meaning: "Stakeholder analysis identifies who is affected and who must approve. It supports communication; it does not by itself version the change." },
    "it is digitally signed": { name: "digital signatures for DNSSEC", meaning: "DNSSEC makes DNS data trustworthy by digitally signing records. Resolvers verify the signature chain; encryption of the packet is not what DNSSEC primarily provides." },
    "it is sent via tls": { name: "DNS over TLS", meaning: "Sending DNS over TLS (DoT) encrypts the query in transit so on-path observers cannot easily read it. That confidentiality is not how DNSSEC proves a record is authentic." },
    "it is encrypted using aes256": { name: "AES encryption", meaning: "AES-256 can encrypt data, but DNSSEC's trust model is signatures (integrity/authenticity), not bulk encryption of the zone with AES." },
    "it is sent via an ipsec vpn": { name: "IPsec for DNS", meaning: "An IPsec VPN can protect a path, but DNSSEC authenticates DNS records themselves so they remain trustworthy even across untrusted networks." },
    "all of the above": { name: "all of the above", meaning: "Choose 'all of the above' only when every listed item is actually required. If any option is wrong or incomplete, this choice is incorrect." },
    "all of the above.": { name: "all of the above", meaning: "Choose 'all of the above' only when every listed item is actually required. If any option is wrong or incomplete, this choice is incorrect." },
    "none of the above": { name: "none of the above", meaning: "'None of the above' is correct only when every other option fails. If one option does fit the scenario, this choice is wrong." }
  };

  const CONCEPTS = [
    { re: /\bfile[- ](?:level[- ])?encrypt/i, name: "file encryption", meaning: "File encryption protects individual files at rest and typically stays with the file when it is copied. Per-user keys support granular access." },
    { re: /\bpartition encrypt/i, name: "partition encryption", meaning: "Partition encryption protects one volume at rest. Files copied off the partition are not automatically encrypted, and access is usually not per-user at file level." },
    { re: /\bfull[- ]disk encrypt|\bfde\b|\bbitlocker\b/i, name: "full-disk encryption", meaning: "Full-disk encryption protects the whole drive at rest. After unlock, copied files are not necessarily encrypted, and FDE does not provide per-file user ACLs." },
    { re: /\brecord[- ]level encrypt|\bfield[- ]level encrypt|\bcolumn[- ]level encrypt/i, name: "record-level encryption", meaning: "Record-level encryption protects specific database fields. It is not the usual tool for files moving between file shares." },
    { re: /\bdnssec\b/i, name: "DNSSEC", meaning: "DNSSEC signs DNS records so resolvers can detect poisoning and spoofing. It provides authenticity of DNS data, not a general WAN architecture." },
    { re: /\bsase\b/i, name: "SASE", meaning: "SASE combines networking and cloud security services (SWG, CASB, ZTNA). It is not the control that authenticates DNS answers." },
    { re: /\bsd-wan\b/i, name: "SD-WAN", meaning: "SD-WAN steers traffic across multiple commodity WAN links and can replace traditional MPLS. It is path management, not DNS signing." },
    { re: /\bleast privilege\b/i, name: "least privilege", meaning: "Least privilege means users, applications, and systems receive only the minimum permissions required to perform authorized tasks, which limits damage from mistakes, malware, or a compromised account." },
    { re: /\bseparation of dut(?:y|ies)\b/i, name: "separation of duties", meaning: "Separation of duties splits a sensitive process so no one person can complete it alone, reducing fraud and error. It is about dividing jobs, not about how many permissions a single account should have." },
    { re: /\bdefense in depth\b/i, name: "defense in depth", meaning: "Defense in depth layers multiple controls so that if one fails, others still protect the asset. It is an architecture strategy, not a rule for how much access one user should get." },
    { re: /\bzero trust\b/i, name: "Zero Trust", meaning: "Zero Trust follows never trust, always verify: every request is authenticated, authorized, and evaluated in context. Least privilege is often used inside Zero Trust, but Zero Trust itself is the broader model." },
    { re: /\bneed to know\b/i, name: "need to know", meaning: "Need to know limits access to data a person requires for a specific task, even if they already have a trusted role." },
    { re: /\bconfidentiality\b/i, name: "confidentiality", meaning: "Confidentiality keeps data from unauthorized disclosure. Encryption, access control, and masking are typical confidentiality controls." },
    { re: /\bintegrity\b/i, name: "integrity", meaning: "Integrity means data or systems are not altered without authorization. Hashing, digital signatures, and change control support integrity." },
    { re: /\bavailability\b/i, name: "availability", meaning: "Availability keeps systems and data usable when needed. Redundancy, backups, patching, and DDoS defenses support availability." },
    { re: /\bnon-?repudiation\b/i, name: "non-repudiation", meaning: "Non-repudiation proves a party performed an action and cannot credibly deny it, usually with digital signatures and logging." },
    { re: /\bauthentication\b/i, name: "authentication", meaning: "Authentication proves identity (something you know, have, or are). It does not by itself decide what the identity is allowed to do." },
    { re: /\bauthorization\b/i, name: "authorization", meaning: "Authorization decides what an authenticated identity may access. A successful login can still fail authorization." },
    { re: /\baccounting\b|\bauditing\b/i, name: "accounting", meaning: "Accounting (auditing) records who did what and when so activity can be reviewed later." },
    { re: /\bmanagerial\b/i, name: "managerial control", meaning: "Managerial controls are administrative: policies, risk assessments, and governance processes rather than devices or hands-on tasks." },
    { re: /\boperational control\b/i, name: "operational control", meaning: "Operational controls are people-performed processes such as training, reviews, and guard tours." },
    { re: /\btechnical control\b/i, name: "technical control", meaning: "Technical (logical) controls are implemented with technology: firewalls, encryption, EDR, and access-control systems." },
    { re: /\bpreventive\b/i, name: "preventive control", meaning: "A preventive control stops an incident before it happens, such as a lock, allow list, or input validation." },
    { re: /\bdetective\b/i, name: "detective control", meaning: "A detective control identifies that an event occurred or is occurring, such as logs, alerts, or cameras." },
    { re: /\bcorrective\b/i, name: "corrective control", meaning: "A corrective control repairs impact after an incident, such as restoring from backup or revoking a compromised account." },
    { re: /\bdeterrent\b/i, name: "deterrent control", meaning: "A deterrent control discourages an attacker from trying, such as warning signs or banners. It may not block or detect the act by itself." },
    { re: /\bcompensating\b/i, name: "compensating control", meaning: "A compensating control provides alternative protection when the preferred control cannot be used." },
    { re: /\bdirective\b/i, name: "directive control", meaning: "A directive control tells people what they must do, typically through policy, standards, or procedures." },
    { re: /\bphysical control\b/i, name: "physical control", meaning: "Physical controls protect facilities and hardware: fences, locks, guards, and access control vestibules." },
    { re: /\bhash(?:ing|es)?\b/i, name: "hashing", meaning: "Hashing produces a fixed-length digest used to check integrity. It is one-way and is not encryption, so it does not hide data for later recovery." },
    { re: /\bencrypt/i, name: "encryption", meaning: "Encryption transforms data so only holders of the correct key can read it. It protects confidentiality, not by itself integrity or identity." },
    { re: /\bsymmetric\b/i, name: "symmetric encryption", meaning: "Symmetric encryption uses one shared secret key for both encryption and decryption. Key distribution to both parties is the hard part." },
    { re: /\basymmetric\b|\bpublic[- ]key\b/i, name: "asymmetric encryption", meaning: "Asymmetric encryption uses a public/private key pair. Encrypt with the recipient's public key; decrypt with that recipient's private key." },
    { re: /\bdigital signature\b/i, name: "digital signature", meaning: "A digital signature is created with the sender's private key and verified with the sender's public key. It supports integrity and non-repudiation." },
    { re: /\bwildcard certificate\b|\bwildcard\b/i, name: "wildcard certificate", meaning: "A wildcard certificate covers a parent domain and its subdomains (for example *.example.com) with one certificate." },
    { re: /\bself-signed\b/i, name: "self-signed certificate", meaning: "A self-signed certificate is signed by its own key, so clients do not automatically trust it the way they trust a public CA." },
    { re: /\b(ocsp|crl)\b/i, name: "certificate revocation", meaning: "CRLs and OCSP tell clients whether a certificate has been revoked. They do not replace choosing the right certificate type." },
    { re: /\bsaml\b/i, name: "SAML", meaning: "SAML is an XML-based federation protocol commonly used for browser SSO between an identity provider and a service provider." },
    { re: /\boauth\b/i, name: "OAuth", meaning: "OAuth is an authorization framework for granting an application limited access to a resource without sharing the user's password." },
    { re: /\bopenid connect\b|\boidc\b/i, name: "OpenID Connect", meaning: "OpenID Connect adds an identity layer on OAuth 2.0 so the client can authenticate the user, not only obtain an access token." },
    { re: /\bidentity provider\b|\bidp\b/i, name: "identity provider", meaning: "The identity provider authenticates users and asserts their identity to other members of a federation." },
    { re: /\bservice provider\b|\brelying party\b/i, name: "service provider", meaning: "The service provider (relying party) consumes the identity assertion; it does not authenticate the user for the rest of the federation." },
    { re: /\brbac\b|role-based/i, name: "RBAC", meaning: "Role-based access control assigns permissions to jobs or roles, then places users in those roles." },
    { re: /\babac\b|attribute-based/i, name: "ABAC", meaning: "Attribute-based access control decides access from attributes of the user, resource, action, and environment." },
    { re: /\bmac\b|mandatory access/i, name: "MAC", meaning: "Mandatory access control uses system-enforced labels (such as classification) that users cannot override." },
    { re: /\bdac\b|discretionary access/i, name: "DAC", meaning: "Discretionary access control lets the data owner decide who else may access the object, such as a file-share ACL." },
    { re: /\bmfa\b|multi-factor/i, name: "MFA", meaning: "MFA requires two or more different factor types (knowledge, possession, inherence), not two passwords of the same type." },
    { re: /\bsso\b|single sign-on/i, name: "SSO", meaning: "Single sign-on lets one authentication event open multiple related applications. It is convenience and central control, not by itself least privilege." },
    { re: /\bpam\b|privileged access/i, name: "PAM", meaning: "Privileged access management vaults, rotates, and monitors powerful accounts so standing admin rights are reduced." },
    { re: /\bphishing\b/i, name: "phishing", meaning: "Phishing uses a deceptive message, usually email, to trick someone into giving up credentials or installing malware." },
    { re: /\bsmishing\b/i, name: "smishing", meaning: "Smishing is phishing delivered by SMS or other mobile text, not email or voice." },
    { re: /\bvishing\b/i, name: "vishing", meaning: "Vishing is phishing over a voice call. Urgency and impersonation are common tactics." },
    { re: /\btyposquat/i, name: "typosquatting", meaning: "Typosquatting registers look-alike domains to catch mistyped URLs or to host a fake site. It can support phishing but is the domain trick, not the whole attack type." },
    { re: /\bpretext/i, name: "pretexting", meaning: "Pretexting invents a believable story or role so the target voluntarily hands over information or access." },
    { re: /\bwatering hole\b/i, name: "watering hole", meaning: "A watering-hole attack compromises a site the target group already trusts, then infects visitors from that community." },
    { re: /\bransomware\b/i, name: "ransomware", meaning: "Ransomware encrypts or locks data and demands payment. Modern variants often steal data first (double extortion)." },
    { re: /\btrojan\b/i, name: "trojan", meaning: "A trojan is malware disguised as useful software. The user is tricked into running it." },
    { re: /\bworm\b/i, name: "worm", meaning: "A worm self-replicates across systems and does not need a user to open a host file each time." },
    { re: /\bvirus\b/i, name: "virus", meaning: "A virus typically needs a host file and user execution to spread." },
    { re: /\brootkit\b/i, name: "rootkit", meaning: "A rootkit hides malware and attacker presence, often by tampering with the OS or firmware." },
    { re: /\bkeylogger\b/i, name: "keylogger", meaning: "A keylogger captures keystrokes to steal credentials or other typed secrets." },
    { re: /\blogic bomb\b/i, name: "logic bomb", meaning: "A logic bomb is unauthorized code that waits for a condition (date, event, or missing user) before triggering damage. Code review is a strong preventive control." },
    { re: /\bsql injection\b/i, name: "SQL injection", meaning: "SQL injection sends untrusted input that the database executes as commands instead of as data. Parameterized queries and input handling are the usual fix." },
    { re: /\bxss\b|cross-site scripting/i, name: "XSS", meaning: "Cross-site scripting injects script that runs in another user's browser in the application's origin." },
    { re: /\bcsrf\b/i, name: "CSRF", meaning: "Cross-site request forgery tricks an authenticated browser into sending a state-changing request the user did not intend." },
    { re: /\bddos\b|denial.of.service/i, name: "DoS/DDoS", meaning: "Denial-of-service attacks exhaust a resource so legitimate users cannot get service. They target availability." },
    { re: /\bon-path\b|man-in-the-middle|mitm/i, name: "on-path attack", meaning: "An on-path (man-in-the-middle) attacker sits between two parties and can intercept or alter traffic." },
    { re: /\bpassword spray/i, name: "password spraying", meaning: "Password spraying tries a few common passwords across many accounts to avoid lockouts, rather than many passwords against one account." },
    { re: /\bbrute.?force\b/i, name: "brute force", meaning: "A brute-force attack tries many secrets against one target, often quickly enough to trigger lockout or detection." },
    { re: /\bcredential stuff/i, name: "credential stuffing", meaning: "Credential stuffing replays username/password pairs stolen from another breach." },
    { re: /\blateral movement\b/i, name: "lateral movement", meaning: "Lateral movement is pivoting from a compromised host to other systems on the same network." },
    { re: /\bprivilege escalation\b/i, name: "privilege escalation", meaning: "Privilege escalation obtains rights beyond those initially granted, on the same system or domain." },
    { re: /\bthreat hunt/i, name: "threat hunting", meaning: "Threat hunting assumes a compromise may already exist and searches for evidence, rather than only waiting for scanner or SIEM alerts." },
    { re: /\bpenetration test\b|\bpentest/i, name: "penetration test", meaning: "A penetration test is authorized exploitation to prove impact. It is not the same as a vulnerability scan or a tabletop discussion." },
    { re: /\bvulnerability scan/i, name: "vulnerability scan", meaning: "A vulnerability scan identifies known weaknesses without the full exploitation of a pentest." },
    { re: /\bsiem\b/i, name: "SIEM", meaning: "A SIEM aggregates logs and alerts so analysts can detect and investigate across many sources." },
    { re: /\bsnmp\b/i, name: "SNMP", meaning: "SNMP is used to monitor and manage network devices. A trap is an unsolicited alert that something needs attention." },
    { re: /\bedr\b/i, name: "EDR", meaning: "Endpoint detection and response monitors endpoints for suspicious behavior and supports investigation and containment." },
    { re: /\bdlp\b|data loss prevention/i, name: "DLP", meaning: "Data loss prevention inspects data to stop unauthorized exfiltration. Network DLP sees traffic that never reaches a managed host agent." },
    { re: /\bwaf\b|web application firewall/i, name: "WAF", meaning: "A WAF inspects HTTP(S) to block common web attacks such as SQLi and XSS. It is not a substitute for every network firewall function." },
    { re: /\bids\b/i, name: "IDS", meaning: "An intrusion detection system alerts on suspicious traffic but does not by itself block it." },
    { re: /\bips\b/i, name: "IPS", meaning: "An intrusion prevention system can block matching traffic inline, unlike a detection-only IDS." },
    { re: /\bnac\b|network access control/i, name: "NAC", meaning: "NAC admits or restricts devices based on identity and posture. Agent-based preadmission NAC generally provides the most visibility and control before the device is fully on the LAN." },
    { re: /\bair gap\b/i, name: "air gap", meaning: "An air gap physically isolates a system from other networks so remote attackers cannot reach it." },
    { re: /\baccess control vestibule\b|\bmantrap\b/i, name: "access control vestibule", meaning: "An access control vestibule (mantrap) uses two sequential doors so a person must be authorized through both before reaching a secure area." },
    { re: /\bfaraday\b/i, name: "Faraday cage", meaning: "A Faraday cage blocks electromagnetic signals. It is not a two-door entry control." },
    { re: /\bbollard\b/i, name: "bollard", meaning: "Bollards stop vehicles from ramming a building or pedestrian area. They do not control pedestrian doors." },
    { re: /\brto\b|recovery time/i, name: "RTO", meaning: "Recovery Time Objective is the maximum acceptable downtime after a disruption. It is a clock for service restoration, not data-loss tolerance." },
    { re: /\brpo\b|recovery point/i, name: "RPO", meaning: "Recovery Point Objective is how much data loss, measured in time, the business can tolerate. It drives backup frequency." },
    { re: /\bsle\b|single loss/i, name: "SLE", meaning: "Single Loss Expectancy is asset value times exposure factor: the expected cost of one occurrence." },
    { re: /\bale\b|annualized loss/i, name: "ALE", meaning: "Annualized Loss Expectancy is SLE times the annual rate of occurrence." },
    { re: /\baro\b|annual rate/i, name: "ARO", meaning: "Annual Rate of Occurrence is how often a threat is expected to succeed in a year." },
    { re: /\brisk (acceptance|accept)\b/i, name: "risk acceptance", meaning: "Risk acceptance keeps the risk without adding a control, usually because treatment costs more than the exposure." },
    { re: /\brisk (avoidance|avoid)\b/i, name: "risk avoidance", meaning: "Risk avoidance stops the activity that creates the risk." },
    { re: /\brisk (mitigation|mitigate)\b/i, name: "risk mitigation", meaning: "Risk mitigation adds controls that reduce likelihood or impact." },
    { re: /\brisk (transference|transfer|share)/i, name: "risk transference", meaning: "Risk transference (sharing) shifts impact to another party, such as insurance or a contract." },
    { re: /\bresidual risk\b/i, name: "residual risk", meaning: "Residual risk is what remains after controls are applied." },
    { re: /\binherent risk\b/i, name: "inherent risk", meaning: "Inherent risk is the exposure before additional controls are applied." },
    { re: /\bhot site\b/i, name: "hot site", meaning: "A hot site is a ready failover location with systems and current data, so recovery is fast and expensive." },
    { re: /\bwarm site\b/i, name: "warm site", meaning: "A warm site has infrastructure but needs more work and data restore than a hot site." },
    { re: /\bcold site\b/i, name: "cold site", meaning: "A cold site is space and utilities with little pre-staged equipment, so recovery is slowest and cheapest." },
    { re: /\btabletop\b/i, name: "tabletop exercise", meaning: "A tabletop walkthrough discusses the plan without failing over production systems, so it is the least disruptive test." },
    { re: /\bfailover\b/i, name: "failover exercise", meaning: "A failover exercise actually switches service to the backup path and is more disruptive than a tabletop." },
    { re: /\boffsite\b/i, name: "offsite backup", meaning: "Offsite backups are stored away from the primary facility so a local disaster does not destroy every copy." },
    { re: /\bvertical scaling\b/i, name: "vertical scaling", meaning: "Vertical scaling adds CPU, RAM, or disk to the same instance. Adding more instances is horizontal scaling." },
    { re: /\bhorizontal scaling\b/i, name: "horizontal scaling", meaning: "Horizontal scaling adds more instances behind a load balancer rather than enlarging one host." },
    { re: /\belasticity\b/i, name: "elasticity", meaning: "Elasticity is the cloud ability to grow and shrink capacity automatically. A specific one-time CPU add is better described as vertical scaling." },
    { re: /\biaas\b/i, name: "IaaS", meaning: "In IaaS the provider supplies compute, storage, and networking; the customer still manages the OS, apps, and data." },
    { re: /\bpaas\b/i, name: "PaaS", meaning: "In PaaS the provider supplies the runtime; the customer deploys application code and owns identity/data." },
    { re: /\bsaas\b/i, name: "SaaS", meaning: "In SaaS the provider operates the application; the customer mainly manages users, data, and configuration." },
    { re: /\bguideline\b/i, name: "guideline", meaning: "A guideline recommends one acceptable way to meet a requirement. It is not mandatory like a policy, standard, or procedure." },
    { re: /\bsecurity polic(?:y|ies)\b|^polic(?:y|ies)$/i, name: "policy", meaning: "A policy is a high-level mandatory rule from leadership. It states what must be done, not the detailed how." },
    { re: /\bsecurity standard\b|^standard$/i, name: "standard", meaning: "A standard sets mandatory technical or configuration baselines that support policy." },
    { re: /\bprocedure\b/i, name: "procedure", meaning: "A procedure is a mandatory step-by-step process for a specific situation." },
    { re: /\bcontainment\b/i, name: "containment", meaning: "Containment limits spread during incident response before eradication and recovery." },
    { re: /\beradication\b/i, name: "eradication", meaning: "Eradication removes the attacker’s foothold after the incident is contained." },
    { re: /\bpreparation\b/i, require: /\b(incident|ir process|response cycle)\b/i, name: "preparation", meaning: "Preparation is the first IR phase: tools, authority, and training before an incident is detected." },
    { re: /\blessons learned\b/i, name: "lessons learned", meaning: "Lessons learned close the IR cycle by improving the plan after recovery." },
    { re: /\bphi\b/i, name: "PHI", meaning: "Protected Health Information is health data regulated under HIPAA." },
    { re: /\bpii\b/i, name: "PII", meaning: "Personally Identifiable Information can identify an individual. It is broader than health-specific PHI." },
    { re: /\bpci\b/i, name: "PCI DSS", meaning: "PCI DSS is the payment-card security standard. Violations create compliance risk, not only a generic financial loss." },
    { re: /\bgdpr\b/i, name: "GDPR", meaning: "GDPR is the EU privacy law covering personal data of EU residents, including roles such as controller, processor, and DPO." },
    { re: /\bcis benchmark\b/i, name: "CIS benchmarks", meaning: "CIS benchmarks are widely used configuration baselines for operating systems and devices." },
    { re: /\bstatic (code )?analy/i, name: "static analysis", meaning: "Static analysis reviews source without executing the program (SAST)." },
    { re: /\bdynamic (code )?analy/i, name: "dynamic analysis", meaning: "Dynamic analysis tests a running application (DAST)." },
    { re: /\bpatch management\b/i, name: "patch management", meaning: "Patch management deploys vendor fixes so known vulnerabilities are closed before they are exploited." },
    { re: /\bend-of-life\b|\beol\b/i, name: "end-of-life", meaning: "End-of-life means the vendor no longer sells the product and no longer issues security updates." },
    { re: /\bshared secret\b/i, name: "shared secret", meaning: "A shared secret is the single key used by both parties in symmetric cryptography." },
    { re: /\bcaptive portal\b/i, name: "captive portal", meaning: "A captive portal intercepts guest access to collect terms or identity before allowing network use, without requiring a preshared key." },
    { re: /\bjailbreak\b/i, name: "jailbreaking", meaning: "Jailbreaking removes vendor restrictions on a mobile OS so unsigned apps and OS changes are possible, which weakens the security model." }
  ];

  function genericText(text) {
    const s = String(text || "").trim();
    return !s || s.length < 28 || GENERIC_RE.test(s);
  }

  function keepUsefulSentences(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .split(". ")
      .map(function (s) {
        s = s.trim();
        if (s && s.charAt(s.length - 1) !== ".") {
          s += ".";
        }
        return s;
      })
      .filter(function (s) { return s && !genericText(s); })
      .join(" ");
  }

  function matchConcept(text, context) {
    const blob = String(text || "");
    const ctx = blob + " " + String(context || "");
    let best = null;
    CONCEPTS.forEach(function (c) {
      if (c.require && !c.require.test(ctx)) {
        return;
      }
      if (c.re.test(blob)) {
        const len = (blob.match(c.re) || [""])[0].length;
        if (!best || len > best.len) {
          best = { concept: c, len: len };
        }
      }
    });
    return best ? best.concept : null;
  }

  function optionLabel(question, index) {
    return LETTERS[index] + ". " + String(question.options[index] || "").replace(/\.$/, "");
  }

  function normalizeTerm(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/^\s*[a-d](?:[.)]|\s)\s*/i, "")
      .replace(/^(?:a|an|the)\s+/, "")
      .replace(/[^a-z0-9+]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function lookupTerm(text) {
    const raw = String(text || "").trim();
    const n = normalizeTerm(raw);
    if (TERMS[n]) {
      return TERMS[n];
    }
    if (TERMS[raw.toLowerCase()]) {
      return TERMS[raw.toLowerCase()];
    }
    return matchConcept(raw, raw);
  }

  function scenarioNeed(question) {
    const q = String(question.question || "").replace(/\s+/g, " ").trim();
    const need = q.match(/(?:needs? to|must|should(?: she| he| they)?|wants to|trying to|in order to)\s+[^.?]{8,}/i);
    if (need) {
      return need[0].replace(/[?.]\s*$/, "").trim();
    }
    const ask = q.match(/(?:which|what|how|why|when|where)[^.?]{8,}[?.]/i);
    return (ask ? ask[0] : q).replace(/\s+/g, " ").trim();
  }

  function questionFocus(question) {
    return scenarioNeed(question);
  }

  function correctConcept(question) {
    const correct = question.options[question.correctAnswer] || "";
    return lookupTerm(correct) || matchConcept(question.question + " " + correct, question.question);
  }

  function whyCorrect(question) {
    if (question.source === "messer") {
      return String(question.explanation || "See the imported explanation for this item.").trim();
    }
    const kept = keepUsefulSentences(question.explanation);
    const concept = correctConcept(question);
    const label = optionLabel(question, question.correctAnswer);
    const need = scenarioNeed(question);
    if (kept && kept.length >= 40) {
      if (concept && kept.length < 140) {
        return concept.meaning + " " + kept;
      }
      return kept;
    }
    if (concept) {
      if (/^(which|what|how|why|when|where)\b/i.test(need)) {
        return concept.meaning;
      }
      return concept.meaning + " That is what this scenario requires: " + need + ".";
    }
    return label + " is the BEST match because it is the Security+ control, process, or outcome that satisfies this requirement: " + need + ".";
  }

  function whyIncorrect(question, index) {
    if (question.source === "messer") {
      const given = question.incorrectExplanations && question.incorrectExplanations[index];
      return given ? String(given).trim() : "This option is not the imported correct answer.";
    }
    const stored = question.incorrectExplanations && question.incorrectExplanations[index];
    if (stored && !genericText(stored)) {
      return String(stored).trim();
    }
    const option = String(question.options[index] || "").replace(/\.$/, "");
    const correct = String(question.options[question.correctAnswer] || "").replace(/\.$/, "");
    const wrongC = lookupTerm(option);
    const rightC = correctConcept(question);
    const need = scenarioNeed(question);
    const qualifier = /\b(best|most|first|next|least|not|except|primarily|appropriate)\b/i.test(question.question)
      ? " The question is asking for the BEST fit, so a related control can still be wrong."
      : "";

    if (wrongC && rightC && wrongC.name !== rightC.name) {
      return wrongC.meaning + " This item is asking for " + rightC.name + " (" + need + ")." + qualifier;
    }
    if (wrongC) {
      return wrongC.meaning + " It is not the BEST fit here: the stem requires " + need + ", which " + correct + " satisfies." + qualifier;
    }
    if (rightC) {
      return option + " does not provide " + rightC.name + ". The scenario needs " + need + ", which is why " + correct + " is the BEST answer." + qualifier;
    }
    return option + " does not meet the requirement in the stem (" + need + "). " + correct + " is the BEST answer because it is the control that addresses that need." + qualifier;
  }

  function build(question, selectedIndex) {
    const correctIndex = question.correctAnswer;
    const distractors = [];
    question.options.forEach(function (opt, index) {
      if (index === correctIndex) {
        return;
      }
      distractors.push({
        index: index,
        letter: LETTERS[index],
        option: opt,
        why: whyIncorrect(question, index)
      });
    });
    return {
      selectedIndex: selectedIndex,
      correctIndex: correctIndex,
      isCorrect: selectedIndex === correctIndex,
      correctLetter: LETTERS[correctIndex],
      correctOption: question.options[correctIndex],
      whyCorrect: whyCorrect(question),
      distractors: distractors
    };
  }

  function renderHtml(question, selectedIndex) {
    const review = build(question, selectedIndex);
    const selectedLabel = selectedIndex === null || selectedIndex === undefined
      ? "—"
      : optionLabel(question, selectedIndex);
    const status = review.isCorrect ? "Correct ✓" : "Incorrect ✕";
    const items = review.distractors.map(function (d) {
      const yours = d.index === selectedIndex ? " <span class=\"review-chip review-chip-yours\">Your answer</span>" : "";
      return "<article class=\"review-item is-wrong\">" +
        "<h4>Why " + d.letter + " is incorrect" + yours + "</h4>" +
        "<p><strong>" + escapeHtml(d.letter) + ".</strong> " + escapeHtml(d.option) + "</p>" +
        "<p>" + escapeHtml(d.why) + "</p>" +
        "</article>";
    }).join("");
    return "<div class=\"answer-review " + (review.isCorrect ? "is-ok" : "is-bad") + "\" role=\"region\" aria-label=\"Answer explanation\">" +
      "<p class=\"review-status\">" + status + "</p>" +
      "<p class=\"review-selected muted\">You selected: " + escapeHtml(selectedLabel) + "</p>" +
      "<p class=\"review-correct-line\"><strong>Correct answer: " + escapeHtml(review.correctLetter) + ". " + escapeHtml(review.correctOption) + "</strong></p>" +
      "<article class=\"review-item is-right\">" +
        "<h4>Why " + review.correctLetter + " is correct <span class=\"review-chip review-chip-correct\">Correct answer</span>" +
          (review.isCorrect ? " <span class=\"review-chip review-chip-yours\">Your answer</span>" : "") + "</h4>" +
        "<p>" + escapeHtml(review.whyCorrect) + "</p>" +
      "</article>" +
      items +
      (question.objective ? "<p class=\"muted\">Objective: SY0-701 " + escapeHtml(question.objective) + "</p>" : "") +
      "<p class=\"muted\">Source: " + escapeHtml(typeof QuestionBank !== "undefined" ? QuestionBank.sourceLabel(question) : "Current Study Bank") + "</p>" +
    "</div>";
  }

  return {
    build: build,
    renderHtml: renderHtml,
    optionLabel: optionLabel
  };
})();
