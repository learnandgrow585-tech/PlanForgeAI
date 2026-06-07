import { PrismaClient, PlannerCategory } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // ── Super admin ────────────────────────────────────────────
  const email = process.env.SUPER_ADMIN_EMAIL ?? 'admin@planforge.ai';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await argon2.hash(password);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      subscriptionTier: 'ENTERPRISE',
    },
  });
  console.log(`✓ super admin: ${email}`);

  // ── 3 core planners ────────────────────────────────────────
  const planners = [
    {
      slug: 'wealth',
      name: 'Wealth Planner',
      category: PlannerCategory.WEALTH,
      description:
        'Build a personalised wealth-growth strategy across savings, investments and debt.',
      icon: 'TrendingUp',
      order: 1,
      inputSchema: {
        preferredModelTier: 'pro',
        inputFields: [
          { name: 'monthlyIncome', label: 'Monthly income', type: 'number', required: true },
          { name: 'monthlySavings', label: 'Current monthly savings', type: 'number', required: true },
          { name: 'investments', label: 'Current investments value', type: 'number' },
          { name: 'monthlyExpenses', label: 'Monthly expenses', type: 'number', required: true },
          { name: 'debt', label: 'Outstanding debt', type: 'number' },
          { name: 'goal', label: 'Primary financial goal', type: 'textarea', required: true },
          { name: 'risk', label: 'Risk tolerance', type: 'range', min: 1, max: 10, step: 1 },
          { name: 'horizonYears', label: 'Time horizon (years)', type: 'number', required: true },
        ],
        knowledgeHubConfig: { enabled: true, keywords: ['personal finance', 'investing'] },
      },
      systemPromptTemplate:
        'You are an expert financial planner. Using the user inputs, produce a complete 12-section wealth plan as strict JSON matching the PlanJSON schema. Be concrete with numbers, projections and a risk-appropriate asset allocation.',
    },
    {
      slug: 'goal',
      name: 'Goal Achievement Planner',
      category: PlannerCategory.GOAL,
      description: 'Turn any goal into a daily checklist, weekly milestones and a risk matrix.',
      icon: 'Target',
      order: 2,
      inputSchema: {
        preferredModelTier: 'flash',
        inputFields: [
          { name: 'goal', label: 'What is your goal?', type: 'textarea', required: true },
          { name: 'budget', label: 'Budget available', type: 'number' },
          { name: 'targetDate', label: 'Target date', type: 'date', required: true },
          { name: 'weeklyHours', label: 'Hours per week', type: 'number', required: true },
          { name: 'experience', label: 'Experience level', type: 'range', min: 1, max: 10, step: 1 },
          { name: 'constraints', label: 'Constraints', type: 'textarea' },
        ],
        knowledgeHubConfig: { enabled: true, keywords: [] },
      },
      systemPromptTemplate:
        'You are a world-class coach. Convert the user goal into a complete 12-section achievement plan as strict JSON matching the PlanJSON schema, with a daily checklist and weekly milestones.',
    },
    {
      slug: 'career',
      name: 'Career Planner',
      category: PlannerCategory.CAREER,
      description: 'Map the path from your current role to your target role with a skill-gap analysis.',
      icon: 'Briefcase',
      order: 3,
      inputSchema: {
        preferredModelTier: 'pro',
        inputFields: [
          { name: 'currentRole', label: 'Current role', type: 'text', required: true },
          { name: 'targetRole', label: 'Target role', type: 'text', required: true },
          { name: 'experienceYears', label: 'Years of experience', type: 'number', required: true },
          { name: 'techStack', label: 'Current skills / tech stack', type: 'textarea' },
          { name: 'currentSalary', label: 'Current salary', type: 'number' },
          { name: 'targetSalary', label: 'Target salary', type: 'number' },
          { name: 'industry', label: 'Industry', type: 'text' },
        ],
        knowledgeHubConfig: { enabled: true, keywords: ['career growth', 'certifications'] },
      },
      systemPromptTemplate:
        'You are a senior career strategist. Produce a complete 12-section career plan as strict JSON matching the PlanJSON schema, including a skill-gap analysis, certification roadmap and salary projection.',
    },
    {
      slug: 'fitness',
      name: 'Fitness Planner',
      category: PlannerCategory.FITNESS,
      description: 'A 12-week workout and nutrition plan tailored to your goals and equipment.',
      icon: 'Dumbbell',
      order: 4,
      inputSchema: {
        preferredModelTier: 'flash',
        inputFields: [
          { name: 'goal', label: 'Primary fitness goal', type: 'select', required: true, options: [
            { label: 'Lose weight', value: 'lose_weight' },
            { label: 'Build muscle', value: 'build_muscle' },
            { label: 'Improve endurance', value: 'endurance' },
            { label: 'General health', value: 'general' },
          ] },
          { name: 'fitnessLevel', label: 'Current fitness level', type: 'range', min: 1, max: 10, step: 1 },
          { name: 'weeklyHours', label: 'Hours available per week', type: 'number', required: true },
          { name: 'equipment', label: 'Available equipment', type: 'text', placeholder: 'e.g. dumbbells, gym, none' },
          { name: 'injuries', label: 'Injuries or limitations', type: 'textarea' },
        ],
        knowledgeHubConfig: { enabled: true, keywords: ['workout', 'nutrition'] },
      },
      systemPromptTemplate:
        'You are a certified personal trainer and nutritionist. Produce a complete 12-section fitness plan as strict JSON matching the PlanJSON schema, with a progressive 12-week workout split and nutrition guidance.',
    },
    {
      slug: 'startup',
      name: 'Startup Planner',
      category: PlannerCategory.STARTUP,
      description: 'Validate your idea, define an MVP, and build a go-to-market roadmap.',
      icon: 'Rocket',
      order: 5,
      inputSchema: {
        preferredModelTier: 'pro',
        inputFields: [
          { name: 'goal', label: 'Startup idea', type: 'textarea', required: true },
          { name: 'market', label: 'Target market', type: 'text', required: true },
          { name: 'budget', label: 'Available budget', type: 'number' },
          { name: 'teamSize', label: 'Team size', type: 'number' },
          { name: 'stage', label: 'Current stage', type: 'select', options: [
            { label: 'Idea', value: 'idea' },
            { label: 'Prototype', value: 'prototype' },
            { label: 'MVP', value: 'mvp' },
            { label: 'Revenue', value: 'revenue' },
          ] },
          { name: 'timeline', label: 'Launch timeline', type: 'text', placeholder: 'e.g. 6 months' },
        ],
        knowledgeHubConfig: { enabled: true, keywords: ['startup', 'product market fit', 'fundraising'] },
      },
      systemPromptTemplate:
        'You are a startup advisor and former founder. Produce a complete 12-section startup plan as strict JSON matching the PlanJSON schema, with idea validation, MVP scope and a go-to-market roadmap.',
    },
    {
      slug: 'retirement',
      name: 'Retirement Planner',
      category: PlannerCategory.RETIREMENT,
      description: 'Project your retirement corpus and design a savings & investment glide path.',
      icon: 'Palmtree',
      order: 6,
      inputSchema: {
        preferredModelTier: 'pro',
        inputFields: [
          { name: 'currentAge', label: 'Current age', type: 'number', required: true },
          { name: 'retirementAge', label: 'Target retirement age', type: 'number', required: true },
          { name: 'currentSavings', label: 'Current retirement savings', type: 'number' },
          { name: 'monthlyContribution', label: 'Monthly contribution', type: 'number', required: true },
          { name: 'desiredIncome', label: 'Desired annual income in retirement', type: 'number', required: true },
          { name: 'goal', label: 'Notes / lifestyle goals', type: 'textarea' },
        ],
        knowledgeHubConfig: { enabled: true, keywords: ['retirement', 'index funds', 'pension'] },
      },
      systemPromptTemplate:
        'You are a retirement planning expert. Produce a complete 12-section retirement plan as strict JSON matching the PlanJSON schema, with corpus projection and an age-appropriate investment glide path.',
    },
    {
      slug: 'education',
      name: 'Education Planner',
      category: PlannerCategory.EDUCATION,
      description: 'A structured learning roadmap to master any subject or skill.',
      icon: 'GraduationCap',
      order: 7,
      inputSchema: {
        preferredModelTier: 'flash',
        inputFields: [
          { name: 'goal', label: 'What do you want to learn?', type: 'textarea', required: true },
          { name: 'currentLevel', label: 'Current level', type: 'range', min: 1, max: 10, step: 1 },
          { name: 'targetDate', label: 'Target completion date', type: 'date' },
          { name: 'weeklyHours', label: 'Study hours per week', type: 'number', required: true },
          { name: 'budget', label: 'Budget for courses/materials', type: 'number' },
        ],
        knowledgeHubConfig: { enabled: true, keywords: ['online course', 'tutorial'] },
      },
      systemPromptTemplate:
        'You are an expert curriculum designer. Produce a complete 12-section learning plan as strict JSON matching the PlanJSON schema, with a sequenced syllabus, practice projects and checkpoints.',
    },
    {
      slug: 'vehicle',
      name: 'Vehicle Buying Planner',
      category: PlannerCategory.VEHICLE,
      description: 'Plan a smart vehicle purchase: budget, financing, and total cost of ownership.',
      icon: 'Car',
      order: 8,
      inputSchema: {
        preferredModelTier: 'flash',
        inputFields: [
          { name: 'goal', label: 'What vehicle are you considering?', type: 'text', required: true },
          { name: 'budget', label: 'Total budget', type: 'number', required: true },
          { name: 'downPayment', label: 'Down payment available', type: 'number' },
          { name: 'monthlyBudget', label: 'Comfortable monthly payment', type: 'number' },
          { name: 'usage', label: 'Primary usage', type: 'text', placeholder: 'e.g. daily commute, family trips' },
          { name: 'timeline', label: 'When do you want to buy?', type: 'text' },
        ],
        knowledgeHubConfig: { enabled: true, keywords: ['car buying', 'auto loan'] },
      },
      systemPromptTemplate:
        'You are a vehicle purchase advisor. Produce a complete 12-section buying plan as strict JSON matching the PlanJSON schema, with budgeting, financing options and total-cost-of-ownership analysis.',
    },
    {
      slug: 'house-construction',
      name: 'House Construction Planner',
      category: PlannerCategory.HOUSE_CONSTRUCTION,
      description: 'Plan your home construction: phases, budget, materials and timeline.',
      icon: 'Home',
      order: 9,
      inputSchema: {
        preferredModelTier: 'pro',
        inputFields: [
          { name: 'goal', label: 'Describe the house you want to build', type: 'textarea', required: true },
          { name: 'plotSize', label: 'Plot size (sq ft)', type: 'number' },
          { name: 'builtUpArea', label: 'Planned built-up area (sq ft)', type: 'number', required: true },
          { name: 'budget', label: 'Total budget', type: 'number', required: true },
          { name: 'floors', label: 'Number of floors', type: 'number' },
          { name: 'timeline', label: 'Target completion timeline', type: 'text' },
        ],
        knowledgeHubConfig: { enabled: true, keywords: ['home construction', 'building cost'] },
      },
      systemPromptTemplate:
        'You are a construction project manager. Produce a complete 12-section home construction plan as strict JSON matching the PlanJSON schema, with phase-by-phase budget, materials and a realistic timeline.',
    },
  ];

  for (const p of planners) {
    await prisma.planner.upsert({
      where: { slug: p.slug },
      update: { ...p },
      create: { ...p },
    });
    console.log(`✓ planner: ${p.slug}`);
  }

  // ── Sample published blog posts (SEO landing content) ──────
  const posts = [
    {
      slug: 'how-to-build-wealth-in-your-30s',
      title: 'How to Build Wealth in Your 30s: A Practical Roadmap',
      excerpt: 'Your 30s are the highest-leverage decade for building wealth. Here is a concrete, step-by-step plan.',
      category: 'wealth',
      tags: ['wealth', 'investing', 'savings'],
      seoTitle: 'How to Build Wealth in Your 30s | PlanForge AI',
      seoDescription: 'A practical, step-by-step roadmap to build lasting wealth in your 30s — budgeting, investing and compounding.',
      content:
        '<h2>Why your 30s matter most</h2><p>The decade between 30 and 40 is where consistent saving and investing compounds into real wealth. Small, repeatable habits beat one-off windfalls.</p><h2>The 5-step roadmap</h2><ol><li><strong>Automate your savings</strong> — pay yourself first, ideally 20%+ of income.</li><li><strong>Kill high-interest debt</strong> before chasing returns.</li><li><strong>Build a 6-month emergency fund</strong> so you never sell investments in a crisis.</li><li><strong>Invest in low-cost index funds</strong> and let compounding work.</li><li><strong>Increase income</strong> — skills and side income accelerate everything.</li></ol><p>Want a personalised version of this plan? Generate a free wealth plan with PlanForge AI.</p>',
    },
    {
      slug: 'switch-careers-into-tech',
      title: 'How to Switch Careers Into Tech (Without a CS Degree)',
      excerpt: 'A realistic plan to move into a tech role, even if you are starting from scratch.',
      category: 'career',
      tags: ['career', 'tech', 'learning'],
      seoTitle: 'How to Switch Careers Into Tech | PlanForge AI',
      seoDescription: 'A realistic, milestone-based plan to break into tech without a computer science degree.',
      content:
        '<h2>You do not need permission to start</h2><p>Thousands switch into tech every year from unrelated fields. What separates those who make it is a structured plan and consistent execution.</p><h2>The path</h2><ol><li><strong>Pick one track</strong> (web dev, data, QA, cloud) — depth beats breadth.</li><li><strong>Build 3 portfolio projects</strong> that solve real problems.</li><li><strong>Learn in public</strong> and network with practitioners.</li><li><strong>Apply with a focused resume</strong> tailored to the role.</li></ol><p>Generate a personalised career plan with a skill-gap analysis on PlanForge AI.</p>',
    },
  ];

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: { ...post, status: 'PUBLISHED', publishedAt: new Date() },
    });
    console.log(`✓ blog post: ${post.slug}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
