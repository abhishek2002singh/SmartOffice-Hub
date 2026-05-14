require('dotenv').config();
const mongoose = require('mongoose');
const HRConfig = require('../models/HRConfig');

const SKILL_MATRICES = {
  GD: [
    { name: 'Photoshop',          category: 'Design Tools' },
    { name: 'Premiere Pro',        category: 'Video Tools' },
    { name: 'After Effects',       category: 'Video Tools' },
    { name: 'CorelDraw',           category: 'Design Tools' },
    { name: 'Illustration',        category: 'Design Tools' },
    { name: 'CapCut',              category: 'Video Tools' },
    { name: 'Final Cut Pro',       category: 'Video Tools' },
    { name: 'Canva',               category: 'Design Tools' },
    { name: '2D Animation',        category: 'Animation' },
    { name: '3D Animation',        category: 'Animation' },
    { name: 'AI Image Generation', category: 'AI Tools' },
    { name: 'AI Video Generation', category: 'AI Tools' },
  ],
  DM: [
    { name: 'Facebook',            category: 'Social Media' },
    { name: 'Instagram',           category: 'Social Media' },
    { name: 'X (Twitter)',         category: 'Social Media' },
    { name: 'LinkedIn',            category: 'Social Media' },
    { name: 'YouTube',             category: 'Social Media' },
    { name: 'Threads',             category: 'Social Media' },
    { name: 'SEO On-Page',         category: 'SEO' },
    { name: 'SEO Off-Page',        category: 'SEO' },
    { name: 'Technical SEO',       category: 'SEO' },
    { name: 'Meta Ads',            category: 'Paid Ads' },
    { name: 'Google Ads',          category: 'Paid Ads' },
    { name: 'LinkedIn Ads',        category: 'Paid Ads' },
    { name: 'GMB',                 category: 'Local SEO' },
    { name: 'Content Writing',     category: 'Content' },
    { name: 'AI Tools',            category: 'AI Tools' },
    { name: 'Google Analytics',    category: 'Analytics' },
    { name: 'Influencer Marketing',category: 'Marketing' },
    { name: 'Amazon',              category: 'E-commerce' },
    { name: 'Flipkart',            category: 'E-commerce' },
    { name: 'Meesho',              category: 'E-commerce' },
    { name: 'Myntra',              category: 'E-commerce' },
  ],
  Development: [
    { name: 'HTML',                category: 'Frontend' },
    { name: 'CSS',                 category: 'Frontend' },
    { name: 'JavaScript',          category: 'Frontend' },
    { name: 'React',               category: 'Frontend' },
    { name: 'WordPress',           category: 'Frontend' },
    { name: 'jQuery',              category: 'Frontend' },
    { name: 'Bootstrap',           category: 'Frontend' },
    { name: 'React Native',        category: 'Frontend' },
    { name: 'Tailwind CSS',        category: 'Frontend' },
    { name: 'Flutter',             category: 'Frontend' },
    { name: 'Three.js',            category: 'Frontend' },
    { name: 'Next.js',             category: 'Frontend' },
    { name: 'Node.js',             category: 'Backend' },
    { name: 'Express',             category: 'Backend' },
    { name: 'PHP',                 category: 'Backend' },
    { name: 'Python',              category: 'Backend' },
    { name: 'MySQL',               category: 'Backend' },
    { name: 'MongoDB',             category: 'Backend' },
    { name: 'SQL',                 category: 'Backend' },
    { name: 'Shopify',             category: 'E-commerce' },
    { name: 'WooCommerce',         category: 'E-commerce' },
    { name: 'VS Code',             category: 'Tools' },
    { name: 'GitHub',              category: 'Tools' },
    { name: 'Postman',             category: 'Tools' },
    { name: 'AWS',                 category: 'Tools' },
    { name: 'Docker',              category: 'Tools' },
    { name: 'Kubernetes',          category: 'Tools' },
    { name: 'AI Tools',            category: 'AI' },
  ],
  Sales: [
    { name: 'Communication',       category: 'Soft Skills' },
    { name: 'Lead Generation',     category: 'Sales Skills' },
    { name: 'Client Conversion',   category: 'Sales Skills' },
    { name: 'Computer Skills',     category: 'Technical' },
    { name: 'Negotiation',         category: 'Sales Skills' },
    { name: 'Convincing',          category: 'Sales Skills' },
    { name: 'Problem Solving',     category: 'Soft Skills' },
  ],
  HR: [
    { name: 'Recruitment',         category: 'Core HR' },
    { name: 'JD Writing',          category: 'Core HR' },
    { name: 'Interviewing',        category: 'Core HR' },
    { name: 'HR Documentation',    category: 'Core HR' },
    { name: 'Communication',       category: 'Soft Skills' },
    { name: 'Policy Creation',     category: 'Core HR' },
    { name: 'Resume Screening',    category: 'Core HR' },
    { name: 'Decision Making',     category: 'Soft Skills' },
    { name: 'Attendance Management', category: 'Core HR' },
  ],
  Admin: [
    { name: 'Office Management',   category: 'Admin' },
    { name: 'Communication',       category: 'Soft Skills' },
    { name: 'MS Office',           category: 'Technical' },
    { name: 'Documentation',       category: 'Admin' },
    { name: 'Coordination',        category: 'Admin' },
  ],
};

async function seedHRConfig() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ams_dev');
    console.log('Connected to MongoDB');

    let cfg = await HRConfig.findOne({ _singleton: 'hr_config' });
    if (!cfg) {
      cfg = new HRConfig({});
      console.log('Creating new HRConfig singleton...');
    } else {
      console.log('Updating existing HRConfig...');
    }

    // Set skill matrices (Map type)
    const matrixMap = new Map();
    Object.entries(SKILL_MATRICES).forEach(([profile, skills]) => {
      matrixMap.set(profile, skills);
    });
    cfg.skillMatrices = matrixMap;

    await cfg.save();
    console.log('HRConfig seeded successfully with', Object.keys(SKILL_MATRICES).length, 'skill profiles:');
    Object.entries(SKILL_MATRICES).forEach(([p, skills]) => console.log(`  ${p}: ${skills.length} skills`));

    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seedHRConfig();
