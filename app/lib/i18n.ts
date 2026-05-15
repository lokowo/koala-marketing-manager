export type Language = 'en' | 'zh';

export const LANGUAGE_KEY = 'koala_language';

export type Translations = {
  common: {
    languageLabel: string;
    english: string;
    chinese: string;
    backToDashboard: string;
    noCandidates: string;
    clickRunDiscovery: string;
    copy: string;
    copied: string;
    cancel: string;
    saveRecord: string;
    addNew: string;
    viewSource: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    description: string;
    koalaSubtitle: string;
    lucentSubtitle: string;
    teddySubtitle: string;
    latestProfessorCards: string;
    latestGrantCards: string;
  };
  layout: {
    sidebarTitle: string;
    sidebarSubtitle: string;
    nav: {
      dashboard: string;
      professors: string;
      grants: string;
      topics: string;
      publishing: string;
    };
    backToBusiness: string;
  };
  header: {
    titles: Record<string, string>;
  };
  professors: {
    pageTitle: string;
    addButton: string;
    addHeading: string;
    placeholders: {
      name: string;
      university: string;
      faculty: string;
      title: string;
      researchAreas: string;
      email: string;
      profileUrl: string;
      googleScholarUrl: string;
      grantStatus: string;
      suitableStudentBackgrounds: string;
      potentialRpTopics: string;
      verificationStatus: string;
      references: string;
    };
    tableHeaders: {
      name: string;
      university: string;
      title: string;
      researchAreas: string;
      grantStatus: string;
      email: string;
      verificationStatus: string;
      actions: string;
    };
    saveButton: string;
    cancelButton: string;
  };
  grants: {
    pageTitle: string;
    addButton: string;
    addHeading: string;
    placeholders: {
      grantName: string;
      fundingBody: string;
      year: string;
      amount: string;
      leadProfessor: string;
      university: string;
      industryPartner: string;
      projectTitle: string;
      projectAbstract: string;
      keywords: string;
      phdRelevance: string;
      industryScholarshipPotential: string;
      referenceUrl: string;
      verificationStatus: string;
    };
    tableHeaders: {
      grantName: string;
      fundingBody: string;
      year: string;
      amount: string;
      leadProfessor: string;
      university: string;
      phdRelevance: string;
      verificationStatus: string;
      actions: string;
    };
    saveButton: string;
    cancelButton: string;
    generateContent: string;
  };
  topics: {
    pageTitle: string;
  };
  publishing: {
    totalViews: string;
    totalDMs: string;
    totalConsultations: string;
    bestPlatform: string;
    pageTitle: string;
    addButton: string;
    addHeading: string;
    fields: {
      platform: string;
      contentTitle: string;
      publishDate: string;
      publishUrl: string;
      views: string;
      likes: string;
      saves: string;
      comments: string;
      dms: string;
      wechatAdds: string;
      consultations: string;
      conversionNotes: string;
    };
    tableHeaders: {
      platform: string;
      contentTitle: string;
      date: string;
      views: string;
      likes: string;
      saves: string;
      comments: string;
      dms: string;
      wechatAdds: string;
      consultations: string;
      conversionNotes: string;
    };
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    common: {
      languageLabel: 'Language',
      english: 'English',
      chinese: '中文',
      backToDashboard: 'Back to Business Selector',
      noCandidates: 'No candidates found matching your criteria.',
      clickRunDiscovery: 'Click "Run Discovery" to find candidates',
      copy: 'Copy',
      copied: 'Copied to clipboard!',
      cancel: 'Cancel',
      saveRecord: 'Save Record',
      addNew: 'Add New',
      viewSource: 'View Source →',
    },
    dashboard: {
      title: 'Business Selector',
      subtitle: 'Select a business to manage.',
      description: '',
      koalaSubtitle: 'Australia Research / PhD / Grant management',
      lucentSubtitle: 'City services & companion content system',
      teddySubtitle: 'Legal assistant content and case system',
      latestProfessorCards: 'Latest Professor Cards',
      latestGrantCards: 'Latest Grant Cards',
    },
    layout: {
      sidebarTitle: 'Koala PhD',
      sidebarSubtitle: 'Marketing Manager',
      nav: {
        dashboard: 'Dashboard',
        professors: 'Professors',
        grants: 'Grants',
        topics: 'Topics',
        publishing: 'Publishing',
      },
      backToBusiness: 'Back to Business Selector',
    },
    header: {
      titles: {
        '/dashboard/koala': 'Koala Dashboard',
        '/dashboard/koala/professors': 'Professor Database',
        '/dashboard/koala/grants': 'Grant Database',
        '/dashboard/koala/topics': 'Research Topic Library',
        '/dashboard/koala/publishing': 'Publishing Tracker',
      },
    },
    professors: {
      pageTitle: 'Professor Database',
      addButton: 'Add Professor',
      addHeading: 'Add New Professor',
      placeholders: {
        name: 'Name',
        university: 'University',
        faculty: 'Faculty / School',
        title: 'Title',
        researchAreas: 'Research Areas (comma separated)',
        email: 'Email',
        profileUrl: 'Profile URL',
        googleScholarUrl: 'Google Scholar URL',
        grantStatus: 'Grant Status',
        suitableStudentBackgrounds: 'Suitable Student Backgrounds (comma separated)',
        potentialRpTopics: 'Potential RP Topics (comma separated)',
        verificationStatus: 'Verification Status',
        references: 'References',
      },
      tableHeaders: {
        name: 'Name',
        university: 'University',
        title: 'Title',
        researchAreas: 'Research Areas',
        grantStatus: 'Grant Status',
        email: 'Email',
        verificationStatus: 'Verification Status',
        actions: 'Actions',
      },
      saveButton: 'Save Professor',
      cancelButton: 'Cancel',
    },
    grants: {
      pageTitle: 'Grant Database',
      addButton: 'Add Grant',
      addHeading: 'Add New Grant',
      placeholders: {
        grantName: 'Grant Name',
        fundingBody: 'Funding Body',
        year: 'Year',
        amount: 'Amount',
        leadProfessor: 'Lead Professor',
        university: 'University',
        industryPartner: 'Industry Partner',
        projectTitle: 'Project Title',
        projectAbstract: 'Project Abstract',
        keywords: 'Keywords (comma separated)',
        phdRelevance: 'PhD Relevance',
        industryScholarshipPotential: 'Industry Scholarship Potential',
        referenceUrl: 'Reference URL',
        verificationStatus: 'Verification Status',
      },
      tableHeaders: {
        grantName: 'Grant Name',
        fundingBody: 'Funding Body',
        year: 'Year',
        amount: 'Amount',
        leadProfessor: 'Lead Professor',
        university: 'University',
        phdRelevance: 'PhD Relevance',
        verificationStatus: 'Verification Status',
        actions: 'Actions',
      },
      saveButton: 'Save Grant',
      cancelButton: 'Cancel',
      generateContent: 'Generate Content',
    },
    topics: {
      pageTitle: 'Research Topic Library',
    },
    publishing: {
      totalViews: 'Total Views',
      totalDMs: 'Total DMs',
      totalConsultations: 'Total Consultations',
      bestPlatform: 'Best Platform',
      pageTitle: 'Publishing Records',
      addButton: 'Add Publishing Record',
      addHeading: 'Add New Publishing Record',
      fields: {
        platform: 'Platform',
        contentTitle: 'Content Title',
        publishDate: 'Publish Date',
        publishUrl: 'Publish URL',
        views: 'Views',
        likes: 'Likes',
        saves: 'Saves',
        comments: 'Comments',
        dms: 'DMs',
        wechatAdds: 'WeChat Adds',
        consultations: 'Consultations',
        conversionNotes: 'Conversion Notes',
      },
      tableHeaders: {
        platform: 'Platform',
        contentTitle: 'Content Title',
        date: 'Date',
        views: 'Views',
        likes: 'Likes',
        saves: 'Saves',
        comments: 'Comments',
        dms: 'DMs',
        wechatAdds: 'WeChat Adds',
        consultations: 'Consultations',
        conversionNotes: 'Conversion Notes',
      },
    },
  },
  zh: {
    common: {
      languageLabel: '语言',
      english: 'English',
      chinese: '中文',
      backToDashboard: '返回业务选择',
      noCandidates: '未找到符合条件的候选人。',
      clickRunDiscovery: '点击“开始发现”以查找候选人',
      copy: '复制',
      copied: '已复制到剪贴板！',
      cancel: '取消',
      saveRecord: '保存记录',
      addNew: '新增',
      viewSource: '查看来源 →',
    },
    dashboard: {
      title: '业务选择',
      subtitle: '选择一个业务进行管理。',
      description: '',
      koalaSubtitle: '澳洲 Research / PhD / Grant 内容管理器',
      lucentSubtitle: '城市服务与情绪陪伴内容系统',
      teddySubtitle: '法律助手内容与案例管理系统',
      latestProfessorCards: '最新教授卡片',
      latestGrantCards: '最新资助卡片',
    },
    layout: {
      sidebarTitle: 'Koala PhD',
      sidebarSubtitle: 'Marketing Manager',
      nav: {
        dashboard: '仪表盘',
        professors: '教授&学者库',
        grants: '资助库',
        topics: '研究专题',
        publishing: '发布追踪',
      },
      backToBusiness: '返回业务选择',
    },
    header: {
      titles: {
        '/dashboard/koala': 'Koala 仪表盘',
        '/dashboard/koala/professors': '教授数据库',
        '/dashboard/koala/grants': '资助数据库',
        '/dashboard/koala/topics': '研究专题库',
        '/dashboard/koala/publishing': '发布追踪',
      },
    },
    professors: {
      pageTitle: '教授数据库',
      addButton: '添加教授',
      addHeading: '新增教授',
      placeholders: {
        name: '姓名',
        university: '大学',
        faculty: '学院 / 学部',
        title: '职称',
        researchAreas: '研究方向（逗号分隔）',
        email: '电子邮件',
        profileUrl: '个人页面链接',
        googleScholarUrl: 'Google Scholar 链接',
        grantStatus: '资助状态',
        suitableStudentBackgrounds: '适合学生背景（逗号分隔）',
        potentialRpTopics: '潜在研究课题（逗号分隔）',
        verificationStatus: '审核状态',
        references: '参考信息',
      },
      tableHeaders: {
        name: '姓名',
        university: '大学',
        title: '职称',
        researchAreas: '研究方向',
        grantStatus: '资助状态',
        email: '电子邮件',
        verificationStatus: '审核状态',
        actions: '操作',
      },
      saveButton: '保存教授',
      cancelButton: '取消',
    },
    grants: {
      pageTitle: '资助数据库',
      addButton: '添加资助',
      addHeading: '新增资助',
      placeholders: {
        grantName: '资助名称',
        fundingBody: '资助机构',
        year: '年份',
        amount: '金额',
        leadProfessor: '负责人教授',
        university: '大学',
        industryPartner: '产业合作方',
        projectTitle: '项目标题',
        projectAbstract: '项目摘要',
        keywords: '关键词（逗号分隔）',
        phdRelevance: 'PhD 相关性',
        industryScholarshipPotential: '产业奖学金潜力',
        referenceUrl: '参考链接',
        verificationStatus: '审核状态',
      },
      tableHeaders: {
        grantName: '资助名称',
        fundingBody: '资助机构',
        year: '年份',
        amount: '金额',
        leadProfessor: '负责人教授',
        university: '大学',
        phdRelevance: 'PhD 相关性',
        verificationStatus: '审核状态',
        actions: '操作',
      },
      saveButton: '保存资助',
      cancelButton: '取消',
      generateContent: '生成内容',
    },
    topics: {
      pageTitle: '研究专题库',
    },
    publishing: {
      totalViews: '总曝光',
      totalDMs: '总私信',
      totalConsultations: '总咨询',
      bestPlatform: '最佳平台',
      pageTitle: '发布记录',
      addButton: '添加发布记录',
      addHeading: '新增发布记录',
      fields: {
        platform: '平台',
        contentTitle: '内容标题',
        publishDate: '发布时间',
        publishUrl: '发布链接',
        views: '曝光',
        likes: '点赞',
        saves: '收藏',
        comments: '评论',
        dms: '私信',
        wechatAdds: '微信新增',
        consultations: '咨询',
        conversionNotes: '转化备注',
      },
      tableHeaders: {
        platform: '平台',
        contentTitle: '内容标题',
        date: '日期',
        views: '曝光',
        likes: '点赞',
        saves: '收藏',
        comments: '评论',
        dms: '私信',
        wechatAdds: '微信新增',
        consultations: '咨询',
        conversionNotes: '转化备注',
      },
    },
  },
};

export const defaultLanguage: Language = 'en';
