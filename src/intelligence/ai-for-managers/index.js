const fs = require('fs');
const path = require('path');

const skills = {
  business: [
    { name: 'Strategic Planner AI', file: 'strategic-planner.skill.js' },
    { name: 'KPI Dashboard', file: 'kpi-dashboard.skill.js' },
    { name: 'Financial Forecasting', file: 'financial-forecasting.skill.js' },
    { name: 'Risk Assessment Engine', file: 'risk-assessment.skill.js' },
    { name: 'Competitive Intelligence', file: 'competitive-intelligence.skill.js' },
    { name: 'Profit Optimizer', file: 'profit-optimizer.skill.js' },
    { name: 'Business Scenario Simulator', file: 'business-scenario-simulator.skill.js' }
  ],
  sales: [
    { name: 'Sales Pipeline Manager', file: 'sales-pipeline-manager.skill.js' },
    { name: 'Lead Scoring AI', file: 'lead-scoring.skill.js' },
    { name: 'Price Optimization AI', file: 'price-optimization.skill.js' },
    { name: 'Customer Churn Predictor', file: 'customer-churn-predictor.skill.js' },
    { name: 'Upsell/Cross-sell Engine', file: 'upsell-crosssell-engine.skill.js' },
    { name: 'Sales Forecasting AI', file: 'sales-forecasting.skill.js' },
    { name: 'Deal Close Probability', file: 'deal-close-probability.skill.js' },
    { name: 'CRM Automation', file: 'crm-automation.skill.js' }
  ],
  hr: [
    { name: 'Resume Screening AI', file: 'resume-screening.skill.js' },
    { name: 'Candidate Matching', file: 'candidate-matching.skill.js' },
    { name: 'Employee Retention Predictor', file: 'employee-retention-predictor.skill.js' },
    { name: 'Performance Review Auto', file: 'performance-review-auto.skill.js' },
    { name: 'Skills Gap Analyzer', file: 'skills-gap-analyzer.skill.js' },
    { name: 'Attrition Risk Detector', file: 'attrition-risk-detector.skill.js' },
    { name: 'Workforce Planning AI', file: 'workforce-planning.skill.js' }
  ],
  marketing: [
    { name: 'Campaign Optimizer', file: 'campaign-optimizer.skill.js' },
    { name: 'Content Generator AI', file: 'content-generator.skill.js' },
    { name: 'Social Sentiment Analyzer', file: 'social-sentiment-analyzer.skill.js' },
    { name: 'SEO Auto Optimizer', file: 'seo-auto-optimizer.skill.js' },
    { name: 'Audience Persona Builder', file: 'audience-persona-builder.skill.js' },
    { name: 'Ad Spend Optimizer', file: 'ad-spend-optimizer.skill.js' },
    { name: 'Email Campaign Automation', file: 'email-campaign-automation.skill.js' },
    { name: 'Viral Trend Detector', file: 'viral-trend-detector.skill.js' }
  ]
};

const aiForManagersSkills = {
  metadata: {
    version: '1.0.0',
    totalSkills: 30,
    categories: Object.keys(skills).length,
    createdAt: new Date().toISOString(),
    description: '30 AI Skills đẳng cấp cho Quản trị Kinh doanh, Bán hàng, Nhân sự, Marketing'
  },

  skills,

  getSkillsByCategory: (category) => skills[category] || [],

  getAllSkills: () => Object.values(skills).flat(),

  searchSkills: (query) => {
    const allSkills = Object.values(skills).flat();
    return allSkills.filter(s => 
      s.name.toLowerCase().includes(query.toLowerCase())
    );
  },

  getSkillByName: (name) => {
    const allSkills = Object.values(skills).flat();
    return allSkills.find(s => s.name === name);
  }
};

module.exports = aiForManagersSkills;

if (require.main === module) {
  console.log('='.repeat(50));
  console.log('🎯 AI FOR MANAGERS - 30 SKILLS EXPORT');
  console.log('='.repeat(50));
  console.log(`\n📊 Total Skills: ${aiForManagersSkills.metadata.totalSkills}`);
  console.log(`📁 Categories: ${aiForManagersSkills.metadata.categories}\n`);

  Object.entries(skills).forEach(([category, skillList]) => {
    console.log(`\n📂 ${category.toUpperCase()} (${skillList.length} skills):`);
    skillList.forEach(s => console.log(`   • ${s.name}`));
  });

  console.log('\n' + '='.repeat(50));
  console.log('✅ All skills loaded successfully!');
  console.log('='.repeat(50));
}