import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

/**
 * 250+ Industry Skills Dictionary across Tech, Design, Management & HR
 */
const SKILLS_DICTIONARY = [
    // Frontend
    "React", "React.js", "React Native", "Next.js", "Vue", "Vue.js", "Nuxt.js", "Angular", "AngularJS",
    "TypeScript", "JavaScript", "ES6", "HTML", "HTML5", "CSS", "CSS3", "Tailwind CSS", "Tailwind",
    "Bootstrap", "Sass", "SCSS", "Less", "Redux", "Redux Toolkit", "Zustand", "MobX", "jQuery",
    "Webpack", "Vite", "Babel", "Responsive Design", "WebSockets", "Socket.io",

    // Backend
    "Node.js", "Express", "Express.js", "NestJS", "Fastify", "Python", "Django", "FastAPI", "Flask",
    "Java", "Spring", "Spring Boot", "Hibernate", "C", "C++", "C#", ".NET", "ASP.NET", "Entity Framework",
    "PHP", "Laravel", "Symfony", "Ruby", "Ruby on Rails", "Go", "Golang", "Rust", "Kotlin", "Swift",
    "Scala", "Perl", "Elixir", "GraphQL", "REST API", "Microservices", "gRPC",

    // Databases & Cache
    "MongoDB", "Mongoose", "PostgreSQL", "Postgres", "MySQL", "SQL", "SQLite", "MariaDB", "Oracle",
    "SQL Server", "MSSQL", "Redis", "Memcached", "Firebase", "Firestore", "DynamoDB", "Cassandra",
    "Neo4j", "Elasticsearch", "Prisma", "Sequelize", "TypeORM",

    // Cloud, DevOps & Infra
    "AWS", "Amazon Web Services", "EC2", "S3", "Lambda", "Azure", "GCP", "Google Cloud",
    "Docker", "Kubernetes", "K8s", "CI/CD", "Jenkins", "GitHub Actions", "GitLab CI", "Terraform",
    "Ansible", "Linux", "Ubuntu", "Nginx", "Apache", "Git", "GitHub", "GitLab", "Bitbucket",
    "Cloudflare", "Serverless", "Monitoring", "Prometheus", "Grafana",

    // AI, Data & Machine Learning
    "Machine Learning", "Deep Learning", "Artificial Intelligence", "AI", "NLP", "Natural Language Processing",
    "LLM", "LLMs", "Generative AI", "Computer Vision", "TensorFlow", "PyTorch", "Keras", "Scikit-Learn",
    "Pandas", "NumPy", "Matplotlib", "Seaborn", "OpenCV", "Hugging Face", "LangChain", "Data Analysis",
    "Data Science", "Data Engineering", "Power BI", "Tableau", "Apache Spark", "Hadoop", "Kafka",

    // Mobile & Cross Platform
    "Android", "iOS", "Flutter", "Dart", "SwiftUI", "Jetpack Compose", "Ionic", "Cordova",

    // Testing & QA
    "Jest", "Mocha", "Chai", "Cypress", "Selenium", "Playwright", "Puppeteer", "Postman", "Swagger",
    "Unit Testing", "Integration Testing", "TDD", "Automation Testing", "Manual Testing", "JMeter",

    // UI/UX & Design
    "Figma", "Adobe XD", "Sketch", "InVision", "Photoshop", "Illustrator", "Canva", "UI/UX",
    "User Research", "Wireframing", "Prototyping", "Design Systems", "Interaction Design",

    // Management, HR & Business
    "Agile", "Scrum", "Kanban", "Jira", "Confluence", "Trello", "Asana", "Project Management",
    "Product Management", "Talent Acquisition", "Technical Recruiting", "HR Management", "HRIS",
    "Employee Relations", "Payroll", "Performance Management", "Onboarding", "Conflict Resolution",
    "Leadership", "Communication", "Problem Solving", "Time Management", "Team Management"
];

/**
 * Common Job Titles List
 */
const COMMON_ROLES = [
    "Full Stack Developer", "Full Stack Engineer", "Frontend Developer", "Frontend Engineer",
    "Backend Developer", "Backend Engineer", "Software Engineer", "Software Developer",
    "Senior Software Engineer", "Lead Engineer", "Staff Engineer", "Principal Engineer",
    "React Developer", "Node.js Developer", "Python Developer", "Java Developer",
    "DevOps Engineer", "Cloud Engineer", "Site Reliability Engineer", "SRE",
    "UI/UX Designer", "Product Designer", "Graphic Designer", "Visual Designer",
    "QA Engineer", "Automation QA", "SDET", "Manual Tester", "Quality Analyst",
    "Data Scientist", "Data Analyst", "Data Engineer", "Machine Learning Engineer",
    "Product Manager", "Project Manager", "Scrum Master", "Engineering Manager",
    "Technical Architect", "Solutions Architect", "System Administrator",
    "Android Developer", "iOS Developer", "Mobile App Developer", "Flutter Developer",
    "HR Manager", "HR Executive", "HR Specialist", "Talent Acquisition Specialist", "Recruiter"
];

/**
 * Extract raw text from file buffer based on mimetype or filename
 */
export const extractTextFromBuffer = async (buffer, mimetype = "", filename = "") => {
    if (!buffer) return "";

    const lowerName = (filename || "").toLowerCase();
    const lowerType = (mimetype || "").toLowerCase();

    // 1. PDF Parsing
    if (lowerType.includes("pdf") || lowerName.endsWith(".pdf")) {
        try {
            const parser = new PDFParse({ data: buffer });
            const result = await parser.getText();
            await parser.destroy().catch(() => {});
            if (result && result.text) {
                return result.text;
            }
        } catch (err) {
            console.warn("PDF extraction error, attempting fallback:", err.message);
        }
    }

    // 2. DOCX / DOC Parsing
    if (lowerType.includes("word") || lowerType.includes("officedocument") || lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
        try {
            const result = await mammoth.extractRawText({ buffer });
            if (result && result.value) {
                return result.value;
            }
        } catch (err) {
            console.warn("DOCX extraction error:", err.message);
        }
    }

    // 3. Fallback: UTF-8 plain string
    try {
        const text = buffer.toString("utf-8");
        // Check if string contains printable characters
        if (/[\x20-\x7E]{10,}/.test(text)) {
            return text;
        }
    } catch {
        // ignore
    }

    return "";
};

/**
 * Parse candidate details from resume text
 */
export const parseResumeDetails = (rawText, filename = "") => {
    if (!rawText || typeof rawText !== "string") {
        return {
            name: extractNameFromFilename(filename),
            email: "",
            phone: "",
            position: "Software Engineer",
            expYears: 0,
            expMonths: 0,
            experience: "0 Yrs",
            currentCompany: "N/A",
            skills: [],
            skillsString: "",
            summary: "Uploaded resume without extractable text."
        };
    }

    const lines = rawText
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

    // 1. Extract Email
    let email = "";
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
    if (emailMatch) {
        email = emailMatch[0].trim().toLowerCase();
    }

    // 2. Extract Phone Number
    let phone = "";
    // Matches Indian and international formats: +91 9876543210, (123) 456-7890, 9876543210
    const phoneRegexes = [
        /(?:\+?91[\s.-]?)?[6-9]\d{9}/,
        /(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/,
        /\b\d{10,12}\b/
    ];
    for (const rx of phoneRegexes) {
        const m = rawText.match(rx);
        if (m) {
            phone = m[0].trim();
            break;
        }
    }

    // 3. Extract Candidate Name
    let name = "";
    const ignoreNameTerms = [
        "resume", "curriculum", "vitae", "cv", "profile", "contact", "phone",
        "email", "address", "summary", "objective", "experience", "education",
        "skills", "projects", "certifications", "page", "developer", "engineer"
    ];

    // Scan first 8 lines for a valid personal name
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
        const line = lines[i];
        if (line.includes("@") || /(?:https?:\/\/|\.com|\.in)/i.test(line)) continue;
        if (/\d/.test(line)) continue;

        const words = line.split(/\s+/).filter(Boolean);
        if (words.length >= 2 && words.length <= 4) {
            const isAllIgnore = words.some(w => ignoreNameTerms.includes(w.toLowerCase()));
            if (!isAllIgnore) {
                // Check if starts with uppercase letter
                const isProperName = words.every(w => /^[A-Z][a-zA-Z.'-]*$/.test(w));
                if (isProperName || /^[a-zA-Z\s.'-]+$/.test(line)) {
                    name = line;
                    break;
                }
            }
        }
    }
    if (!name) {
        name = extractNameFromFilename(filename);
    }

    // 4. Extract Target Position / Designation
    let position = "";
    for (const role of COMMON_ROLES) {
        const rx = new RegExp(`\\b${role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (rx.test(rawText)) {
            position = role;
            break;
        }
    }
    if (!position) {
        position = "Software Engineer";
    }

    // 5. Extract Experience (Years & Months)
    let expYears = 0;
    let expMonths = 0;

    // Pattern A: "X years Y months" or "X.Y years" or "X+ years of experience"
    const expRegexes = [
        /(?:total\s*experience|experience)\s*[:\-]?\s*(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)(?:\s*(?:and|&)?\s*(\d+)\s*(?:months?|mos?))?/i,
        /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)(?:\s*(?:and|&)?\s*(\d+)\s*(?:months?|mos?))?\s*(?:of)?\s*experience/i,
        /(\d+)\+?\s*(?:years?|yrs?)\s*in\s*(?:software|development|tech|industry|it)/i
    ];

    for (const rx of expRegexes) {
        const m = rawText.match(rx);
        if (m) {
            const val = parseFloat(m[1]);
            if (!isNaN(val) && val < 50) {
                expYears = Math.floor(val);
                expMonths = m[2] ? parseInt(m[2], 10) : (val % 1 > 0 ? Math.round((val % 1) * 12) : 0);
                break;
            }
        }
    }

    // If not found, try to estimate from year ranges (e.g. 2021 - Present, 2019 - 2024)
    if (expYears === 0) {
        const yearMatches = rawText.match(/\b(19\d\d|20\d\d)\s*(?:-|to|–)\s*(present|current|now|20\d\d)\b/gi);
        if (yearMatches && yearMatches.length > 0) {
            let totalEstimatedYears = 0;
            const currentYear = new Date().getFullYear();
            yearMatches.forEach(ym => {
                const parts = ym.split(/(?:-|to|–)/i).map(p => p.trim());
                const startYear = parseInt(parts[0], 10);
                const endYear = /present|current|now/i.test(parts[1]) ? currentYear : parseInt(parts[1], 10);
                if (startYear && endYear && endYear >= startYear && endYear <= currentYear + 1) {
                    totalEstimatedYears = Math.max(totalEstimatedYears, endYear - startYear);
                }
            });
            if (totalEstimatedYears > 0 && totalEstimatedYears < 40) {
                expYears = totalEstimatedYears;
            }
        }
    }

    const experienceStr = `${expYears} Yrs${expMonths > 0 ? ` ${expMonths} Mos` : ""}`;

    // 6. Extract Current Company
    let currentCompany = "N/A";
    const companyPatterns = [
        /(?:currently\s*(?:working)?\s*at|worked\s*at|company\s*[:\-]|employer\s*[:\-])\s*([A-Za-z0-9&.,\s]{2,35})/i,
        /(?:experience|employment)\s*\n+([A-Za-z0-9&.,\s]{3,35})\s*(?:-|–|\|)/i
    ];
    for (const cp of companyPatterns) {
        const match = rawText.match(cp);
        if (match && match[1]) {
            const cleanComp = match[1].replace(/[\r\n]+/g, " ").trim();
            if (cleanComp && cleanComp.length > 2 && !ignoreNameTerms.includes(cleanComp.toLowerCase())) {
                currentCompany = cleanComp;
                break;
            }
        }
    }

    // 7. Extract Skills (Keyword Matching)
    const detectedSkills = new Set();
    for (const skill of SKILLS_DICTIONARY) {
        // Safe regex escaping
        const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Special case handling for C++, C#, .NET
        let rx;
        if (skill === "C++" || skill === "C#") {
            rx = new RegExp(`(?:^|\\s|,|/)${escaped}(?:$|\\s|,|/|;)`, "i");
        } else if (skill === ".NET") {
            rx = new RegExp(`(?:^|\\s|,)\\.NET(?:$|\\s|,|;)`, "i");
        } else {
            rx = new RegExp(`\\b${escaped}\\b`, "i");
        }

        if (rx.test(rawText)) {
            detectedSkills.add(skill);
        }
    }

    const skillsArray = Array.from(detectedSkills).slice(0, 25);
    const skillsString = skillsArray.join(", ");

    // 8. Generate Professional Summary
    const summary = `${name || "Candidate"} is a ${position} with approximately ${experienceStr} of professional experience. Demonstrated proficiency in ${skillsArray.slice(0, 5).join(", ") || "software technologies"}.`;

    return {
        name,
        email,
        phone,
        position,
        expYears,
        expMonths,
        experience: experienceStr,
        currentCompany,
        skills: skillsArray,
        skillsString,
        summary,
        rawText
    };
};

/**
 * Fallback to extract candidate name from file name
 */
function extractNameFromFilename(filename) {
    if (!filename) return "New Candidate";
    let base = filename.replace(/\.(pdf|docx|doc|txt)$/i, "");
    base = base.replace(/[-_]+/g, " ");
    base = base.replace(/\b(resume|cv|biodata|profile|curriculum|vitae)\b/gi, "").trim();
    if (!base) return "New Candidate";
    // Title case
    return base
        .split(" ")
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

/**
 * AI Semantic Search & Keyword Matching Engine
 * Ranks candidate profiles based on natural language search query
 */
export const rankCandidatesWithAi = (candidates, query, filters = {}) => {
    if (!Array.isArray(candidates) || candidates.length === 0) return [];
    if (!query || !query.trim()) {
        // Return all with neutral score
        return candidates.map(c => ({
            ...c,
            matchScore: 100,
            matchingSkills: c.skills || [],
            missingSkills: [],
            aiRationale: "Showing all candidates."
        }));
    }

    const cleanQuery = query.toLowerCase().trim();

    // 1. Detect requested skills from query
    const requestedSkills = [];
    for (const skill of SKILLS_DICTIONARY) {
        const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(`\\b${escaped}\\b`, "i");
        if (rx.test(cleanQuery)) {
            requestedSkills.push(skill);
        }
    }

    // 2. Detect requested experience in query (e.g. "3 years", "5+ yrs", "2 yrs")
    let targetExp = null;
    const expQueryMatch = cleanQuery.match(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/);
    if (expQueryMatch) {
        targetExp = parseFloat(expQueryMatch[1]);
    }

    // 3. Detect requested role / position
    const requestedRoles = [];
    for (const role of COMMON_ROLES) {
        if (cleanQuery.includes(role.toLowerCase())) {
            requestedRoles.push(role);
        }
    }

    // Tokenized query terms (words longer than 2 characters)
    const stopWords = new Set(["with", "and", "the", "for", "who", "has", "have", "candidate", "looking", "need", "developer", "engineer", "experience", "years", "yrs", "in"]);
    const queryTokens = cleanQuery
        .replace(/[^a-zA-Z0-9#+.]/g, " ")
        .split(/\s+/)
        .filter(t => t.length > 2 && !stopWords.has(t));

    const scoredCandidates = candidates.map(cand => {
        // Candidate combined text for search
        const candSkills = (cand.skills || []).map(s => s.toLowerCase());
        const candPosition = (cand.position || "").toLowerCase();
        const candCompany = (cand.currentCompany || "").toLowerCase();
        const candResumeText = (cand.resumeText || "").toLowerCase();
        const candSummary = (cand.summary || "").toLowerCase();

        let totalScore = 0;
        const matchingSkillsFound = [];
        const missingSkills = [];

        // A. Skill Match (Max 50 points)
        if (requestedSkills.length > 0) {
            let matchedCount = 0;
            requestedSkills.forEach(reqSkill => {
                const lower = reqSkill.toLowerCase();
                const hasSkill = candSkills.includes(lower) || candResumeText.includes(lower);
                if (hasSkill) {
                    matchedCount++;
                    matchingSkillsFound.push(reqSkill);
                } else {
                    missingSkills.push(reqSkill);
                }
            });
            const skillRatio = matchedCount / requestedSkills.length;
            totalScore += skillRatio * 50;
        } else {
            // If no specific recognized skill was queried, award 30 base points
            totalScore += 25;
        }

        // B. Role / Position Match (Max 25 points)
        if (requestedRoles.length > 0) {
            const hasRole = requestedRoles.some(r => candPosition.includes(r.toLowerCase()));
            if (hasRole) {
                totalScore += 25;
            } else {
                totalScore += 5;
            }
        } else {
            // Check if any query tokens match position
            const posMatch = queryTokens.some(t => candPosition.includes(t));
            if (posMatch) {
                totalScore += 20;
            } else {
                totalScore += 15;
            }
        }

        // C. Experience Match (Max 15 points)
        const candExpYears = parseFloat(cand.experience) || 0;
        if (targetExp !== null) {
            if (candExpYears >= targetExp) {
                totalScore += 15;
            } else if (candExpYears >= targetExp * 0.7) {
                totalScore += 10;
            } else {
                totalScore += 4;
            }
        } else {
            totalScore += 12;
        }

        // D. General Keyword Relevance (Max 10 points)
        let tokenHits = 0;
        queryTokens.forEach(t => {
            if (candPosition.includes(t) || candSkills.some(s => s.includes(t)) || candCompany.includes(t) || candResumeText.includes(t) || candSummary.includes(t)) {
                tokenHits++;
            }
        });
        const tokenRatio = queryTokens.length > 0 ? Math.min(1, tokenHits / queryTokens.length) : 0.5;
        totalScore += tokenRatio * 10;

        // Normalize between 15% and 98%
        const finalScore = Math.min(99, Math.max(18, Math.round(totalScore)));

        // Generate dynamic explanation
        let rationale = "";
        if (matchingSkillsFound.length > 0) {
            rationale = `Matches ${matchingSkillsFound.length} required skill${matchingSkillsFound.length > 1 ? "s" : ""} (${matchingSkillsFound.slice(0, 3).join(", ")}).`;
        } else if (finalScore >= 70) {
            rationale = `Strong role alignment for ${cand.position || "target position"}.`;
        } else {
            rationale = `Partial match based on experience and profile background.`;
        }

        return {
            ...cand,
            matchScore: finalScore,
            matchingSkills: matchingSkillsFound,
            missingSkills: missingSkills,
            aiRationale: rationale
        };
    });

    // Sort descending by matchScore
    return scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
};
