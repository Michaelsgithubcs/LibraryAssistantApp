# Library Assistant Admin Dashboard - Vercel Deployment

## Deploy to Vercel

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   cd /Users/mikendlovu/Downloads/LibraryAssistantApp
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy? Yes
   - Which scope? (Select your account)
   - Link to existing project? No
   - What's your project's name? `library-assistant-admin`
   - In which directory is your code located? `./`
   - Want to override the settings? No

5. **Set Environment Variable** (after first deployment):
   ```bash
   vercel env add VITE_API_URL production
   ```
   Enter value: `https://libraryassistantapp.onrender.com/api`

6. **Redeploy to apply environment variable**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository (if pushed to GitHub)
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add Environment Variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://libraryassistantapp.onrender.com/api`

6. Click "Deploy"

## Features

- ✅ Admin Dashboard for library management
- ✅ Book management (add, edit, delete)
- ✅ User management
- ✅ Issue/Return books
- ✅ Fines management
- ✅ Connected to Render backend API

## Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## API Configuration

The app uses the `VITE_API_URL` environment variable to connect to your backend.

- **Production**: `https://libraryassistantapp.onrender.com/api`
- **Local Development**: Create a `.env` file:
  ```
  VITE_API_URL=http://localhost:5001/api
  ```

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- Render (Backend API)
