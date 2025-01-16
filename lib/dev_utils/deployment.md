

# Deploying a Next.js 13+ Application to Vercel


Follow these steps to deploy your TypeScript-based Next.js application to Vercel:


## Step 1: Install Vercel CLI (Optional)
1. Install the Vercel CLI globally on your machine for command-line deployments:
  ```bash
  npm install -g vercel
  ```


2. Authenticate your Vercel account by running:
  ```bash
  vercel login
  ```


## Step 2: Prepare Your Project
Ensure your project is set up correctly for deployment:
- Ensure your `package.json` includes the scripts `build` and `start`:
 ```json
 "scripts": {
   "dev": "next dev",
   "build": "next build",
   "start": "next start",
   "lint": "next lint"
 }
 ```


- Make sure all necessary dependencies (e.g., TailwindCSS, Prisma, etc.) are installed and properly configured.


## Step 3: Create a Vercel Account
1. Go to [Vercel](https://vercel.com/) and create an account.
2. Link your GitHub, GitLab, or Bitbucket account to Vercel for easier deployments.


## Step 4: Deploy to Vercel
You can deploy using either the Vercel CLI or the web interface.


### Option 1: Using Vercel CLI
1. Run the following command in your project directory:
  ```bash
  vercel
  ```
2. Follow the prompts to set up your project (e.g., project name, framework, etc.).
3. Vercel will build and deploy your application. The deployment URL will be provided once complete.


### Option 2: Using the Web Interface
1. Push your code to a Git repository (e.g., GitHub).
2. Log in to your Vercel account and click **Add New Project**.
3. Import your repository and configure the project settings:
  - **Framework Preset**: Choose `Next.js`.
  - **Root Directory**: Leave as default or specify if different.
4. Click **Deploy** to start the deployment process.


## Step 5: Configure Environment Variables
If your application uses environment variables (e.g., for API keys or database connections), configure them in the Vercel dashboard:
1. Go to your project in Vercel and click **Settings > Environment Variables**.
2. Add the necessary environment variables.


## Step 6: Enable Custom Domains (Optional)
To use a custom domain:
1. Go to your project in the Vercel dashboard.
2. Click **Domains** and add your domain name.
3. Update your DNS settings as instructed by Vercel.


## Step 7: Verify Deployment
1. Access the deployment URL provided by Vercel (e.g., `https://my-app.vercel.app`).
2. Verify that your application is running as expected.


## Notes
- Vercel automatically rebuilds and redeploys your app on new commits to the connected Git repository.
- For advanced configurations, consult the [Vercel Documentation](https://vercel.com/docs).



