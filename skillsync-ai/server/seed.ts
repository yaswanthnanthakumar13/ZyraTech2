import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './db';

interface CourseSeed {
  courseCode: string;
  title: string;
  level: 'Foundation' | 'Core' | 'Applied' | 'Capstone';
  credits: number;
  hours: number;
  description: string;
  prerequisites: string[];
  syllabusModules: Array<{
    moduleCode: string;
    title: string;
    topics: string[];
    skillFocus: string;
  }>;
}

interface CareerSeed {
  id: string;
  title: string;
  category: string;
  description: string;
  medianSalaryRange: string;
  demandOutlook: string;
  careerGuidance: string;
  requiredSoftSkills: string[];
  recommendedTools: string[];
  relevantCertifications: string[];
  projectExpectations: string[];
  skills: Array<{
    skillName: string;
    requiredLevel: number;
    importance: 'core' | 'important' | 'nice_to_have';
    category: string;
  }>;
  courses: CourseSeed[];
}

const CAREERS: CareerSeed[] = [
  {
    id: 'full-stack-developer',
    title: 'Full Stack Developer',
    category: 'Software Engineering',
    description:
      'Designs, builds, and deploys end-to-end web applications spanning interactive client interfaces, REST/GraphQL APIs, authentication, and relational databases.',
    medianSalaryRange: '₹10L – ₹28L / $95K – $155K',
    demandOutlook: 'High Growth (+17% 10-yr outlook)',
    careerGuidance:
      'Start by mastering semantic HTML, modern CSS layouts, and core JavaScript (closures, async/await, event loop) before jumping into React. Pair frontend fluency with Node.js REST APIs and normalized SQL schemas. Build 2 production-grade CRUD applications with authentication and automated tests to stand out in campus and industry placements.',
    requiredSoftSkills: ['System decomposition', 'Technical communication', 'Debugging discipline', 'Code review collaboration'],
    recommendedTools: ['VS Code', 'Git & GitHub', 'PostgreSQL / SQLite', 'Docker', 'Postman'],
    relevantCertifications: ['Meta Full-Stack Engineer Certificate', 'AWS Certified Developer – Associate'],
    projectExpectations: [
      'End-to-end CRUD SaaS app with role-based auth and persistent database',
      'Automated integration test suite and production deployment pipeline',
    ],
    skills: [
      { skillName: 'HTML', requiredLevel: 80, importance: 'core', category: 'Frontend' },
      { skillName: 'CSS', requiredLevel: 75, importance: 'core', category: 'Frontend' },
      { skillName: 'JavaScript', requiredLevel: 85, importance: 'core', category: 'Programming' },
      { skillName: 'TypeScript', requiredLevel: 75, importance: 'important', category: 'Programming' },
      { skillName: 'React', requiredLevel: 85, importance: 'core', category: 'Frontend' },
      { skillName: 'Node.js', requiredLevel: 80, importance: 'core', category: 'Backend' },
      { skillName: 'SQL', requiredLevel: 75, importance: 'core', category: 'Data' },
      { skillName: 'Python', requiredLevel: 65, importance: 'nice_to_have', category: 'Programming' },
      { skillName: 'Git & Testing', requiredLevel: 75, importance: 'important', category: 'Engineering' },
    ],
    courses: [
      {
        courseCode: 'ZT-FSD-101',
        title: 'Web Foundations & Semantic Interfaces',
        level: 'Foundation',
        credits: 3,
        hours: 18,
        description: 'Semantic HTML5 landmarks, accessible forms, Flexbox/Grid responsive layouts, and browser DevTools.',
        prerequisites: [],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Semantic HTML5 & Accessibility',
            topics: ['Document landmarks', 'ARIA labels', 'Form validation attributes'],
            skillFocus: 'HTML',
          },
          {
            moduleCode: 'M2',
            title: 'Modern CSS Grid & Flexbox Systems',
            topics: ['Responsive breakpoints', 'CSS variables', 'Grid template layouts'],
            skillFocus: 'CSS',
          },
        ],
      },
      {
        courseCode: 'ZT-FSD-201',
        title: 'Modern JavaScript & Asynchronous Runtime',
        level: 'Core',
        credits: 4,
        hours: 26,
        description: 'Execution contexts, closures, prototypes, promises, async/await, event loop, and DOM architecture.',
        prerequisites: ['ZT-FSD-101'],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Closures, Scope & Higher-Order Functions',
            topics: ['Lexical scope', 'Closures', 'Array map/filter/reduce', 'Immutability'],
            skillFocus: 'JavaScript',
          },
          {
            moduleCode: 'M2',
            title: 'Promises, Async/Await & Event Loop',
            topics: ['Microtask vs Macrotask queues', 'Fetch API & error boundaries', 'AbortController'],
            skillFocus: 'JavaScript',
          },
        ],
      },
      {
        courseCode: 'ZT-FSD-301',
        title: 'React & TypeScript Component Engineering',
        level: 'Applied',
        credits: 4,
        hours: 28,
        description: 'Typed React components, custom hooks, client routing, state synchronization, and performance profiling.',
        prerequisites: ['ZT-FSD-201'],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Component State, Props & Custom Hooks',
            topics: ['Thinking in React', 'useState/useEffect patterns', 'TypeScript component contracts'],
            skillFocus: 'React',
          },
          {
            moduleCode: 'M2',
            title: 'Production State & API Integration',
            topics: ['Optimistic UI', 'Form handling', 'Error boundaries & testing'],
            skillFocus: 'TypeScript',
          },
        ],
      },
      {
        courseCode: 'ZT-FSD-401',
        title: 'Node.js APIs, Auth & Relational Persistence',
        level: 'Capstone',
        credits: 4,
        hours: 30,
        description: 'Express REST services, JWT/session authentication, SQL schema normalization, and full-stack deployment.',
        prerequisites: ['ZT-FSD-201'],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Express Middleware & Secure Auth Flows',
            topics: ['Routing & validation', 'Password hashing', 'RBAC middleware'],
            skillFocus: 'Node.js',
          },
          {
            moduleCode: 'M2',
            title: 'Relational Joins, Indexing & Transactions',
            topics: ['3NF schema design', 'Parameterized SQL', 'Transactions & migrations'],
            skillFocus: 'SQL',
          },
        ],
      },
    ],
  },
  {
    id: 'cybersecurity-analyst',
    title: 'Cybersecurity Analyst',
    category: 'Security & Infrastructure',
    description:
      'Protects networks, web applications, and cloud workloads through vulnerability analysis, threat detection, SIEM monitoring, and secure remediation.',
    medianSalaryRange: '₹9L – ₹26L / $92K – $148K',
    demandOutlook: 'Critical Demand (+32% 10-yr outlook)',
    careerGuidance:
      'Cybersecurity rewards deep fundamentals in networking (TCP/IP, DNS, TLS), Linux administration, and web protocols (HTML/JS/SQL) so you understand how attacks work at the packet and query level. Leverage Python scripting to automate log parsing and alert triage, then practice hands-on OWASP Top 10 defense and SIEM investigations.',
    requiredSoftSkills: ['Adversarial thinking', 'Incident triage under pressure', 'Clear risk reporting'],
    recommendedTools: ['Wireshark', 'Nmap', 'Burp Suite', 'Splunk / ELK SIEM', 'Kali Linux'],
    relevantCertifications: ['CompTIA Security+', 'ISC2 Certified in Cybersecurity (CC)', 'Blue Team Level 1'],
    projectExpectations: [
      'OWASP Top 10 web vulnerability audit and remediation report on a full-stack app',
      'Python-automated log parser and SIEM alerting playbook for brute-force / SQLi detection',
    ],
    skills: [
      { skillName: 'Python', requiredLevel: 80, importance: 'core', category: 'Programming' },
      { skillName: 'SQL', requiredLevel: 75, importance: 'important', category: 'Data' },
      { skillName: 'HTML', requiredLevel: 70, importance: 'important', category: 'Frontend' },
      { skillName: 'JavaScript', requiredLevel: 65, importance: 'important', category: 'Programming' },
      { skillName: 'Networking & TCP/IP', requiredLevel: 85, importance: 'core', category: 'Security' },
      { skillName: 'Linux & Shell', requiredLevel: 80, importance: 'core', category: 'Systems' },
      { skillName: 'Web Security', requiredLevel: 85, importance: 'core', category: 'Security' },
      { skillName: 'SIEM & Threat Analysis', requiredLevel: 80, importance: 'core', category: 'Security' },
    ],
    courses: [
      {
        courseCode: 'ZT-SEC-101',
        title: 'Computer Networks, TCP/IP & Packet Forensics',
        level: 'Foundation',
        credits: 4,
        hours: 24,
        description: 'OSI/TCP-IP layers, DNS, HTTP/TLS handshakes, subnetting, firewalls, and Wireshark packet inspection.',
        prerequisites: [],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'TCP/IP, Subnetting & TLS Handshakes',
            topics: ['IPv4/CIDR subnetting', '3-way handshake', 'DNS & TLS certificate chain'],
            skillFocus: 'Networking & TCP/IP',
          },
          {
            moduleCode: 'M2',
            title: 'Traffic Capture & Anomaly Triage',
            topics: ['Wireshark filters', 'Port scan signatures', 'ARP/DNS spoofing detection'],
            skillFocus: 'Networking & TCP/IP',
          },
        ],
      },
      {
        courseCode: 'ZT-SEC-201',
        title: 'Linux Hardening & Shell Automation',
        level: 'Core',
        credits: 3,
        hours: 20,
        description: 'POSIX permissions, systemd, journald logs, SSH hardening, firewall rules, and bash/Python scripting.',
        prerequisites: ['ZT-SEC-101'],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Linux Permissions, Processes & Audit Logs',
            topics: ['chmod/chown & capabilities', 'ps/ss/lsof', '/var/log triage'],
            skillFocus: 'Linux & Shell',
          },
        ],
      },
      {
        courseCode: 'ZT-SEC-301',
        title: 'OWASP Top 10 & Application Defense',
        level: 'Applied',
        credits: 4,
        hours: 24,
        description: 'SQL Injection, XSS, CSRF, SSRF, broken access control, and secure coding mitigations.',
        prerequisites: ['ZT-SEC-101'],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Injection, XSS & Session Security',
            topics: ['Parameterized queries', 'Content Security Policy', 'SameSite cookies & CSRF'],
            skillFocus: 'Web Security',
          },
        ],
      },
      {
        courseCode: 'ZT-SEC-401',
        title: 'SOC Operations, SIEM & Threat Hunting',
        level: 'Capstone',
        credits: 4,
        hours: 26,
        description: 'SIEM correlation rules, MITRE ATT&CK mapping, phishing triage, and incident response playbooks.',
        prerequisites: ['ZT-SEC-201', 'ZT-SEC-301'],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'SIEM Alerting & Incident Playbooks',
            topics: ['Log normalization', 'Brute-force correlation', 'MITRE ATT&CK containment'],
            skillFocus: 'SIEM & Threat Analysis',
          },
        ],
      },
    ],
  },
  {
    id: 'ai-ml-engineer',
    title: 'AI/ML Engineer',
    category: 'Data & Artificial Intelligence',
    description:
      'Builds, fine-tunes, evaluates, and deploys production machine learning models, LLM pipelines, and retrieval-augmented systems.',
    medianSalaryRange: '₹14L – ₹38L / $120K – $195K',
    demandOutlook: 'Explosive Demand (+38% 10-yr outlook)',
    careerGuidance:
      'Strong AI/ML engineers combine clean Python engineering with applied statistics, supervised/unsupervised modeling, and rigorous evaluation harnesses. Beyond notebook training, focus on serving models via APIs, containerizing dependencies with Docker, and measuring latency, drift, and hallucination rates.',
    requiredSoftSkills: ['Evaluation discipline', 'Latency/cost tradeoff analysis', 'Research synthesis'],
    recommendedTools: ['PyTorch', 'Scikit-learn', 'FastAPI', 'Docker', 'Vector Databases'],
    relevantCertifications: ['DeepLearning.AI Machine Learning Specialization', 'AWS Certified Machine Learning'],
    projectExpectations: [
      'Production-served ML/LLM API with automated evaluation benchmarks and latency profiling',
      'Model training and versioning pipeline with reproducible datasets',
    ],
    skills: [
      { skillName: 'Python', requiredLevel: 95, importance: 'core', category: 'Programming' },
      { skillName: 'Machine Learning', requiredLevel: 90, importance: 'core', category: 'AI/ML' },
      { skillName: 'Statistics & Probability', requiredLevel: 80, importance: 'core', category: 'Data' },
      { skillName: 'SQL', requiredLevel: 75, importance: 'important', category: 'Data' },
      { skillName: 'Docker', requiredLevel: 75, importance: 'important', category: 'DevOps' },
      { skillName: 'Node.js', requiredLevel: 60, importance: 'nice_to_have', category: 'Backend' },
    ],
    courses: [
      {
        courseCode: 'ZT-AI-101',
        title: 'Applied Probability, Linear Algebra & Statistics',
        level: 'Foundation',
        credits: 4,
        hours: 22,
        description: 'Distributions, Bayes theorem, hypothesis testing, gradient intuition, and matrix operations.',
        prerequisites: [],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Distributions, Hypothesis Testing & Bayesian Inference',
            topics: ['Normal/Poisson distributions', 'Confidence intervals', 'Bayes rule'],
            skillFocus: 'Statistics & Probability',
          },
        ],
      },
      {
        courseCode: 'ZT-AI-201',
        title: 'Supervised & Unsupervised Machine Learning',
        level: 'Core',
        credits: 4,
        hours: 28,
        description: 'Regression, trees, ensembles, clustering, cross-validation, and feature engineering.',
        prerequisites: ['ZT-AI-101'],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Feature Pipelines & Cross-Validation',
            topics: ['Train/val/test leakage', 'Regularization L1/L2', 'Precision-Recall & ROC-AUC'],
            skillFocus: 'Machine Learning',
          },
        ],
      },
      {
        courseCode: 'ZT-AI-301',
        title: 'MLOps, Model Serving & Containerization',
        level: 'Capstone',
        credits: 4,
        hours: 24,
        description: 'Packaging inference services in Docker, API contracts, and drift monitoring.',
        prerequisites: ['ZT-AI-201'],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Containerized Inference Services',
            topics: ['Multi-stage Dockerfiles', 'Batch vs real-time inference', 'Model telemetry'],
            skillFocus: 'Docker',
          },
        ],
      },
    ],
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    category: 'Data & Artificial Intelligence',
    description:
      'Extracts predictive insights from complex datasets using statistical modeling, feature engineering, machine learning, and hypothesis testing.',
    medianSalaryRange: '₹12L – ₹32L / $105K – $168K',
    demandOutlook: 'Rapid Growth (+35% 10-yr outlook)',
    careerGuidance:
      'Excel by pairing SQL analytical mastery (window functions, cohort queries) with Python Pandas/Scikit-learn modeling and clear visual storytelling. Always tie model metrics back to measurable business or scientific decisions.',
    requiredSoftSkills: ['Statistical storytelling', 'Experimental rigor', 'Stakeholder translation'],
    recommendedTools: ['JupyterLab', 'Pandas', 'Scikit-learn', 'SQL', 'Matplotlib'],
    relevantCertifications: ['Google Advanced Data Analytics', 'IBM Data Science Professional'],
    projectExpectations: [
      'End-to-end churn or demand prediction pipeline with cross-validation and error analysis',
      'A/B experiment analysis report with confidence intervals',
    ],
    skills: [
      { skillName: 'Python', requiredLevel: 90, importance: 'core', category: 'Programming' },
      { skillName: 'SQL', requiredLevel: 85, importance: 'core', category: 'Data' },
      { skillName: 'Statistics & Probability', requiredLevel: 85, importance: 'core', category: 'Data' },
      { skillName: 'Machine Learning', requiredLevel: 85, importance: 'core', category: 'AI/ML' },
      { skillName: 'Data Visualization', requiredLevel: 80, importance: 'important', category: 'Data' },
      { skillName: 'Git & Testing', requiredLevel: 65, importance: 'nice_to_have', category: 'Engineering' },
    ],
    courses: [
      {
        courseCode: 'ZT-DS-101',
        title: 'Analytical SQL & Data Wrangling',
        level: 'Foundation',
        credits: 3,
        hours: 18,
        description: 'CTEs, window functions, cohort retention queries, and missing-data imputation.',
        prerequisites: [],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Window Functions & Cohort Analysis',
            topics: ['ROW_NUMBER/RANK', 'Rolling averages', 'CTEs'],
            skillFocus: 'SQL',
          },
        ],
      },
      {
        courseCode: 'ZT-DS-201',
        title: 'Statistical Modeling & Visual Storytelling',
        level: 'Applied',
        credits: 4,
        hours: 24,
        description: 'A/B testing power calculations, predictive modeling, and executive visual communication.',
        prerequisites: ['ZT-DS-101'],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Experiment Design & Chart Integrity',
            topics: ['p-values & effect size', 'Multivariate plots', 'Error bars'],
            skillFocus: 'Data Visualization',
          },
        ],
      },
    ],
  },
  {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    category: 'Software Engineering',
    description:
      'Architects accessible, responsive, high-performance user interfaces, design systems, and state-managed web applications.',
    medianSalaryRange: '₹8L – ₹24L / $85K – $140K',
    demandOutlook: 'Strong Demand (+14% 10-yr outlook)',
    careerGuidance:
      'Focus deeply on browser rendering, accessibility (WCAG AA), TypeScript type design, and React state architecture. Build interactive data-rich interfaces without relying on bloated templates.',
    requiredSoftSkills: ['Visual attention to detail', 'Accessibility empathy', 'Cross-functional collaboration'],
    recommendedTools: ['Chrome DevTools', 'Figma', 'Vite', 'Tailwind CSS', 'Playwright'],
    relevantCertifications: ['W3C Web Accessibility Specialist', 'Meta Front-End Developer Certificate'],
    projectExpectations: [
      'Accessible multi-view React + TypeScript application with state persistence',
      'Reusable UI component library with keyboard navigation',
    ],
    skills: [
      { skillName: 'HTML', requiredLevel: 90, importance: 'core', category: 'Frontend' },
      { skillName: 'CSS', requiredLevel: 85, importance: 'core', category: 'Frontend' },
      { skillName: 'JavaScript', requiredLevel: 90, importance: 'core', category: 'Programming' },
      { skillName: 'TypeScript', requiredLevel: 80, importance: 'core', category: 'Programming' },
      { skillName: 'React', requiredLevel: 90, importance: 'core', category: 'Frontend' },
      { skillName: 'UI/UX Design', requiredLevel: 70, importance: 'important', category: 'Design' },
      { skillName: 'Git & Testing', requiredLevel: 75, importance: 'important', category: 'Engineering' },
    ],
    courses: [
      {
        courseCode: 'ZT-FE-101',
        title: 'Accessible Interface Architecture',
        level: 'Core',
        credits: 4,
        hours: 22,
        description: 'WCAG AA contrast, keyboard navigation, responsive layout systems, and DOM performance.',
        prerequisites: [],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Keyboard Focus & ARIA Patterns',
            topics: ['Focus traps', 'Screen reader landmarks', 'Semantic controls'],
            skillFocus: 'HTML',
          },
        ],
      },
      {
        courseCode: 'ZT-FE-201',
        title: 'Advanced React & TypeScript Design Systems',
        level: 'Applied',
        credits: 4,
        hours: 26,
        description: 'Generic typed components, state machines, and automated UI integration testing.',
        prerequisites: ['ZT-FE-101'],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Composable Component APIs',
            topics: ['Compound components', 'Strict TypeScript props', 'Render performance'],
            skillFocus: 'React',
          },
        ],
      },
    ],
  },
  {
    id: 'backend-developer',
    title: 'Backend Developer',
    category: 'Software Engineering',
    description:
      'Builds scalable server architectures, secure authentication flows, distributed APIs, caching layers, and high-integrity data schemas.',
    medianSalaryRange: '₹10L – ₹30L / $98K – $160K',
    demandOutlook: 'High Growth (+16% 10-yr outlook)',
    careerGuidance:
      'Master relational database indexing, concurrency control, authentication security, and containerized API design. Employers test your ability to design clean APIs and debug latency or race conditions.',
    requiredSoftSkills: ['Architectural reasoning', 'Incident postmortem writing', 'API contract documentation'],
    recommendedTools: ['PostgreSQL', 'Redis', 'Docker', 'Linux CLI', 'OpenAPI'],
    relevantCertifications: ['AWS Certified Solutions Architect', 'PostgreSQL Associate Certification'],
    projectExpectations: [
      'Rate-limited REST API with RBAC, schema migrations, and benchmarked queries',
      'Containerized service with structured logging and automated API tests',
    ],
    skills: [
      { skillName: 'Node.js', requiredLevel: 85, importance: 'core', category: 'Backend' },
      { skillName: 'Python', requiredLevel: 80, importance: 'important', category: 'Programming' },
      { skillName: 'SQL', requiredLevel: 90, importance: 'core', category: 'Data' },
      { skillName: 'TypeScript', requiredLevel: 80, importance: 'important', category: 'Programming' },
      { skillName: 'Linux & Shell', requiredLevel: 75, importance: 'important', category: 'Systems' },
      { skillName: 'Docker', requiredLevel: 75, importance: 'important', category: 'DevOps' },
      { skillName: 'Web Security', requiredLevel: 75, importance: 'core', category: 'Security' },
    ],
    courses: [
      {
        courseCode: 'ZT-BE-101',
        title: 'Relational Internals & Query Optimization',
        level: 'Core',
        credits: 4,
        hours: 24,
        description: 'B-tree indexes, EXPLAIN ANALYZE, ACID transactions, and connection pooling.',
        prerequisites: [],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Indexing, Locks & Isolation Levels',
            topics: ['Composite indexes', 'Read Committed vs Serializable', 'N+1 elimination'],
            skillFocus: 'SQL',
          },
        ],
      },
    ],
  },
  {
    id: 'cloud-engineer',
    title: 'Cloud Engineer',
    category: 'Security & Infrastructure',
    description:
      'Designs, provisions, and secures resilient cloud infrastructure, IAM policies, serverless workloads, and multi-region networks.',
    medianSalaryRange: '₹11L – ₹30L / $105K – $165K',
    demandOutlook: 'High Growth (+21% 10-yr outlook)',
    careerGuidance:
      'Combine Linux and TCP/IP networking with Infrastructure-as-Code (Terraform), least-privilege IAM, and cost-aware cloud architecture.',
    requiredSoftSkills: ['Cost optimization mindset', 'Reliability engineering', 'Documentation clarity'],
    recommendedTools: ['AWS / GCP CLI', 'Terraform', 'Docker', 'IAM', 'CloudWatch'],
    relevantCertifications: ['AWS Certified Solutions Architect – Associate', 'Google Associate Cloud Engineer'],
    projectExpectations: [
      'Infrastructure-as-Code deployment of a 3-tier web service with least-privilege IAM',
      'Automated backup, VPC subnetting, and budget alert architecture',
    ],
    skills: [
      { skillName: 'Cloud Architecture', requiredLevel: 90, importance: 'core', category: 'Cloud' },
      { skillName: 'Linux & Shell', requiredLevel: 85, importance: 'core', category: 'Systems' },
      { skillName: 'Networking & TCP/IP', requiredLevel: 80, importance: 'core', category: 'Security' },
      { skillName: 'Docker', requiredLevel: 80, importance: 'core', category: 'DevOps' },
      { skillName: 'Python', requiredLevel: 75, importance: 'important', category: 'Programming' },
      { skillName: 'Web Security', requiredLevel: 75, importance: 'important', category: 'Security' },
    ],
    courses: [
      {
        courseCode: 'ZT-CLD-101',
        title: 'Cloud Compute, VPCs & Least-Privilege IAM',
        level: 'Core',
        credits: 4,
        hours: 24,
        description: 'Virtual private clouds, public/private subnets, IAM policy scoping, and serverless runtimes.',
        prerequisites: [],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'VPC Routing & IAM Governance',
            topics: ['Security groups', 'NAT gateways', 'IAM roles & STS'],
            skillFocus: 'Cloud Architecture',
          },
        ],
      },
    ],
  },
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    category: 'Security & Infrastructure',
    description:
      'Automates CI/CD delivery pipelines, container orchestration, observability, and zero-downtime infrastructure releases.',
    medianSalaryRange: '₹11L – ₹32L / $108K – $172K',
    demandOutlook: 'High Growth (+22% 10-yr outlook)',
    careerGuidance:
      'Automate everything repeatable: start with Linux shell & Git workflows, containerize workloads in Docker, then implement CI/CD pipelines and Kubernetes health probes.',
    requiredSoftSkills: ['Automation-first thinking', 'Blameless incident response', 'Cross-team enablement'],
    recommendedTools: ['GitHub Actions', 'Docker', 'Kubernetes', 'Terraform', 'Prometheus'],
    relevantCertifications: ['Certified Kubernetes Administrator (CKA)', 'HashiCorp Terraform Associate'],
    projectExpectations: [
      'Automated CI/CD pipeline running tests, container builds, and rolling Kubernetes deploys',
      'Observability dashboard tracking error budgets and latency p95',
    ],
    skills: [
      { skillName: 'Linux & Shell', requiredLevel: 90, importance: 'core', category: 'Systems' },
      { skillName: 'Docker', requiredLevel: 90, importance: 'core', category: 'DevOps' },
      { skillName: 'CI/CD & Kubernetes', requiredLevel: 85, importance: 'core', category: 'DevOps' },
      { skillName: 'Cloud Architecture', requiredLevel: 80, importance: 'core', category: 'Cloud' },
      { skillName: 'Python', requiredLevel: 75, importance: 'important', category: 'Programming' },
      { skillName: 'Git & Testing', requiredLevel: 85, importance: 'core', category: 'Engineering' },
    ],
    courses: [
      {
        courseCode: 'ZT-DO-101',
        title: 'Containers, CI/CD & Kubernetes Operations',
        level: 'Applied',
        credits: 4,
        hours: 26,
        description: 'Docker image hardening, automated GitHub Actions workflows, and Kubernetes pods/services.',
        prerequisites: [],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Declarative Deployments & Rolling Updates',
            topics: ['Pods & ReplicaSets', 'Liveness/Readiness probes', 'CI/CD artifact signing'],
            skillFocus: 'CI/CD & Kubernetes',
          },
        ],
      },
    ],
  },
  {
    id: 'ui-ux-designer',
    title: 'UI/UX Designer',
    category: 'Product & Design',
    description:
      'Crafts intuitive user flows, wireframes, design systems, and usability-tested digital interfaces grounded in user research.',
    medianSalaryRange: '₹7L – ₹22L / $82K – $138K',
    demandOutlook: 'Steady Growth (+13% 10-yr outlook)',
    careerGuidance:
      'Ground every visual decision in user research, clear information hierarchy, and WCAG contrast standards. Knowing HTML & CSS transforms your handoff with engineering teams.',
    requiredSoftSkills: ['User empathy', 'Design critique articulation', 'Iterative prototyping'],
    recommendedTools: ['Figma', 'Maze', 'FigJam', 'Contrast Checkers'],
    relevantCertifications: ['Google UX Design Certificate', 'NN/g UX Certification'],
    projectExpectations: [
      'End-to-end UX case study with user interviews, wireframes, and interactive Figma prototype',
      'Tokenized multi-theme design system meeting WCAG AA contrast standards',
    ],
    skills: [
      { skillName: 'UI/UX Design', requiredLevel: 90, importance: 'core', category: 'Design' },
      { skillName: 'HTML', requiredLevel: 70, importance: 'important', category: 'Frontend' },
      { skillName: 'CSS', requiredLevel: 70, importance: 'important', category: 'Frontend' },
      { skillName: 'Data Visualization', requiredLevel: 65, importance: 'nice_to_have', category: 'Data' },
      { skillName: 'JavaScript', requiredLevel: 50, importance: 'nice_to_have', category: 'Programming' },
    ],
    courses: [
      {
        courseCode: 'ZT-UX-101',
        title: 'Design Systems, Usability & Accessibility',
        level: 'Core',
        credits: 3,
        hours: 20,
        description: 'Typography scales, design tokens, heuristic evaluation, and inclusive contrast systems.',
        prerequisites: [],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Usability Heuristics & Tokenized Systems',
            topics: ['Nielsen heuristics', 'Grid & spacing math', 'WCAG AA color contrast'],
            skillFocus: 'UI/UX Design',
          },
        ],
      },
    ],
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    category: 'Data & Artificial Intelligence',
    description:
      'Transforms raw operational data into clean SQL pipelines, KPI dashboards, and actionable business intelligence reports.',
    medianSalaryRange: '₹6L – ₹18L / $75K – $120K',
    demandOutlook: 'Strong Growth (+23% 10-yr outlook)',
    careerGuidance:
      'Build rock-solid SQL querying fluency, Python data cleaning habits, and honest chart design. Practice translating raw tables into concise executive recommendations.',
    requiredSoftSkills: ['Business acumen', 'Data cleaning rigor', 'Executive presentation'],
    recommendedTools: ['PostgreSQL', 'Python (Pandas)', 'Power BI / Tableau', 'Spreadsheets'],
    relevantCertifications: ['Google Data Analytics Certificate', 'Microsoft Power BI Data Analyst'],
    projectExpectations: [
      'Multi-table SQL cohort & retention analysis with executive dashboard',
      'Automated Python data-cleaning notebook producing reproducible KPI summaries',
    ],
    skills: [
      { skillName: 'SQL', requiredLevel: 90, importance: 'core', category: 'Data' },
      { skillName: 'Data Visualization', requiredLevel: 85, importance: 'core', category: 'Data' },
      { skillName: 'Python', requiredLevel: 75, importance: 'important', category: 'Programming' },
      { skillName: 'Statistics & Probability', requiredLevel: 75, importance: 'core', category: 'Data' },
    ],
    courses: [
      {
        courseCode: 'ZT-DA-101',
        title: 'SQL Analytics & BI Dashboarding',
        level: 'Core',
        credits: 3,
        hours: 18,
        description: 'Multi-table joins, funnel aggregations, KPI selection, and interactive BI dashboards.',
        prerequisites: [],
        syllabusModules: [
          {
            moduleCode: 'M1',
            title: 'Funnel & Retention SQL Queries',
            topics: ['GROUP BY & HAVING', 'CASE aggregations', 'KPI validation'],
            skillFocus: 'SQL',
          },
        ],
      },
    ],
  },
];

const VERIFIED_RESOURCES = [
  {
    id: 'res-js-mdn-guide',
    skillName: 'JavaScript',
    title: 'MDN JavaScript Guide & Core Fundamentals',
    provider: 'MDN Web Docs',
    resourceType: 'documentation',
    difficulty: 'beginner',
    learningStyle: 'documentation_reading',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
    description: 'Authoritative guide covering closures, scope, promises, async/await, and DOM event handling.',
    estimatedMinutes: 90,
  },
  {
    id: 'res-js-info',
    skillName: 'JavaScript',
    title: 'The Modern JavaScript Tutorial',
    provider: 'JavaScript.info',
    resourceType: 'course',
    difficulty: 'beginner',
    learningStyle: 'interactive_coding',
    url: 'https://javascript.info/',
    description: 'Step-by-step interactive explanations with practice tasks from variables and prototypes to async control flow.',
    estimatedMinutes: 120,
  },
  {
    id: 'res-js-fcc',
    skillName: 'JavaScript',
    title: 'JavaScript Algorithms and Data Structures',
    provider: 'freeCodeCamp',
    resourceType: 'practice',
    difficulty: 'intermediate',
    learningStyle: 'interactive_coding',
    url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/',
    description: 'Hands-on browser coding challenges building algorithmic fluency and ES6+ mastery.',
    estimatedMinutes: 180,
  },
  {
    id: 'res-js-yt',
    skillName: 'JavaScript',
    title: 'JavaScript Event Loop & Async Deep Dive',
    provider: 'freeCodeCamp.org YouTube',
    resourceType: 'youtube',
    difficulty: 'beginner',
    learningStyle: 'video_tutorials',
    url: 'https://www.youtube.com/watch?v=jS4aFq5-91M',
    description: 'Structured video walkthrough of JavaScript fundamentals, DOM manipulation, and asynchronous programming.',
    estimatedMinutes: 120,
  },
  {
    id: 'res-react-docs',
    skillName: 'React',
    title: 'React Official Learn & Thinking in React',
    provider: 'React.dev',
    resourceType: 'documentation',
    difficulty: 'beginner',
    learningStyle: 'interactive_coding',
    url: 'https://react.dev/learn',
    description: 'Official interactive React documentation covering components, state, effects, and custom hooks.',
    estimatedMinutes: 90,
  },
  {
    id: 'res-react-oss',
    skillName: 'React',
    title: 'Full Stack Open — Modern React & State',
    provider: 'University of Helsinki',
    resourceType: 'course',
    difficulty: 'intermediate',
    learningStyle: 'hands_on_projects',
    url: 'https://fullstackopen.com/en/part1',
    description: 'University-grade hands-on curriculum building single-page React applications backed by REST APIs.',
    estimatedMinutes: 150,
  },
  {
    id: 'res-node-docs',
    skillName: 'Node.js',
    title: 'Node.js Official Learn & Asynchronous Architecture',
    provider: 'Nodejs.org',
    resourceType: 'documentation',
    difficulty: 'beginner',
    learningStyle: 'documentation_reading',
    url: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs',
    description: 'Official guide to the Node.js runtime, non-blocking I/O, streams, and Express APIs.',
    estimatedMinutes: 75,
  },
  {
    id: 'res-node-express',
    skillName: 'Node.js',
    title: 'Express Web Framework Tutorial (MDN)',
    provider: 'MDN Web Docs',
    resourceType: 'article',
    difficulty: 'intermediate',
    learningStyle: 'hands_on_projects',
    url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/Express_Nodejs',
    description: 'Practical server-side tutorial covering routing, middleware, database persistence, and validation.',
    estimatedMinutes: 110,
  },
  {
    id: 'res-python-docs',
    skillName: 'Python',
    title: 'Official Python Tutorial & Standard Library',
    provider: 'Python.org',
    resourceType: 'documentation',
    difficulty: 'intermediate',
    learningStyle: 'documentation_reading',
    url: 'https://docs.python.org/3/tutorial/',
    description: 'Comprehensive reference on data structures, modules, exceptions, and virtual environments.',
    estimatedMinutes: 60,
  },
  {
    id: 'res-python-exercism',
    skillName: 'Python',
    title: 'Exercism Python Track',
    provider: 'Exercism',
    resourceType: 'practice',
    difficulty: 'intermediate',
    learningStyle: 'interactive_coding',
    url: 'https://exercism.org/tracks/python',
    description: '140+ curated coding exercises with automated test suites to maintain Python retention.',
    estimatedMinutes: 90,
  },
  {
    id: 'res-sql-bolt',
    skillName: 'SQL',
    title: 'SQLBolt Interactive Lessons',
    provider: 'SQLBolt',
    resourceType: 'practice',
    difficulty: 'beginner',
    learningStyle: 'interactive_coding',
    url: 'https://sqlbolt.com/',
    description: 'Interactive in-browser SQL exercises covering JOINs, aggregations, subqueries, and schema updates.',
    estimatedMinutes: 60,
  },
  {
    id: 'res-sql-pg',
    skillName: 'SQL',
    title: 'PostgreSQL Tutorial & Query Optimization',
    provider: 'PostgreSQL Official Docs',
    resourceType: 'documentation',
    difficulty: 'advanced',
    learningStyle: 'documentation_reading',
    url: 'https://www.postgresql.org/docs/current/tutorial.html',
    description: 'Production relational database guide covering indexing, window functions, and transactions.',
    estimatedMinutes: 90,
  },
  {
    id: 'res-html-mdn',
    skillName: 'HTML',
    title: 'MDN Semantic HTML & Accessibility Foundations',
    provider: 'MDN Web Docs',
    resourceType: 'documentation',
    difficulty: 'beginner',
    learningStyle: 'documentation_reading',
    url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content',
    description: 'Semantic landmarks, accessible forms, ARIA fundamentals, and document structure.',
    estimatedMinutes: 60,
  },
  {
    id: 'res-css-mdn',
    skillName: 'CSS',
    title: 'CSS Layout: Flexbox, Grid & Responsive Design',
    provider: 'web.dev',
    resourceType: 'course',
    difficulty: 'beginner',
    learningStyle: 'interactive_coding',
    url: 'https://web.dev/learn/css',
    description: 'Modern layout systems, specificity, custom properties, and responsive design patterns.',
    estimatedMinutes: 90,
  },
  {
    id: 'res-ts-handbook',
    skillName: 'TypeScript',
    title: 'TypeScript Handbook',
    provider: 'TypeScriptlang.org',
    resourceType: 'documentation',
    difficulty: 'intermediate',
    learningStyle: 'documentation_reading',
    url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
    description: 'Static typing, interfaces, discriminated unions, generics, and strict compiler checks.',
    estimatedMinutes: 85,
  },
  {
    id: 'res-sec-portswigger',
    skillName: 'Web Security',
    title: 'PortSwigger Web Security Academy (OWASP Labs)',
    provider: 'PortSwigger',
    resourceType: 'practice',
    difficulty: 'intermediate',
    learningStyle: 'hands_on_projects',
    url: 'https://portswigger.net/web-security',
    description: 'Interactive hands-on vulnerability labs covering SQL Injection, XSS, CSRF, SSRF, and broken access control.',
    estimatedMinutes: 120,
  },
  {
    id: 'res-sec-owasp',
    skillName: 'Web Security',
    title: 'OWASP Top 10 Security Risks Reference',
    provider: 'OWASP Foundation',
    resourceType: 'documentation',
    difficulty: 'beginner',
    learningStyle: 'documentation_reading',
    url: 'https://owasp.org/www-project-top-ten/',
    description: 'Industry-standard taxonomy of critical web application security vulnerabilities and mitigations.',
    estimatedMinutes: 60,
  },
  {
    id: 'res-net-cloudflare',
    skillName: 'Networking & TCP/IP',
    title: 'How the Internet Works & Networking Fundamentals',
    provider: 'Cloudflare Learning Center',
    resourceType: 'article',
    difficulty: 'beginner',
    learningStyle: 'documentation_reading',
    url: 'https://www.cloudflare.com/learning/network-layer/what-is-the-network-layer/',
    description: 'Clear explanations of TCP/IP, DNS, TLS handshakes, BGP, firewalls, and packet routing.',
    estimatedMinutes: 75,
  },
  {
    id: 'res-linux-journey',
    skillName: 'Linux & Shell',
    title: 'Linux Journey Interactive Modules',
    provider: 'Linux Journey',
    resourceType: 'practice',
    difficulty: 'beginner',
    learningStyle: 'interactive_coding',
    url: 'https://linuxjourney.com/',
    description: 'Command-line fundamentals, file permissions, process inspection, networking tools, and bash scripting.',
    estimatedMinutes: 90,
  },
  {
    id: 'res-siem-thm',
    skillName: 'SIEM & Threat Analysis',
    title: 'TryHackMe SOC Level 1 & Threat Detection',
    provider: 'TryHackMe',
    resourceType: 'practice',
    difficulty: 'intermediate',
    learningStyle: 'hands_on_projects',
    url: 'https://tryhackme.com/path/outline/soclevel1',
    description: 'Guided SOC analyst labs covering log triage, network forensics, phishing analysis, and SIEM querying.',
    estimatedMinutes: 150,
  },
  {
    id: 'res-docker-docs',
    skillName: 'Docker',
    title: 'Docker Official Getting Started Workshop',
    provider: 'Docker Docs',
    resourceType: 'practice',
    difficulty: 'beginner',
    learningStyle: 'hands_on_projects',
    url: 'https://docs.docker.com/get-started/',
    description: 'Containerizing multi-service applications, writing Dockerfiles, and managing Compose stacks.',
    estimatedMinutes: 80,
  },
  {
    id: 'res-k8s-docs',
    skillName: 'CI/CD & Kubernetes',
    title: 'Kubernetes Basics Interactive Tutorial',
    provider: 'Kubernetes.io',
    resourceType: 'documentation',
    difficulty: 'intermediate',
    learningStyle: 'interactive_coding',
    url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/',
    description: 'Deploying pods, scaling services, rolling updates, and debugging cluster workloads.',
    estimatedMinutes: 100,
  },
  {
    id: 'res-ml-scikit',
    skillName: 'Machine Learning',
    title: 'Scikit-learn User Guide & Supervised Learning',
    provider: 'Scikit-learn.org',
    resourceType: 'documentation',
    difficulty: 'intermediate',
    learningStyle: 'interactive_coding',
    url: 'https://scikit-learn.org/stable/user_guide.html',
    description: 'Practical guide to regression, classification, cross-validation, and feature pipelines.',
    estimatedMinutes: 120,
  },
  {
    id: 'res-stats-khan',
    skillName: 'Statistics & Probability',
    title: 'Statistics & Probability Foundations',
    provider: 'Khan Academy',
    resourceType: 'course',
    difficulty: 'beginner',
    learningStyle: 'video_tutorials',
    url: 'https://www.khanacademy.org/math/statistics-probability',
    description: 'Distributions, hypothesis testing, p-values, confidence intervals, and Bayesian reasoning.',
    estimatedMinutes: 120,
  },
  {
    id: 'res-git-pro',
    skillName: 'Git & Testing',
    title: 'Pro Git Book & Branching Workflows',
    provider: 'Git-scm.com',
    resourceType: 'documentation',
    difficulty: 'beginner',
    learningStyle: 'documentation_reading',
    url: 'https://git-scm.com/book/en/v2',
    description: 'Deep mastery of Git branching, rebasing, bisecting, and collaborative PR workflows.',
    estimatedMinutes: 75,
  },
  {
    id: 'res-uiux-nng',
    skillName: 'UI/UX Design',
    title: 'Nielsen Norman Group UX Articles & Research',
    provider: 'NN/g',
    resourceType: 'article',
    difficulty: 'beginner',
    learningStyle: 'documentation_reading',
    url: 'https://www.nngroup.com/articles/',
    description: 'Evidence-based usability heuristics, information architecture, and interaction design principles.',
    estimatedMinutes: 60,
  },
  {
    id: 'res-cloud-roadmap',
    skillName: 'Cloud Architecture',
    title: 'AWS Well-Architected Framework Overview',
    provider: 'AWS Documentation',
    resourceType: 'documentation',
    difficulty: 'intermediate',
    learningStyle: 'documentation_reading',
    url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html',
    description: 'Six pillars of cloud architecture: operational excellence, security, reliability, and cost.',
    estimatedMinutes: 90,
  },
  {
    id: 'res-viz-d3',
    skillName: 'Data Visualization',
    title: 'Data Visualization Storytelling with Python & Web',
    provider: 'Kaggle Learn',
    resourceType: 'practice',
    difficulty: 'beginner',
    learningStyle: 'interactive_coding',
    url: 'https://www.kaggle.com/learn/data-visualization',
    description: 'Selecting appropriate chart types, avoiding visual distortion, and building clean analytical plots.',
    estimatedMinutes: 90,
  },
];

export function seedDatabase(): void {
  // 1. Seed Careers, Requirements, and Role Courses
  const existingCareerCount = (db.prepare('SELECT COUNT(*) as cnt FROM career_roles').get() as { cnt: number }).cnt;
  if (existingCareerCount === 0) {
    const insertCareer = db.prepare(`
      INSERT INTO career_roles (
        id, title, category, description, median_salary_range, demand_outlook, career_guidance,
        required_soft_skills, recommended_tools, relevant_certifications, project_expectations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertReq = db.prepare(`
      INSERT INTO career_skill_requirements (id, career_id, skill_name, required_level, importance, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertCourse = db.prepare(`
      INSERT INTO role_courses (
        id, career_id, course_code, title, level, credits, hours, description, syllabus_modules, prerequisites
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      for (const c of CAREERS) {
        insertCareer.run(
          c.id,
          c.title,
          c.category,
          c.description,
          c.medianSalaryRange,
          c.demandOutlook,
          c.careerGuidance,
          JSON.stringify(c.requiredSoftSkills),
          JSON.stringify(c.recommendedTools),
          JSON.stringify(c.relevantCertifications),
          JSON.stringify(c.projectExpectations)
        );
        for (const s of c.skills) {
          insertReq.run(
            `${c.id}__${s.skillName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
            c.id,
            s.skillName,
            s.requiredLevel,
            s.importance,
            s.category
          );
        }
        for (const cr of c.courses) {
          insertCourse.run(
            `${c.id}__${cr.courseCode.toLowerCase()}`,
            c.id,
            cr.courseCode,
            cr.title,
            cr.level,
            cr.credits,
            cr.hours,
            cr.description,
            JSON.stringify(cr.syllabusModules),
            JSON.stringify(cr.prerequisites)
          );
        }
      }
    });
    tx();
  }

  // 2. Seed Verified Learning Resources
  const existingResCount = (db.prepare('SELECT COUNT(*) as cnt FROM learning_resources').get() as { cnt: number }).cnt;
  if (existingResCount === 0) {
    const insertRes = db.prepare(`
      INSERT INTO learning_resources (
        id, skill_name, title, provider, resource_type, difficulty, learning_style,
        url, description, estimated_minutes, is_verified_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const tx = db.transaction(() => {
      for (const r of VERIFIED_RESOURCES) {
        insertRes.run(
          r.id,
          r.skillName,
          r.title,
          r.provider,
          r.resourceType,
          r.difficulty,
          r.learningStyle,
          r.url,
          r.description,
          r.estimatedMinutes
        );
      }
    });
    tx();
  }

  // 3. Seed University Admin Account
  const existingAdmin = db.prepare('SELECT id FROM users WHERE id = ?').get('admin-zyra');
  if (!existingAdmin) {
    const adminHash = bcrypt.hashSync('ZyraAdmin@2026', 10);
    db.prepare(`
      INSERT INTO users (id, email, roll_number, role, password_hash, full_name, preferred_language, is_demo, avatar_url, created_at)
      VALUES (?, ?, ?, 'admin', ?, ?, 'en', 0, NULL, ?)
    `).run('admin-zyra', 'admin@zyra.in', 'ADMIN-01', adminHash, 'Dr. Kavitha Rao', new Date().toISOString());
  }

  // 4. Seed Published University Admin Assessments
  const existingAdminAssessments = (db.prepare('SELECT COUNT(*) as cnt FROM admin_assessments').get() as { cnt: number }).cnt;
  if (existingAdminAssessments === 0) {
    const now = new Date().toISOString();
    const insertAdminTest = db.prepare(`
      INSERT INTO admin_assessments (
        id, title, career_id, skill_name, course_code, difficulty, duration_minutes,
        passing_score, max_tab_switches, is_published, created_by, questions, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3, 1, 'admin-zyra', ?, ?)
    `);

    insertAdminTest.run(
      'adm-test-js-201',
      'ZT-FSD-201 Mid-Term: JavaScript Closures, Async & Event Loop',
      'full-stack-developer',
      'JavaScript',
      'ZT-FSD-201',
      'beginner',
      20,
      70,
      JSON.stringify([
        {
          questionType: 'mcq',
          prompt: 'What does a closure retain when an inner function is returned from an outer function in JavaScript?',
          codeSnippet: `function counter() {\n  let n = 0;\n  return () => ++n;\n}\nconst tick = counter();\nconsole.log(tick(), tick());`,
          options: ['1 2', '0 1', '1 1', 'ReferenceError: n is not defined'],
          correctAnswer: '1 2',
          explanation: 'Lexical closures keep the outer variable environment alive across invocations.',
          conceptTag: 'Closures & Lexical Scope',
        },
        {
          questionType: 'debugging',
          prompt: 'Why does `getData()` return a pending Promise instead of parsed JSON?',
          codeSnippet: `function getData() {\n  const res = fetch('/api/workspace');\n  return res.json();\n}`,
          options: [
            'fetch() returns a Promise that must be awaited before calling .json()',
            'res.json() only works in Python',
            'fetch() cannot be assigned to const',
            'JSON.stringify must wrap fetch()',
          ],
          correctAnswer: 'fetch() returns a Promise that must be awaited before calling .json()',
          explanation: 'Without async/await, res is a Promise rather than a resolved Response object.',
          conceptTag: 'Promises & Async/Await',
        },
        {
          questionType: 'mcq',
          prompt: 'In the JavaScript Event Loop, which queue runs immediately after the synchronous call stack clears?',
          options: [
            'Microtask queue (Promise.then / queueMicrotask)',
            'Macrotask queue (setTimeout)',
            'Service Worker thread',
            'CSS Layout queue',
          ],
          correctAnswer: 'Microtask queue (Promise.then / queueMicrotask)',
          explanation: 'Microtasks always drain completely before the next macrotask runs.',
          conceptTag: 'Event Loop & Queues',
        },
        {
          questionType: 'mcq',
          prompt: 'Which array method returns a new filtered array without mutating the source array?',
          options: ['Array.prototype.filter', 'Array.prototype.splice', 'Array.prototype.push', 'Array.prototype.reverse'],
          correctAnswer: 'Array.prototype.filter',
          explanation: 'filter() creates a new shallow array containing items matching the predicate.',
          conceptTag: 'Immutable Array Methods',
        },
        {
          questionType: 'scenario',
          prompt: 'Why is parameterized querying or escaping critical before rendering dynamic user input in the DOM?',
          options: [
            'It prevents Cross-Site Scripting (XSS) script injection',
            'It doubles browser RAM allocation',
            'It converts CSS Grid to Flexbox',
            'It disables ES module imports',
          ],
          correctAnswer: 'It prevents Cross-Site Scripting (XSS) script injection',
          explanation: 'Untrusted strings inserted via innerHTML can execute arbitrary scripts unless escaped or rendered via textContent.',
          conceptTag: 'DOM Security & XSS',
        },
      ]),
      now
    );

    insertAdminTest.run(
      'adm-test-sec-301',
      'ZT-SEC-301 Security Check: OWASP Top 10 & Network Defense',
      'cybersecurity-analyst',
      'Web Security',
      'ZT-SEC-301',
      'intermediate',
      25,
      70,
      JSON.stringify([
        {
          questionType: 'mcq',
          prompt: 'Which defense eliminates SQL Injection vulnerabilities at the database query boundary?',
          options: [
            'Parameterized prepared statements',
            'Base64 encoding SQL strings on the client',
            'Hiding error messages via CSS',
            'Using HTTP GET instead of POST',
          ],
          correctAnswer: 'Parameterized prepared statements',
          explanation: 'Parameterized queries bind user values separately from SQL syntax.',
          conceptTag: 'SQL Injection Prevention',
        },
        {
          questionType: 'mcq',
          prompt: 'What does setting `HttpOnly` on a session cookie protect against?',
          options: [
            'Client-side JavaScript reading the session token via document.cookie during an XSS attack',
            'Server CPU overload',
            'DNS cache poisoning',
            'SQL table lock contention',
          ],
          correctAnswer: 'Client-side JavaScript reading the session token via document.cookie during an XSS attack',
          explanation: 'HttpOnly prevents browser scripts from accessing sensitive session cookies.',
          conceptTag: 'Session & Cookie Security',
        },
        {
          questionType: 'scenario',
          prompt: 'A SOC analyst sees 450 failed SSH login attempts from one IP within 90 seconds. Which immediate containment step is standard?',
          options: [
            'Block the source IP at the firewall/fail2ban, verify whether any login succeeded, and enforce key-based auth',
            'Reboot the database server without checking logs',
            'Disable SSH logging',
            'Delete /etc/passwd',
          ],
          correctAnswer: 'Block the source IP at the firewall/fail2ban, verify whether any login succeeded, and enforce key-based auth',
          explanation: 'Contain the brute-force source while verifying potential compromise and hardening authentication.',
          conceptTag: 'SOC Incident Triage',
        },
        {
          questionType: 'mcq',
          prompt: 'Which TCP flag sequence completes a standard 3-way handshake?',
          options: ['SYN -> SYN-ACK -> ACK', 'ACK -> FIN -> RST', 'SYN -> RST -> FIN', 'PSH -> URG -> ACK'],
          correctAnswer: 'SYN -> SYN-ACK -> ACK',
          explanation: 'TCP establishes reliable sessions via SYN, SYN-ACK, and ACK.',
          conceptTag: 'TCP/IP Handshake',
        },
      ]),
      now
    );
  }

  // 5. Seed Student 2501@zyra.in (Rahul Sharma) & 2502@zyra.in (Priya Nair)
  const existingRahul = db.prepare('SELECT id FROM users WHERE id = ?').get('student-2501');
  if (!existingRahul) {
    seedRahulDemoData();
  } else {
    db.prepare(`
      UPDATE learner_profiles
      SET university = CASE WHEN COALESCE(university, '') = '' THEN 'ZyraTech University' ELSE university END,
          github_url = CASE WHEN COALESCE(github_url, '') = '' THEN 'https://github.com/rahul-sharma-2501' ELSE github_url END,
          linkedin_url = CASE WHEN COALESCE(linkedin_url, '') = '' THEN 'https://linkedin.com/in/rahul-sharma-2501' ELSE linkedin_url END
      WHERE user_id = 'student-2501'
    `).run();
  }

  const existingPriya = db.prepare('SELECT id FROM users WHERE id = ?').get('student-2502');
  if (!existingPriya) {
    const now = new Date().toISOString();
    const hash = bcrypt.hashSync('ZyraStudent@2026', 10);
    db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, email, roll_number, role, password_hash, full_name, preferred_language, is_demo, avatar_url, created_at)
        VALUES (?, ?, ?, 'student', ?, ?, 'ta', 0, NULL, ?)
      `).run('student-2502', '2502@zyra.in', '2502', hash, 'Priya Nair', now);

      db.prepare(`
        INSERT INTO learner_profiles (
          user_id, education_level, institution, university, github_url, linkedin_url,
          non_technical_skills, certifications, previous_projects, work_experience,
          career_interests, target_career_id, daily_learning_minutes, preferred_learning_style,
          resume_text, streak_days, onboarding_completed, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 75, 'hands_on_projects', ?, 4, 1, ?)
      `).run(
        'student-2502',
        'B.Tech Cybersecurity (3rd Year)',
        'ZyraTech University · School of Computing',
        'ZyraTech University',
        'https://github.com/priya-nair-2502',
        'https://linkedin.com/in/priya-nair-2502',
        JSON.stringify(['Incident Triage', 'Technical Reporting']),
        JSON.stringify(['ISC2 CC']),
        JSON.stringify([]),
        'Security Lab Teaching Assistant',
        JSON.stringify(['Cybersecurity', 'Cloud Security']),
        'cybersecurity-analyst',
        'Priya Nair — Roll 2502. Skills: Python 75%, Networking 80%, Linux 70%, Web Security 45%.',
        now
      );

      const pSkills = [
        { name: 'Python', cat: 'Programming', score: 75, status: 'assessment_verified' },
        { name: 'Networking & TCP/IP', cat: 'Security', score: 80, status: 'assessment_verified' },
        { name: 'Linux & Shell', cat: 'Systems', score: 70, status: 'assessment_verified' },
        { name: 'Web Security', cat: 'Security', score: 45, status: 'self_declared' },
      ];
      for (const s of pSkills) {
        db.prepare(`
          INSERT INTO learner_skills (
            id, user_id, skill_name, category, self_declared_score, verified_score,
            verification_status, theory_score, practical_score, problem_solving_score,
            project_score, retention_score, last_practiced_at, decay_risk, weak_concepts, updated_at
          ) VALUES (?, 'student-2502', ?, ?, ?, ?, ?, ?, ?, ?, ?, 78, ?, 'low', '[]', ?)
        `).run(uid('skill'), s.name, s.cat, s.score, s.score, s.status, s.score, s.score, s.score, s.score - 5, now, now);
      }

      db.prepare(`
        INSERT INTO syllabus_recommendations (
          id, user_id, career_id, course_code, course_title, module_code,
          recommended_module_title, skill_focus, rationale, topics, estimated_hours, priority, created_at
        ) VALUES (?, 'student-2502', 'cybersecurity-analyst', 'ZT-SEC-301', 'OWASP Top 10 & Application Defense', 'M1',
          'Injection, XSS & Session Security', 'Web Security',
          'Web Security is currently self-declared at 45% against an 85% Cybersecurity Analyst threshold.',
          ?, 12, 'critical', ?)
      `).run(uid('syl'), JSON.stringify(['Parameterized queries', 'Content Security Policy', 'SameSite cookies & CSRF']), now);
    })();
  }
}

export function resetRahulDemoData(): void {
  db.prepare('DELETE FROM users WHERE id = ?').run('student-2501');
  seedRahulDemoData();
}

function seedRahulDemoData(): void {
  const userId = 'student-2501';
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  const passwordHash = bcrypt.hashSync('ZyraStudent@2026', 10);

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, email, roll_number, role, password_hash, full_name, preferred_language, is_demo, avatar_url, created_at)
      VALUES (?, ?, ?, 'student', ?, ?, 'en', 1, ?, ?)
    `).run(
      userId,
      '2501@zyra.in',
      '2501',
      passwordHash,
      'Rahul Sharma',
      '/src/assets/images/avatar_rahul_learner_1794631427721.jpg',
      daysAgo(14)
    );

    db.prepare(`
      INSERT INTO learner_profiles (
        user_id, education_level, institution, university, github_url, linkedin_url,
        non_technical_skills, certifications, previous_projects, work_experience,
        career_interests, target_career_id, daily_learning_minutes, preferred_learning_style,
        resume_text, streak_days, onboarding_completed, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      userId,
      'B.Tech Computer Science (Roll No. 2501)',
      'ZyraTech University · School of Computing',
      'ZyraTech University',
      'https://github.com/rahul-sharma-2501',
      'https://linkedin.com/in/rahul-sharma-2501',
      JSON.stringify(['Problem Solving', 'Technical Documentation', 'Team Collaboration', 'Agile Workflows']),
      JSON.stringify(['Python for Everybody (Coursera)', 'Relational Databases Fundamentals']),
      JSON.stringify([
        {
          title: 'Campus Library Inventory CLI & SQL Engine',
          description: 'Built a Python + SQLite command-line inventory tracker with multi-table joins and overdue report exports.',
          technologies: ['Python', 'SQL'],
        },
        {
          title: 'Personal Static Academic Portfolio',
          description: 'Designed a semantic multi-section HTML portfolio with accessible navigation landmarks.',
          technologies: ['HTML'],
        },
      ]),
      'Software Engineering Intern (8 weeks) — wrote Python data-cleaning scripts and SQL analytical queries.',
      JSON.stringify(['Full Stack Development', 'Backend APIs', 'Cybersecurity']),
      'full-stack-developer',
      90,
      'interactive_coding',
      'Rahul Sharma (Roll 2501) — B.Tech CSE. Skills: Python (85%), SQL (75%), HTML (80%), JavaScript (20%).',
      6,
      daysAgo(0)
    );

    const initialSkills = [
      {
        name: 'Python',
        cat: 'Programming',
        self: 85,
        verified: 85,
        status: 'assessment_verified',
        theory: 88,
        practical: 86,
        ps: 84,
        proj: 82,
        ret: 62,
        lastDays: 11,
        decay: 'moderate',
        weak: ['Asyncio generators'],
      },
      {
        name: 'SQL',
        cat: 'Data',
        self: 75,
        verified: 75,
        status: 'project_verified',
        theory: 74,
        practical: 78,
        ps: 76,
        proj: 75,
        ret: 72,
        lastDays: 6,
        decay: 'low',
        weak: ['Window functions & CTE optimization'],
      },
      {
        name: 'HTML',
        cat: 'Frontend',
        self: 80,
        verified: 80,
        status: 'assessment_verified',
        theory: 82,
        practical: 80,
        ps: 76,
        proj: 78,
        ret: 81,
        lastDays: 4,
        decay: 'low',
        weak: [],
      },
      {
        name: 'JavaScript',
        cat: 'Programming',
        self: 20,
        verified: 20,
        status: 'self_declared',
        theory: 24,
        practical: 18,
        ps: 20,
        proj: 10,
        ret: 30,
        lastDays: 2,
        decay: 'low',
        weak: ['Closures & Lexical Scope', 'Promises & Async/Await', 'DOM Event Loop'],
      },
      {
        name: 'React',
        cat: 'Frontend',
        self: 0,
        verified: 0,
        status: 'self_declared',
        theory: 0,
        practical: 0,
        ps: 0,
        proj: 0,
        ret: 0,
        lastDays: 14,
        decay: 'low',
        weak: ['Component Lifecycle', 'Hooks & State Management'],
      },
      {
        name: 'Node.js',
        cat: 'Backend',
        self: 0,
        verified: 0,
        status: 'self_declared',
        theory: 0,
        practical: 0,
        ps: 0,
        proj: 0,
        ret: 0,
        lastDays: 14,
        decay: 'low',
        weak: ['Express Routing & Middleware', 'REST API Auth'],
      },
    ];

    const insertSkill = db.prepare(`
      INSERT INTO learner_skills (
        id, user_id, skill_name, category, self_declared_score, verified_score,
        verification_status, theory_score, practical_score, problem_solving_score,
        project_score, retention_score, last_practiced_at, decay_risk, weak_concepts, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const s of initialSkills) {
      insertSkill.run(
        `skill-2501-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        userId,
        s.name,
        s.cat,
        s.self,
        s.verified,
        s.status,
        s.theory,
        s.practical,
        s.ps,
        s.proj,
        s.ret,
        daysAgo(s.lastDays),
        s.decay,
        JSON.stringify(s.weak),
        daysAgo(0)
      );
    }

    // Seed Upcoming Syllabus Module Recommendations for Rahul
    const insertSyl = db.prepare(`
      INSERT INTO syllabus_recommendations (
        id, user_id, career_id, course_code, course_title, module_code,
        recommended_module_title, skill_focus, rationale, topics, estimated_hours, priority, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertSyl.run(
      'syl-2501-m1',
      userId,
      'full-stack-developer',
      'ZT-FSD-201',
      'Modern JavaScript & Asynchronous Runtime',
      'M1',
      'Closures, Scope & Higher-Order Functions',
      'JavaScript',
      'JavaScript is currently 20% (self-declared) and blocks ZT-FSD-301 (React) and ZT-FSD-401 (Node.js). Complete this module before attempting framework courses.',
      JSON.stringify(['Lexical scope', 'Closures', 'Array map/filter/reduce', 'Immutability']),
      12,
      'critical',
      daysAgo(1)
    );
    insertSyl.run(
      'syl-2501-m2',
      userId,
      'full-stack-developer',
      'ZT-FSD-201',
      'Modern JavaScript & Asynchronous Runtime',
      'M2',
      'Promises, Async/Await & Event Loop',
      'JavaScript',
      'Recommended immediately after M1 to prepare for Node.js asynchronous APIs and React data fetching.',
      JSON.stringify(['Microtask vs Macrotask queues', 'Fetch API & error boundaries', 'AbortController']),
      14,
      'recommended',
      daysAgo(1)
    );

    const roadmapId = 'roadmap-2501-fsd-init';
    db.prepare(`
      INSERT INTO learning_roadmaps (
        id, user_id, career_id, career_title, status, compatibility_score,
        readiness_estimate, estimated_total_hours, adaptation_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)
    `).run(
      roadmapId,
      userId,
      'full-stack-developer',
      'Full Stack Developer',
      46,
      41,
      68,
      'Initial personalized roadmap generated from Roll 2501 Skill DNA: Python (85%), HTML (80%), and SQL (75%) recognized as foundations; JavaScript (20%) prioritized ahead of React and Node.js.',
      daysAgo(7),
      daysAgo(1)
    );

    const milestones = [
      {
        order: 1,
        skill: 'HTML',
        title: 'Semantic HTML & Accessible Forms',
        obj: 'Consolidate semantic document structure and accessible form patterns for full-stack UIs.',
        diff: 'beginner',
        hrs: 4,
        status: 'completed',
        criteria: 'Score >= 75% on HTML competency verification.',
        ex: 'Audit and refactor a multi-section registration form using proper fieldset, label, and ARIA roles.',
        proj: 'Accessible Multi-Step Onboarding Form',
        transfer: 1,
        score: 80,
        note: 'Verified from initial competency evaluation (80%).',
      },
      {
        order: 2,
        skill: 'SQL',
        title: 'Relational Schema Design & Multi-Table Queries',
        obj: 'Apply foreign keys, joins, and parameterized queries for web application backends.',
        diff: 'intermediate',
        hrs: 6,
        status: 'completed',
        criteria: 'Verify normalized 3-table schema project.',
        ex: 'Write indexed JOIN and GROUP BY analytical queries across users, orders, and products.',
        proj: 'Inventory Relational Schema Engine',
        transfer: 1,
        score: 75,
        note: 'Verified via Python + SQL Inventory project (75%).',
      },
      {
        order: 3,
        skill: 'JavaScript',
        title: 'Core JavaScript, Closures, Async/Await & DOM',
        obj: 'Bridge the primary competency gap from 20% to >= 75% before unlocking React and Node.js.',
        diff: 'beginner',
        hrs: 18,
        status: 'in_progress',
        criteria: 'Pass ZT-FSD-201 JavaScript assessment (>= 70%) in proctored mode.',
        ex: 'Implement debounced search, async fetch error handling, and closure-based state counters.',
        proj: 'Interactive Task & API Explorer without Frameworks',
        transfer: 0,
        score: null,
        note: 'Critical prerequisite bottleneck identified by Career Matching & Roadmap Agents.',
      },
      {
        order: 4,
        skill: 'React',
        title: 'Component Architecture, Hooks & State Management',
        obj: 'Build modular, typed React interfaces consuming backend REST endpoints.',
        diff: 'intermediate',
        hrs: 20,
        status: 'locked',
        criteria: 'Complete React assessment (>= 75%) and stateful dashboard mini-project.',
        ex: 'Build reusable filterable data table with custom hooks and optimistic UI updates.',
        proj: 'Skill Tracker Single-Page Dashboard',
        transfer: 0,
        score: null,
        note: 'Unlocked upon achieving >= 70% in JavaScript.',
      },
      {
        order: 5,
        skill: 'Node.js',
        title: 'Express REST APIs, Auth & SQL Persistence',
        obj: 'Architect secure server-side endpoints connecting React frontends to persistent SQL storage.',
        diff: 'intermediate',
        hrs: 20,
        status: 'locked',
        criteria: 'Pass Backend Security & Node.js assessment and deploy full-stack CRUD service.',
        ex: 'Implement bcrypt password hashing, session cookie middleware, and input validation.',
        proj: 'Full-Stack Authenticated Learning Log API',
        transfer: 0,
        score: null,
        note: 'Depends on JavaScript and SQL competency.',
      },
    ];

    const insertMilestone = db.prepare(`
      INSERT INTO roadmap_milestones (
        id, roadmap_id, user_id, stage_order, skill_name, title, learning_objective,
        difficulty, estimated_hours, status, completion_criteria, practical_exercise,
        mini_project, is_reusable_transfer, assessment_required, last_assessment_score, adapted_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    for (const m of milestones) {
      insertMilestone.run(
        `ms-2501-${m.order}`,
        roadmapId,
        userId,
        m.order,
        m.skill,
        m.title,
        m.obj,
        m.diff,
        m.hrs,
        m.status,
        m.criteria,
        m.ex,
        m.proj,
        m.transfer,
        m.score,
        m.note
      );
    }

    const insertAssess = db.prepare(`
      INSERT INTO skill_assessments (
        id, user_id, admin_assessment_id, title, skill_name, career_id, difficulty, assessment_type, status,
        score, total_questions, correct_count, tab_switch_count, weak_concepts, feedback, created_at, completed_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, 0, ?, ?, ?, ?)
    `);

    insertAssess.run(
      'assess-2501-py-init',
      userId,
      'Python Competency Baseline',
      'Python',
      'full-stack-developer',
      'intermediate',
      'mixed',
      85,
      5,
      4,
      JSON.stringify(['Asyncio generators']),
      'Strong mastery of Python data structures, comprehensions, and OOP.',
      daysAgo(11),
      daysAgo(11)
    );
    insertAssess.run(
      'assess-2501-html-init',
      userId,
      'Semantic HTML5 Evaluation',
      'HTML',
      'full-stack-developer',
      'intermediate',
      'mcq',
      80,
      5,
      4,
      JSON.stringify([]),
      'Solid command of semantic HTML5 elements, accessibility landmarks, and form validation.',
      daysAgo(4),
      daysAgo(4)
    );

    const insertProg = db.prepare(`
      INSERT INTO progress_records (id, user_id, activity_type, skill_name, title, minutes_spent, score, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const progSeed = [
      { id: 'pr-1', type: 'assessment', skill: 'Python', title: 'Python Competency Baseline', min: 35, score: 85, d: 11 },
      { id: 'pr-2', type: 'project', skill: 'SQL', title: 'Campus Inventory SQL Engine Verification', min: 85, score: 75, d: 6 },
      { id: 'pr-3', type: 'assessment', skill: 'HTML', title: 'Semantic HTML5 Evaluation', min: 30, score: 80, d: 4 },
      { id: 'pr-4', type: 'resource', skill: 'JavaScript', title: 'MDN JavaScript Closures & Scope', min: 45, score: null, d: 3 },
      { id: 'pr-5', type: 'resource', skill: 'JavaScript', title: 'Async/Await & Event Loop Drill', min: 50, score: null, d: 2 },
      { id: 'pr-6', type: 'roadmap_stage', skill: 'JavaScript', title: 'DOM Manipulation Practice', min: 40, score: null, d: 1 },
    ];
    for (const p of progSeed) {
      insertProg.run(p.id, userId, p.type, p.skill, p.title, p.min, p.score, daysAgo(p.d));
    }

    db.prepare(`
      INSERT INTO revision_schedules (id, user_id, skill_name, reason, urgency, due_date, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      'rev-2501-py',
      userId,
      'Python',
      'Retention score dipped to 62% after 11 days without Python practice. Schedule a 15-minute spaced revision drill.',
      'moderate',
      daysAgo(-1),
      daysAgo(0)
    );

    db.prepare(`
      INSERT INTO learner_projects (
        id, user_id, title, skill_name, career_id, description, submission_notes,
        repo_or_demo_link, ai_verification_score, ai_feedback, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?)
    `).run(
      'proj-2501-sql',
      userId,
      'Campus Library Inventory CLI & SQL Engine',
      'SQL',
      'full-stack-developer',
      'Normalized 3-table relational schema tracking books, members, and checkouts with overdue aggregations.',
      'Implemented foreign keys, B-tree indexes on ISBN/member_id, and parameterized Python sqlite3 queries.',
      'https://github.com/demo-rahul/library-sql-engine',
      75,
      'Verified relational normalization and join accuracy.',
      daysAgo(6)
    );

    const initialAgentOutputs = [
      {
        agentName: 'Skill Assessment Agent',
        summary: 'Verified Python (85%) and HTML (80%) via diagnostic evaluations; SQL (75%) verified via project submission.',
        keyFindings: ['3 verified core foundations', 'JavaScript (20%) unverified and below Full Stack threshold'],
        recommendations: ['Attempt ZT-FSD-201 JavaScript proctored assessment to diagnose weak concepts.'],
      },
      {
        agentName: 'Career Matching Agent',
        summary: 'Calculated 46% skill compatibility for Full Stack Developer.',
        keyFindings: ['SQL & HTML meet target thresholds', 'Critical gaps in JavaScript, React, and Node.js'],
        recommendations: ['Prioritize JavaScript mastery ahead of React and Node.js.'],
      },
      {
        agentName: 'Roadmap Generation Agent',
        summary: 'Generated a 5-stage sequential roadmap and recommended upcoming syllabus module ZT-FSD-201 M1.',
        keyFindings: ['HTML and SQL marked completed', 'React & Node.js gated behind JavaScript >= 70%'],
        recommendations: ['Study Closures, Scope & Async Runtime first.'],
      },
      {
        agentName: 'Resource Recommendation Agent',
        summary: 'Matched interactive_coding resources for JavaScript beginner level.',
        keyFindings: ['Interactive coding matches Rahul’s declared preference'],
        recommendations: ['Assign JavaScript.info & MDN JavaScript Guide ahead of framework tutorials.'],
      },
      {
        agentName: 'Performance Analysis Agent',
        summary: 'Detected moderate learning decay risk on Python (11 days since last practice, retention 62%).',
        keyFindings: ['6-day active learning streak', 'Python retention drifting downward'],
        recommendations: ['Schedule a 15-minute Python spaced revision quiz this week.'],
      },
      {
        agentName: 'AI Mentor Agent',
        summary: 'Prepared contextual onboarding briefing using Roll 2501 Skill DNA.',
        keyFindings: ['Strong Python mental model transfers directly to JavaScript'],
        recommendations: ['Bridge JS concepts by contrasting them with Python equivalents.'],
      },
    ];

    db.prepare(`
      INSERT INTO ai_agent_decisions (
        id, user_id, trigger_event, orchestrator_summary, agent_outputs, next_action, explanation, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'dec-2501-init',
      userId,
      'ONBOARDING_COMPLETE',
      'Evaluated Roll 2501 baseline competencies against Full Stack Developer courses and sequenced ZT-FSD-201 JavaScript remediation ahead of React and Node.js.',
      JSON.stringify(initialAgentOutputs),
      'Study Upcoming Syllabus Module ZT-FSD-201 (M1) and take the proctored JavaScript assessment.',
      'Although Rahul excels in Python (85%) and HTML (80%), Full Stack React and Node.js courses require JavaScript fluency. React/Node.js are gated until JavaScript reaches >= 70%.',
      daysAgo(1)
    );

    db.prepare(`
      INSERT INTO mentor_conversations (id, user_id, role, content, context_tag, created_at)
      VALUES (?, ?, 'assistant', ?, 'onboarding', ?)
    `).run(
      'msg-2501-init',
      userId,
      'Welcome to ZyraTech, Rahul (Roll No. 2501). Your Python (85%), HTML (80%), and SQL (75%) foundations are verified. Your recommended upcoming syllabus module is ZT-FSD-201 M1 (Closures, Scope & Higher-Order Functions). Ask me anything in your preferred Indian language or English!',
      daysAgo(1)
    );

    db.prepare(`
      INSERT INTO career_goal_history (
        id, user_id, from_career_id, to_career_id, compatibility_before, compatibility_after, preserved_skills, changed_at
      ) VALUES (?, ?, NULL, ?, 0, 46, ?, ?)
    `).run(
      'cgh-2501-init',
      userId,
      'full-stack-developer',
      JSON.stringify(['Python', 'SQL', 'HTML']),
      daysAgo(14)
    );

    db.prepare(`
      INSERT INTO user_resource_bookmarks (id, user_id, resource_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run('bm-2501-1', userId, 'res-js-info', daysAgo(2));
  });

  tx();
}

export function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 12)}`;
}
