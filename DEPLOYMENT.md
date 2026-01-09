# Deployment Guide - Connecting to Notion

Your Resolution Tracker is now configured to connect to Notion! Follow these steps to deploy.

## Current Setup Status ✅

- ✅ Notion API credentials configured in `.env`
- ✅ Serverless API function created at `api/notion/resolutions.js`
- ✅ Vercel configuration file created

## Deploy to Vercel

### Option 1: Deploy via Vercel CLI (Recommended for first deployment)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from your project directory**
   ```bash
   vercel
   ```

   - Answer the prompts:
     - Set up and deploy? **Y**
     - Which scope? Select your account
     - Link to existing project? **N**
     - Project name? Press Enter (or customize)
     - In which directory is your code located? **/**
     - Want to override settings? **N**

4. **Set Environment Variables in Vercel Dashboard**

   After first deployment, go to your project on vercel.com:
   - Go to **Settings** → **Environment Variables**
   - Add these variables (use your actual values from your local `.env` file):
     - `NOTION_API_KEY` = `secret_your_integration_token_here`
     - `NOTION_DATABASE_ID` = `your_database_id_here`
   - Set them for: **Production, Preview, and Development**

5. **Redeploy**
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub (Recommended for continuous deployment)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Add Notion integration"
   git push
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click **"Add New Project"**
   - Import your GitHub repository
   - Vercel will auto-detect Vite configuration

3. **Add Environment Variables**
   - During setup or in **Settings** → **Environment Variables** (use your actual values from your local `.env` file):
     - `NOTION_API_KEY` = `secret_your_integration_token_here`
     - `NOTION_DATABASE_ID` = `your_database_id_here`

4. **Deploy**
   - Click **Deploy**
   - Future pushes to main branch will auto-deploy

## Test Your Connection

Once deployed, your app will be available at: `https://your-project.vercel.app`

### Test the API endpoint directly:
```bash
curl https://your-project.vercel.app/api/notion/resolutions
```

If working correctly, you should see your resolutions from Notion in JSON format.

## Local Development with Notion API

To test locally before deploying:

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm i -g vercel
   ```

2. **Link your project**
   ```bash
   vercel link
   ```

3. **Pull environment variables**
   ```bash
   vercel env pull .env.local
   ```

4. **Run dev server with Vercel's serverless functions**
   ```bash
   vercel dev
   ```

This will run your app at `http://localhost:3000` with working API routes.

## Troubleshooting

### "Missing Notion credentials" error
- Verify environment variables are set in Vercel dashboard
- Make sure they're enabled for all environments (Production, Preview, Development)
- Redeploy after adding environment variables

### "Failed to fetch from Notion" error
- Check that your Notion integration has access to the database
- Verify the Database ID is correct (check the URL of your Notion database)
- Ensure all required properties exist in your Notion database

### CORS errors
- The API route should handle CORS automatically
- If you still see CORS errors, check the browser console for details

### Database schema issues
Make sure your Notion database has these exact property names:
- **Resolution** (Title)
- **Category** (Select)
- **Target** (Number)
- **Current Progress** (Number)
- **Unit** (Select)
- **Frequency** (Select)
- **Streak** (Number)
- **Last Check-in** (Date)

## Next Steps

Once deployed and connected:

1. Open your deployed app
2. The app should automatically fetch resolutions from Notion
3. Try adding a new resolution - it should sync to Notion
4. Update progress - it should update in Notion in real-time

## Security Notes

- Never commit `.env` files to Git (already in `.gitignore`)
- Environment variables in Vercel are encrypted and secure
- The API key in this file should be kept private
- Consider rotating your Notion API key periodically

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Notion API Documentation](https://developers.notion.com/)
- [Vite on Vercel](https://vercel.com/guides/deploying-vite-with-vercel)
