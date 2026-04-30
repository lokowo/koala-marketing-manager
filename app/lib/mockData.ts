// app/lib/mockData.ts

export interface Professor {
  id: string;
  name: string;
  university: string;
  faculty: string;
  title: string;
  researchAreas: string[];
  email: string;
  profileUrl: string;
  googleScholarUrl: string;
  grantStatus: string;
  suitableStudentBackgrounds: string[];
  potentialRpTopics: string[];
  references: string;
  verificationStatus: string;
}

export interface Grant {
  id: string;
  grantName: string;
  fundingBody: string;
  year: string;
  amount: string;
  leadProfessor: string;
  university: string;
  industryPartner: string;
  projectTitle: string;
  projectAbstract: string;
  keywords: string[];
  phdRelevance: string;
  industryScholarshipPotential: string;
  referenceUrl: string;
  verificationStatus: string;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
}

export interface PublishingItem {
  id: string;
  platform: string;
  contentTitle: string;
  publishDate: string;
  publishUrl: string;
  views: number;
  likes: number;
  saves: number;
  comments: number;
  dms: number;
  wechatAdds: number;
  consultations: number;
  conversionNotes: string;
}

export interface ContentCard {
  id: string;
  title: string;
  status: string; // 'Pending', 'Approved', etc.
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  status: string;
}

export const mockProfessors: Professor[] = [
  {
    id: '1',
    name: 'Dr. Alice Johnson',
    university: 'University of Sydney',
    faculty: 'Faculty of Engineering',
    title: 'Associate Professor',
    researchAreas: ['AI Ethics', 'Machine Learning'],
    email: 'alice.johnson@sydney.edu.au',
    profileUrl: 'https://www.sydney.edu.au/engineering/about/our-people/academic-staff/alice-johnson.html',
    googleScholarUrl: 'https://scholar.google.com/citations?user=alice-johnson',
    grantStatus: 'Active',
    suitableStudentBackgrounds: ['Computer Science', 'Engineering'],
    potentialRpTopics: ['AI in Healthcare', 'Ethical AI Development'],
    references: 'Published 50+ papers in top journals',
    verificationStatus: 'Verified',
  },
  {
    id: '2',
    name: 'Prof. Bob Smith',
    university: 'University of Melbourne',
    faculty: 'School of Computing and Information Systems',
    title: 'Professor',
    researchAreas: ['Green Energy', 'Sustainable Tech'],
    email: 'bob.smith@unimelb.edu.au',
    profileUrl: 'https://www.unimelb.edu.au/school/scis/staff/bob-smith',
    googleScholarUrl: 'https://scholar.google.com/citations?user=bob-smith',
    grantStatus: 'Pending',
    suitableStudentBackgrounds: ['Environmental Science', 'Engineering'],
    potentialRpTopics: ['Renewable Energy Systems', 'Sustainable Computing'],
    references: 'ARC Laureate Fellow, 100+ publications',
    verificationStatus: 'Pending',
  },
  {
    id: '3',
    name: 'Dr. Carol Lee',
    university: 'University of Queensland',
    faculty: 'School of Information Technology and Electrical Engineering',
    title: 'Senior Lecturer',
    researchAreas: ['AI OCR', 'Computer Vision'],
    email: 'carol.lee@uq.edu.au',
    profileUrl: 'https://www.uq.edu.au/itee/staff/carol-lee',
    googleScholarUrl: 'https://scholar.google.com/citations?user=carol-lee',
    grantStatus: 'Active',
    suitableStudentBackgrounds: ['Computer Science', 'Mathematics'],
    potentialRpTopics: ['Document Analysis', 'Visual Recognition'],
    references: 'IEEE Senior Member, 30+ papers',
    verificationStatus: 'Verified',
  },
];

export const mockGrants: Grant[] = [
  {
    id: '1',
    grantName: 'AI Research Grant',
    fundingBody: 'ARC',
    year: '2024',
    amount: '$500,000',
    leadProfessor: 'Dr. Alice Johnson',
    university: 'University of Sydney',
    industryPartner: 'TechCorp',
    projectTitle: 'Ethical AI Development',
    projectAbstract: 'Research into ethical considerations in AI development and deployment.',
    keywords: ['AI', 'Ethics', 'Machine Learning'],
    phdRelevance: 'High',
    industryScholarshipPotential: 'Medium',
    referenceUrl: 'https://www.arc.gov.au/grants/ai-research',
    verificationStatus: 'Verified',
  },
  {
    id: '2',
    grantName: 'Green Energy Initiative',
    fundingBody: 'NHMRC',
    year: '2024',
    amount: '$1,000,000',
    leadProfessor: 'Prof. Bob Smith',
    university: 'University of Melbourne',
    industryPartner: 'GreenTech Solutions',
    projectTitle: 'Sustainable Energy Systems',
    projectAbstract: 'Development of sustainable energy solutions for urban environments.',
    keywords: ['Green Energy', 'Sustainability', 'Renewable'],
    phdRelevance: 'Medium',
    industryScholarshipPotential: 'High',
    referenceUrl: 'https://www.nhmrc.gov.au/grants/green-energy',
    verificationStatus: 'Pending',
  },
  {
    id: '3',
    grantName: 'Smart Construction Fund',
    fundingBody: 'ARC',
    year: '2025',
    amount: '$750,000',
    leadProfessor: 'Dr. Carol Lee',
    university: 'University of Queensland',
    industryPartner: 'BuildSmart Inc.',
    projectTitle: 'AI in Construction',
    projectAbstract: 'Integrating AI technologies in modern construction practices.',
    keywords: ['AI', 'Construction', 'Smart Tech'],
    phdRelevance: 'High',
    industryScholarshipPotential: 'High',
    referenceUrl: 'https://www.arc.gov.au/grants/smart-construction',
    verificationStatus: 'Verified',
  },
];

export const mockTopics: Topic[] = [
  {
    id: '1',
    name: 'AI + LegalTech',
    description: 'Integration of AI in legal technology.',
  },
  {
    id: '2',
    name: 'AI OCR',
    description: 'Optical Character Recognition using AI.',
  },
  {
    id: '3',
    name: 'Green Energy Storage',
    description: 'Innovations in energy storage for sustainability.',
  },
  {
    id: '4',
    name: 'Smart Construction',
    description: 'AI and tech in construction industry.',
  },
];

export const mockPublishing: PublishingItem[] = [
  {
    id: '1',
    platform: 'Xiaohongshu',
    contentTitle: 'AI Ethics in Research',
    publishDate: '2024-10-01',
    publishUrl: 'https://xiaohongshu.com/post1',
    views: 1500,
    likes: 120,
    saves: 85,
    comments: 45,
    dms: 10,
    wechatAdds: 0,
    consultations: 3,
    conversionNotes: 'Interested in PhD programs',
  },
  {
    id: '2',
    platform: 'WeChat',
    contentTitle: 'Green Energy Research Opportunities',
    publishDate: '2024-10-02',
    publishUrl: 'https://weixin.qq.com/article2',
    views: 2200,
    likes: 180,
    saves: 120,
    comments: 60,
    dms: 25,
    wechatAdds: 15,
    consultations: 8,
    conversionNotes: 'High engagement, 8 consultation requests',
  },
  {
    id: '3',
    platform: 'Website',
    contentTitle: 'Professor Profiles and Research Directions',
    publishDate: '2024-10-03',
    publishUrl: 'https://example.com/article1',
    views: 3200,
    likes: 250,
    saves: 180,
    comments: 90,
    dms: 20,
    wechatAdds: 0,
    consultations: 12,
    conversionNotes: 'Best performing content',
  },
  {
    id: '4',
    platform: 'LinkedIn',
    contentTitle: 'Research Grants in Australia',
    publishDate: '2024-10-04',
    publishUrl: 'https://linkedin.com/feed/post4',
    views: 1800,
    likes: 160,
    saves: 95,
    comments: 55,
    dms: 12,
    wechatAdds: 0,
    consultations: 5,
    conversionNotes: '5 consultation bookings',
  },
];

export const mockContentCards: ContentCard[] = [
  {
    id: '1',
    title: 'AI Ethics in Research',
    status: 'Pending',
    createdAt: '2024-10-01',
  },
  {
    id: '2',
    title: 'Sustainable Energy Solutions',
    status: 'Approved',
    createdAt: '2024-09-28',
  },
  {
    id: '3',
    title: 'Smart Construction Innovations',
    status: 'Pending',
    createdAt: '2024-10-02',
  },
];

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Review Professor Applications',
    dueDate: '2024-10-05',
    status: 'In Progress',
  },
  {
    id: '2',
    title: 'Publish Weekly Content',
    dueDate: '2024-10-07',
    status: 'Pending',
  },
];