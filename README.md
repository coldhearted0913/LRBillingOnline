# 🚛 LR Billing System

A modern, production-ready web application for managing LR (Lorry Receipt) billing with authentication, real-time updates, and automated bill generation.

## ✨ Key Features

### 🔐 Authentication & Security
- **NextAuth.js** - Secure JWT-based authentication
- **Role-Based Access Control (RBAC)** - CEO, MANAGER, and WORKER roles
- **Password Protection** - bcrypt hashing with secure sessions
- **Phone Number Login** - Login with email or phone number
- **Session Management** - Auto-logout on inactivity

### 📊 Dashboard
- **Live Dashboard** - Real-time LR tracking and statistics
- **Stats Cards** - LR count, pending bills, revenue tracking
- **Analytics Dashboard** - CEO-only advanced metrics
- **Responsive Design** - Mobile, tablet, and desktop support
- **Toast Notifications** - Professional user feedback

### 📝 LR Management
- **Create/Edit/Delete** - Full CRUD operations
- **Batch Operations** - Select multiple LRs for bulk actions
- **Status Tracking** - LR Done → LR Collected → Bill Done → Bill Submitted
- **Smart Filtering** - Month, year, status, and search filters
- **Auto-save Remarks** - Add notes to any LR
- **Pagination** - Handle thousands of records smoothly

### 💰 Bill Generation
- **Unified Bill Generation** - Single-click for all bill types
- **Automatic Categorization** - Rework, Additional, and Regular bills
- **Smart Validation** - Pre-generation data checks
- **Estimated Amounts** - Preview bill totals before generation
- **Excel Generation** - Professional formatted invoices
- **ZIP Downloads** - Download all bills at once
- **Cloud Storage** - AWS S3 integration for backups

### 🚀 Performance
- **React Query** - Smart caching and auto-refetch
- **Optimistic Updates** - Instant UI feedback
- **Database Indexing** - Fast queries on large datasets
- **Loading States** - Skeleton loaders and progress indicators
- **Empty States** - Helpful messages when no data

### 👥 User Management
- **User Profiles** - Update name, email, phone, and role
- **Password Changes** - Secure password updates
- **User Management** (CEO only) - Add/delete users and manage roles
- **Activity Tracking** - Audit logs for all actions

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Railway/Neon)
- **ORM**: Prisma
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS
- **State Management**: React Query
- **UI Components**: shadcn/ui
- **Notifications**: react-hot-toast
- **Cloud Storage**: AWS S3

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (Railway or Neon)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd LRBillingOnline
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file:
   ```env
   DATABASE_URL="your-postgresql-url"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   AWS_ACCESS_KEY_ID="your-s3-key"
   AWS_SECRET_ACCESS_KEY="your-s3-secret"
   AWS_REGION="your-region"
   S3_BUCKET_NAME="your-bucket"
   ```

4. **Set up the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 👤 Default Login

After running `npx prisma db push`, you'll need to:
1. Create your first user via the registration endpoint or directly in the database
2. Use email and password to login
3. Users with 'CEO' role can manage other users

## 🎯 Features in Detail

### Dashboard Features
- **Stats Cards**: Total LRs, pending collections, bills ready, estimated revenue
- **Analytics** (CEO only): Revenue trends, completion rates, vehicle breakdown
- **Advanced Filters**: Month, year, status multi-select, search
- **Smart Sorting**: Click column headers to sort by LR No or Date
- **Batch Selection**: Select all, deselect, or choose specific LRs
- **Status Updates**: Change status in-place with dropdown

### Bill Generation
- **Automatic Categorization**:
  - **Rework Bills**: Kolhapur → Solapur routes
  - **Additional Bills**: LRs with 2+ consignees
  - **Regular Bills**: All other LRs
- **Bill Preview**: See estimated amounts before generation
- **Validation**: Check for missing data before generating
- **Excel Templates**: Professional formatted sheets
- **Submission Date**: Automatic folder organization

### User Roles
- **CEO**: Full access, user management, analytics dashboard
- **MANAGER**: Full LR management, no user management
- **WORKER**: Create/edit LRs, view dashboard, no delete

## 📁 Project Structure

```
LRBillingOnline/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/        # Authentication endpoints
│   │   ├── lrs/         # LR CRUD operations
│   │   ├── rework-bills/  # Rework bill generation
│   │   └── additional-bills/  # Additional bill generation
│   ├── page.tsx         # Main dashboard
│   └── layout.tsx       # Root layout
├── components/
│   ├── LRForm.tsx       # LR creation/editing form
│   ├── UserProfileDropdown.tsx  # User menu
│   ├── ProfileSettingsModal.tsx  # Settings and user management
│   └── ui/              # Reusable UI components
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── database.ts      # Database operations
│   └── constants.ts     # App constants
├── prisma/
│   └── schema.prisma    # Database schema
└── invoices/            # Generated bills (local)
```

## 🔒 Security

- **Environment Variables**: All secrets in `.env.local`
- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure session management
- **Route Protection**: Middleware guards all routes
- **Role-Based Access**: API-level permission checks
- **Input Validation**: Zod schemas for all inputs

## 📊 Database Schema

- **User**: Authentication and user management
- **LR**: Main LR records with all details
- **AdditionalBill**: Additional bill entries
- **ReworkBill**: Rework bill entries
- **ArchiveLR**: Deleted LR backups

## 🚀 Deployment

### Railway Deployment
1. Connect your GitHub repository
2. Add environment variables in Railway dashboard
3. Deploy automatically on push

### Environment Variables for Production
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random 32+ character string
- `NEXTAUTH_URL` - Your production URL
- `AWS_ACCESS_KEY_ID` - S3 access key
- `AWS_SECRET_ACCESS_KEY` - S3 secret
- `AWS_REGION` - AWS region
- `S3_BUCKET_NAME` - S3 bucket name

## 🎨 Customization

### Vehicle Amounts
Edit `lib/constants.ts` to change bill amounts for PICKUP, TRUCK, and TOUROUS.

### Status Colors
Modify `STATUS_COLORS` in `lib/constants.ts` for custom status styling.

### Bill Templates
Update Excel templates in the root directory:
- `SAMPLE.xlsx` - Regular bills
- `REWORK BILL Format.xlsx` - Rework bills
- `Additional Bill Format.xlsx` - Additional bills

## 📱 Mobile Support

Fully responsive design with:
- Touch-optimized buttons (44px minimum)
- Mobile-friendly modals and forms
- Responsive table with horizontal scroll
- Optimized font sizes for readability
- Skeleton loaders for better perceived performance

## 🐛 Troubleshooting

### "Database connection failed"
- Check your `DATABASE_URL` in `.env.local`
- Ensure PostgreSQL is running and accessible
- Run `npx prisma db push` to sync schema

### "Session expired"
- Clear browser cookies
- Check `NEXTAUTH_SECRET` is set
- Restart development server

### "Import errors"
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (requires 18+)

## 📝 License

Private use for Mangesh Transport billing management.

## 🙏 Acknowledgments

Built with Next.js, TypeScript, and modern web technologies for a scalable, maintainable solution.

---

**Need help?** Check the code comments or open an issue on GitHub.

