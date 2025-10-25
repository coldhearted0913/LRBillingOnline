# 🚛 LR Billing Web Application

A modern, responsive web application for managing LR (Lorry Receipt) billing - accessible from any device!

## ✨ Features

### 📊 Dashboard
- **Modern UI**: Clean, responsive design that works on desktop, tablet, and mobile
- **LR Table**: View all LRs with sorting and filtering
- **Month/Year Filters**: Quickly find LRs from specific periods
- **Status Indicators**: See which LRs are Complete vs Incomplete
- **Batch Operations**: Select multiple LRs for deletion or bill generation

### ➕ LR Management
- **Create LRs**: Add new LR entries with comprehensive form
- **Edit LRs**: Update existing LRs anytime
- **FROM/TO Fields**: Dropdown selectors for origin and destination
- **Material Supply**: Multi-select for material supply locations
- **Auto-validation**: LR number prefix enforcement
- **Smart Defaults**: Auto-fill Koel Gate Entry, date syncing

### 🎨 Modern UI/UX
- **Responsive Design**: Works perfectly on all screen sizes
- **Tailwind CSS**: Beautiful, consistent styling
- **Interactive Elements**: Smooth transitions and hover effects
- **Form Validation**: Real-time validation with helpful messages
- **Loading States**: Clear feedback for all operations

## ☁️ AWS S3 Cloud Storage

The app supports automatic cloud uploads to AWS S3:

- **Secure**: Files encrypted in transit and at rest
- **Reliable**: 99.999999999% durability
- **Free Tier**: 5 GB free storage for 12 months
- **Global CDN**: Fast downloads worldwide

📖 **[View S3 Setup Guide](AWS_SETUP_GUIDE.md)**

**Quick Setup:**
1. Create AWS account (free)
2. Create S3 bucket
3. Add credentials to Railway
4. Files automatically upload to cloud!

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Navigate to the web app directory:**
   ```bash
   cd lr_billing_web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Access from Any Device

### On Your Computer
```
http://localhost:3000
```

### On Your Phone/Tablet (same network)
1. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

2. On your phone/tablet, open browser and go to:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```
   Example: `http://192.168.1.100:3000`

## 🏗️ Project Structure

```
lr_billing_web/
├── app/
│   ├── api/              # API routes
│   │   └── lrs/         # LR CRUD endpoints
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Dashboard page
│   └── globals.css      # Global styles
├── components/
│   └── LRForm.tsx       # LR form component
├── lib/
│   ├── database.ts      # Database operations
│   └── constants.ts     # App constants
├── data/
│   └── lr_database.json # JSON database (created automatically)
├── public/              # Static files
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── tailwind.config.js   # Tailwind config
└── next.config.js       # Next.js config
```

## 🎯 How to Use

### Creating an LR
1. Click **"Create New LR"** button
2. Fill in the form:
   - **FROM**: Select origin (Solapur/Kolhapur)
   - **TO**: Select destination (SOLAPUR/KOLHAPUR/PUNE/NASHIK)
   - **LR No**: Enter number (prefix auto-added)
   - **LR Date**: Select date
   - **Vehicle Type**: Choose PICKUP/TRUCK/TOROUS
   - **Material Supply**: Click locations to select
   - **Description & Quantity**: Optional goods details
3. Click **"Save LR"**

### Editing an LR
1. Find the LR in the table
2. Click **"Edit"** button in the Actions column
3. Make your changes
4. Click **"Update LR"**

### Filtering LRs
1. Use the **Month** dropdown to select specific month
2. Use the **Year** dropdown to select year
3. Click **"Refresh"** to reload data

### Batch Operations
1. Check the boxes next to LRs you want to select
2. Use **"Select All"** to select all visible LRs
3. Click **"Delete Selected"** to remove multiple LRs
4. Click **"Generate Bills"** for batch bill generation

## 🔧 Configuration

### Database
- Location: `data/lr_database.json`
- Auto-created on first run
- **Backup regularly!**

### Constants (lib/constants.ts)
- Vehicle amounts
- Material locations
- FROM/TO locations
- LR prefix

## 📊 API Endpoints

### GET /api/lrs
Get all LRs or filter by month/year
```
Query params:
- year: number
- month: number
```

### POST /api/lrs
Create new LR
```json
{
  "LR No": "MT/25-26/001",
  "LR Date": "22-10-2025",
  "Vehicle Type": "TRUCK",
  ...
}
```

### GET /api/lrs/[lrNo]
Get specific LR

### PUT /api/lrs/[lrNo]
Update LR

### DELETE /api/lrs/[lrNo]
Delete LR

### DELETE /api/lrs
Delete multiple LRs
```json
{
  "lrNumbers": ["MT/25-26/001", "MT/25-26/002"]
}
```

## 🎨 Customization

### Colors (tailwind.config.js)
```javascript
colors: {
  primary: '#3498db',    // Blue
  success: '#27ae60',    // Green
  warning: '#f39c12',    // Orange
  danger: '#e74c3c',     // Red
}
```

### Fonts (app/layout.tsx)
Change the `Inter` font to any Google Font

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🚀 Deployment

### ⚡ NEW: AWS Deployment Ready!

**Your app is now configured for AWS deployment with PostgreSQL!**

🎯 **Quick Start:** See `START_HERE.md` for 30-minute deployment guide

📚 **Documentation:**
- `START_HERE.md` - Overview and orientation
- `QUICK_START_AWS.md` - Fast 30-minute AWS deployment
- `MIGRATION_GUIDE.md` - Detailed migration information
- `PRE_DEPLOYMENT_CHECKLIST.md` - Step-by-step verification
- `README_DEPLOYMENT.md` - Complete migration summary

### Local Development
```bash
npm run dev     # Development server
npm run build   # Production build
npm start       # Production server
```

### Deploy to AWS Amplify
1. Create PostgreSQL database (Neon.tech - free)
2. Run `SETUP_POSTGRES.bat`
3. Push to GitHub
4. Deploy on AWS Amplify Console

**Total time: ~30 minutes to go live!**

### Other Deploy Options
- **Railway**: `railway up` (supports SQLite)
- **Render**: Connect GitHub repo
- **Vercel**: Requires PostgreSQL migration

## 🆚 Desktop App vs Web App

| Feature | Desktop App | Web App |
|---------|-------------|---------|
| **Access** | Single computer | Any device |
| **Installation** | Python required | Just a browser |
| **Updates** | Manual | Automatic |
| **UI** | Tkinter | Modern React |
| **Mobile** | ❌ No | ✅ Yes |
| **Sharing** | ❌ No | ✅ Yes (same network) |
| **Offline** | ✅ Yes | ⚠️ Needs server |

## 🔒 Security Notes

- Data stored locally in JSON file
- No authentication (add if needed for production)
- Runs on localhost by default
- Enable HTTPS for production

## 📞 Support

For issues or questions:
1. Check this README
2. Review the code comments
3. Check browser console for errors

## 🎉 What's Included

✅ **Modern Dashboard** - Responsive, fast, beautiful  
✅ **Full CRUD Operations** - Create, Read, Update, Delete  
✅ **Filtering & Search** - Month/year filters  
✅ **Batch Operations** - Select multiple LRs  
✅ **Status Tracking** - Complete/Incomplete indicators  
✅ **Form Validation** - Real-time validation  
✅ **Mobile Responsive** - Works on all devices  
✅ **TypeScript** - Type-safe code  
✅ **Tailwind CSS** - Modern styling  
✅ **JSON Database** - Simple, portable storage  

## 🚀 Future Enhancements

Completed:
- [x] PDF/Excel export ✅
- [x] Batch bill generation with templates ✅
- [x] Cloud database (PostgreSQL) ✅
- [x] AWS deployment ready ✅

Potential features to add:
- [ ] User authentication
- [ ] Real-time updates with WebSockets
- [ ] Advanced search and filters
- [ ] Data analytics and charts
- [ ] Mobile app (React Native)

## 📝 License

Private use for Mangesh Transport billing management.

---

**Enjoy your modern LR billing system!** 🎊

Access from anywhere, manage from everywhere! 🌐

