// app/lib/discoveryMockData.ts

export type CandidateType = 'Professor' | 'Grant' | 'Scholarship' | 'Research Topic';

export interface Candidate {
  id: string;
  type: CandidateType;
  title: string;
  university: string;
  sourceUrl: string;
  summary: string;
  confidenceScore: number; // 0-100
  status: 'Pending' | 'Approved' | 'Rejected' | 'Saved';
  researchField: string;
}

export const universities = [
  'UNSW',
  'USYD',
  'UTS',
  'Macquarie University',
  'QUT',
  'University of Melbourne',
  'Monash',
  'UQ',
  'ANU',
];

export const researchFields = [
  'AI',
  'OCR',
  'LegalTech',
  'Green Energy',
  'Battery',
  'Construction Tech',
  'Cybersecurity',
  'Business Analytics',
];

// Mock professor candidates
const professorCandidates: Candidate[] = [
  {
    id: 'prof-1',
    type: 'Professor',
    title: 'Dr. James Wilson - AI Research',
    university: 'UNSW',
    sourceUrl: 'https://www.unsw.edu.au/staff/james-wilson',
    summary: 'Specializes in machine learning and ethical AI. Leading multiple research projects in AI ethics.',
    confidenceScore: 92,
    status: 'Pending',
    researchField: 'AI',
  },
  {
    id: 'prof-2',
    type: 'Professor',
    title: 'Prof. Sarah Chen - Green Energy',
    university: 'University of Melbourne',
    sourceUrl: 'https://www.unimelb.edu.au/staff/sarah-chen',
    summary: 'Expert in renewable energy systems and battery technology. Published 50+ papers.',
    confidenceScore: 88,
    status: 'Pending',
    researchField: 'Green Energy',
  },
  {
    id: 'prof-3',
    type: 'Professor',
    title: 'Dr. Michael Brown - LegalTech',
    university: 'UTS',
    sourceUrl: 'https://www.uts.edu.au/staff/michael-brown',
    summary: 'Focuses on AI applications in legal technology and contract analysis.',
    confidenceScore: 85,
    status: 'Pending',
    researchField: 'LegalTech',
  },
  {
    id: 'prof-4',
    type: 'Professor',
    title: 'Prof. Lisa Anderson - Cybersecurity',
    university: 'ANU',
    sourceUrl: 'https://www.anu.edu.au/staff/lisa-anderson',
    summary: 'Leading research in AI-driven cybersecurity and threat detection.',
    confidenceScore: 87,
    status: 'Pending',
    researchField: 'Cybersecurity',
  },
  {
    id: 'prof-5',
    type: 'Professor',
    title: 'Dr. Robert Zhang - Construction Tech',
    university: 'QUT',
    sourceUrl: 'https://www.qut.edu.au/staff/robert-zhang',
    summary: 'Research in smart construction and AI-driven project management.',
    confidenceScore: 83,
    status: 'Pending',
    researchField: 'Construction Tech',
  },
];

// Mock grant candidates
const grantCandidates: Candidate[] = [
  {
    id: 'grant-1',
    type: 'Grant',
    title: 'ARC Discovery Grant - AI Ethics',
    university: 'UNSW',
    sourceUrl: 'https://www.arc.gov.au/grants/discovery',
    summary: 'Funding for research into ethical considerations in AI development. Budget: $500,000.',
    confidenceScore: 94,
    status: 'Pending',
    researchField: 'AI',
  },
  {
    id: 'grant-2',
    type: 'Grant',
    title: 'ARC Linkage Grant - Green Energy',
    university: 'University of Melbourne',
    sourceUrl: 'https://www.arc.gov.au/grants/linkage',
    summary: 'Partnership grant for sustainable energy research. Industry partners included.',
    confidenceScore: 90,
    status: 'Pending',
    researchField: 'Green Energy',
  },
  {
    id: 'grant-3',
    type: 'Grant',
    title: 'NHMRC Project Grant - Health AI',
    university: 'USYD',
    sourceUrl: 'https://www.nhmrc.gov.au/grants/find-grant',
    summary: 'Medical research grant for AI applications in healthcare.',
    confidenceScore: 89,
    status: 'Pending',
    researchField: 'AI',
  },
  {
    id: 'grant-4',
    type: 'Grant',
    title: 'Cooperative Research Centres Grant',
    university: 'UQ',
    sourceUrl: 'https://www.arc.gov.au/grants/arc-centres',
    summary: 'Multi-institutional research center for AI and digital innovation.',
    confidenceScore: 86,
    status: 'Pending',
    researchField: 'AI',
  },
];

// Mock scholarship candidates
const scholarshipCandidates: Candidate[] = [
  {
    id: 'scholar-1',
    type: 'Scholarship',
    title: 'Australia Awards Scholarship - Research',
    university: 'Multiple',
    sourceUrl: 'https://www.australiaawards.gov.au',
    summary: 'Full-time research degree scholarship for international students. Highly competitive.',
    confidenceScore: 91,
    status: 'Pending',
    researchField: 'AI',
  },
  {
    id: 'scholar-2',
    type: 'Scholarship',
    title: 'UNSW Research Training Program Scholarship',
    university: 'UNSW',
    sourceUrl: 'https://www.unsw.edu.au/research-training',
    summary: 'Full scholarship covering tuition and living stipend for research degree students.',
    confidenceScore: 88,
    status: 'Pending',
    researchField: 'Green Energy',
  },
  {
    id: 'scholar-3',
    type: 'Scholarship',
    title: 'Vice-Chancellor International Scholarship',
    university: 'University of Melbourne',
    sourceUrl: 'https://www.unimelb.edu.au/scholarships/vci',
    summary: 'Merit-based scholarship for international PhD students with research focus.',
    confidenceScore: 85,
    status: 'Pending',
    researchField: 'LegalTech',
  },
  {
    id: 'scholar-4',
    type: 'Scholarship',
    title: 'APA - Australian Postgraduate Award',
    university: 'Multiple',
    sourceUrl: 'https://www.ipa.gov.au/apa',
    summary: 'National postgraduate research scholarship with stipend support.',
    confidenceScore: 87,
    status: 'Pending',
    researchField: 'Cybersecurity',
  },
];

// Mock research topic candidates
const topicCandidates: Candidate[] = [
  {
    id: 'topic-1',
    type: 'Research Topic',
    title: 'AI and Machine Learning in Legal Document Analysis',
    university: 'UNSW',
    sourceUrl: 'https://example.com/research/ai-legaltech',
    summary: 'Emerging research area combining AI, NLP, and legal document processing for LegalTech applications.',
    confidenceScore: 93,
    status: 'Pending',
    researchField: 'LegalTech',
  },
  {
    id: 'topic-2',
    type: 'Research Topic',
    title: 'Advanced Battery Storage Systems',
    university: 'University of Melbourne',
    sourceUrl: 'https://example.com/research/battery-storage',
    summary: 'Research into next-generation battery storage for renewable energy integration.',
    confidenceScore: 90,
    status: 'Pending',
    researchField: 'Battery',
  },
  {
    id: 'topic-3',
    type: 'Research Topic',
    title: 'Smart Construction Management with AI',
    university: 'QUT',
    sourceUrl: 'https://example.com/research/smart-construction',
    summary: 'Integration of AI and IoT in construction project management and safety.',
    confidenceScore: 87,
    status: 'Pending',
    researchField: 'Construction Tech',
  },
  {
    id: 'topic-4',
    type: 'Research Topic',
    title: 'AI-Driven Cybersecurity Threat Detection',
    university: 'ANU',
    sourceUrl: 'https://example.com/research/ai-cybersecurity',
    summary: 'Machine learning approaches to real-time cybersecurity threat detection and response.',
    confidenceScore: 89,
    status: 'Pending',
    researchField: 'Cybersecurity',
  },
];

export function generateMockCandidates(
  university: string,
  researchField: string,
  sourceType: string,
  resultsPerRun: number
): Candidate[] {
  let candidates: Candidate[] = [];

  // Select candidates based on source type
  switch (sourceType) {
    case 'Professors':
      candidates = [...professorCandidates];
      break;
    case 'Grants':
      candidates = [...grantCandidates];
      break;
    case 'Scholarships':
      candidates = [...scholarshipCandidates];
      break;
    case 'Research Topics':
      candidates = [...topicCandidates];
      break;
    default:
      candidates = [
        ...professorCandidates,
        ...grantCandidates,
        ...scholarshipCandidates,
        ...topicCandidates,
      ];
  }

  // Filter by university if specified
  if (university && university !== 'All') {
    candidates = candidates.filter(c => c.university === university || c.university === 'Multiple');
  }

  // Filter by research field if specified
  if (researchField && researchField !== 'All') {
    candidates = candidates.filter(c => c.researchField === researchField);
  }

  // Return only the requested number of results
  return candidates.slice(0, resultsPerRun);
}

export const sourceTypes = ['Professors', 'Grants', 'Scholarships', 'Research Topics'];
export const resultsPerRunOptions = [5, 10, 20];
