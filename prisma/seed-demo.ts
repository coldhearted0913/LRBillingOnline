import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo database...');

  // Hash password for demo users (password: demo123)
  const hashedPassword = await bcrypt.hash('demo123', 10);

  // Create demo users
  const demoAdmin = await prisma.user.upsert({
    where: { email: 'demo@test.com' },
    update: {},
    create: {
      email: 'demo@test.com',
      password: hashedPassword,
      name: 'Demo Admin',
      role: 'Admin',
      phone: '+919876543210',
      isActive: true,
    },
  });

  const demoManager = await prisma.user.upsert({
    where: { email: 'manager@test.com' },
    update: {},
    create: {
      email: 'manager@test.com',
      password: hashedPassword,
      name: 'Demo Manager',
      role: 'MANAGER',
      phone: '+919876543211',
      isActive: true,
    },
  });

  const demoWorker = await prisma.user.upsert({
    where: { email: 'worker@test.com' },
    update: {},
    create: {
      email: 'worker@test.com',
      password: hashedPassword,
      name: 'Demo Worker',
      role: 'Employee',
      phone: '+919876543212',
      isActive: true,
    },
  });

  console.log('✅ Created demo users');

  // Create sample LR records
  const sampleLRs = [
    {
      lrNo: 'LR-2024-001',
      lrDate: '2024-01-15',
      vehicleType: 'TRUCK',
      vehicleNumber: 'MH-12-AB-1234',
      fromLocation: 'Mumbai',
      toLocation: 'Pune',
      consignor: 'ABC Company',
      consignee: 'XYZ Corporation',
      status: 'LR Done',
      descriptionOfGoods: 'Electronics Goods',
      quantity: '100 boxes',
      amount: 50000,
    },
    {
      lrNo: 'LR-2024-002',
      lrDate: '2024-01-16',
      vehicleType: 'PICKUP',
      vehicleNumber: 'MH-13-CD-5678',
      fromLocation: 'Kolhapur',
      toLocation: 'Solapur',
      consignor: 'Test Supplier',
      consignee: 'Test Receiver',
      status: 'LR Collected',
      descriptionOfGoods: 'Rework Material',
      quantity: '50 boxes',
      amount: 25000,
    },
    {
      lrNo: 'LR-2024-003',
      lrDate: '2024-01-17',
      vehicleType: 'TOROUS',
      vehicleNumber: 'MH-14-EF-9012',
      fromLocation: 'Mumbai',
      toLocation: 'Delhi',
      consignor: 'Global Logistics',
      consignee: 'Regional Distribution',
      status: 'Bill Done',
      descriptionOfGoods: 'Textile Materials',
      quantity: '200 pieces',
      amount: 75000,
    },
    {
      lrNo: 'LR-2024-004',
      lrDate: '2024-01-18',
      vehicleType: 'TRUCK',
      vehicleNumber: 'MH-15-GH-3456',
      fromLocation: 'Pune',
      toLocation: 'Mumbai',
      consignor: 'Shree Enterprises',
      consignee: 'Prime Distributors',
      status: 'LR Done',
      descriptionOfGoods: 'Machinery Parts',
      quantity: '75 boxes',
      amount: 45000,
    },
    {
      lrNo: 'LR-2024-005',
      lrDate: '2024-01-19',
      vehicleType: 'PICKUP',
      vehicleNumber: 'MH-16-IJ-7890',
      fromLocation: 'Mumbai',
      toLocation: 'Nagpur',
      consignor: 'Demo Company',
      consignee: 'Sample Industries',
      status: 'LR Collected',
      descriptionOfGoods: 'Raw Materials',
      quantity: '30 boxes',
      amount: 30000,
    },
  ];

  for (const lr of sampleLRs) {
    await prisma.lR.upsert({
      where: { lrNo: lr.lrNo },
      update: {},
      create: lr,
    });
  }

  console.log('✅ Created sample LR records');

  console.log('\n🎉 Demo database seeded successfully!');
  console.log('\n📋 Demo Credentials:');
  console.log('Admin: demo@test.com / demo123');
  console.log('Manager: manager@test.com / demo123');
  console.log('Employee: worker@test.com / demo123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
