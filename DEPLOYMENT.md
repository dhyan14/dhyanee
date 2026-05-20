# 🚀 Dhyanee LMS Deployment Guide

This guide describes how to deploy the full-stack **Dhyanee LMS** platform to production. Because this application uses real-time WebSockets (`Socket.io`) and AI features, the frontend and backend must be deployed to hosting providers that support their respective needs.

---

## 🎨 1. Frontend (Next.js) -> Vercel

Vercel is the recommended platform for hosting the Next.js client app.

### Deployment Steps:
1. Push your code repository (containing both `client` and `server` folders) to GitHub, GitLab, or Bitbucket.
2. Go to the [Vercel Dashboard](https://vercel.com) and click **"Add New Project"**.
3. Select your repository.
4. Configure the project settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `client` *(Important! Check the checkbox to use `client` as the root)*
   - **Build Command**: `next build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
5. **Environment Variables**: Add the following Environment Variables in Vercel under Project Settings:
   - `NEXT_PUBLIC_API_URL`: `https://your-backend-url.railway.app/api` (The deployed URL of your Express API)
   - `NEXT_PUBLIC_SOCKET_URL`: `https://your-backend-url.railway.app` (The deployed URL of your Express Server)
6. Click **Deploy**.

---

## ⚙️ 2. Backend (Express + Socket.io) -> Railway / Render / Heroku

Because the backend uses WebSockets for real-time monitoring and alert streaming, **it cannot be hosted on Vercel** (serverless functions do not support persistent Socket.io connections). Instead, host it on a platform like **Railway**, **Render**, or **Heroku**.

### Option A: Railway (Recommended - Fastest Setup)
1. Go to [Railway.app](https://railway.app) and create an account.
2. Click **New Project** -> **Deploy from GitHub repository**.
3. Select your repository.
4. Set the **Root Directory** to `server`.
5. Under settings, add the following variables:
   - `PORT`: `5000` (Railway will automatically map this)
   - `MONGODB_URI`: Your MongoDB Atlas URI string
   - `JWT_SECRET`: A long, randomly generated secure key
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: `https://your-deployed-frontend.vercel.app` (Your Vercel frontend URL)
   - `CLOUDINARY_CLOUD_NAME`: Your Cloudinary Cloud Name
   - `CLOUDINARY_API_KEY`: Your Cloudinary API Key
   - `CLOUDINARY_API_SECRET`: Your Cloudinary API Secret
6. Railway will auto-detect the `start` script and deploy.

### Option B: Render.com
1. Go to [Render.com](https://render.com) and create a **Web Service**.
2. Connect your GitHub repository.
3. Set the following details:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add the same Environment Variables as above.

---

## 💾 3. Database -> MongoDB Atlas

Use a free MongoDB cloud cluster for production database hosting:
1. Sign up on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free shared cluster.
3. Under **Network Access**, allow access from anywhere (`0.0.0.0/0`) or add the IP ranges of your backend hosting server.
4. Create a database user and copy the connection string.
5. Add the string to the `MONGODB_URI` environment variable of your deployed backend.

---

## 📡 4. Real-time Face Monitoring Snaps -> Cloudinary

To log webcam snapshots of distracted student sessions:
1. Sign up on [Cloudinary](https://cloudinary.com).
2. Copy your **Cloud Name**, **API Key**, and **API Secret** from the dashboard.
3. Configure them as backend environment variables.
