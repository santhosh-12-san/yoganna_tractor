# AWS Deployment Guide - Yoganna Tractor Works

This guide describes how to deploy the **Yoganna Tractor Works** (Tractor Work Management System) application to an **AWS EC2 Instance** using Docker Compose, Nginx, and GitHub Actions (CI/CD).

---

## 🛠️ Step 1: Launch an AWS EC2 Instance

1. Log in to your **AWS Management Console**.
2. Navigate to **EC2 Dashboard** and click **Launch Instance**.
3. Configure the following parameters:
   - **Name**: `Yoganna-Tractor-Works`
   - **OS (AMI)**: `Ubuntu 24.04 LTS` (or `Amazon Linux 2023`)
   - **Instance Type**: `t3.micro` (or `t3.small` for smoother builds)
   - **Key Pair**: Create or select an existing `.pem` key pair (e.g., `yoganna-key.pem`) for SSH access.
4. **Network Settings (Security Group)**:
   - Create a security group allowing:
     - **SSH (Port 22)**: Restrict to your IP address for security.
     - **HTTP (Port 80)**: Allow from anywhere (`0.0.0.0/0`).
     - **HTTPS (Port 443)**: Allow from anywhere (`0.0.0.0/0`).
5. Click **Launch Instance**.

---

## 🔑 Step 2: Install Docker & Git on the EC2 Instance

1. Connect to your instance via SSH:
   ```bash
   ssh -i "yoganna-key.pem" ubuntu@<YOUR-EC2-PUBLIC-IP>
   ```
2. Update the package list and install Docker:
   ```bash
   sudo apt-get update -y
   sudo apt-get install -y docker.io git
   ```
3. Add your user to the Docker group (so you don't need `sudo` to run docker commands):
   ```bash
   sudo usermod -aG docker ubuntu
   # Log out and log back in for this to take effect:
   exit
   ssh -i "yoganna-key.pem" ubuntu@<YOUR-EC2-PUBLIC-IP>
   ```
4. Verify Docker is running:
   ```bash
   docker --version
   ```

---

## 📂 Step 3: Clone the Codebase on EC2

1. Create a directory for the application:
   ```bash
   mkdir -p /home/ubuntu/yoganna-tractor-works
   cd /home/ubuntu/yoganna-tractor-works
   ```
2. Clone your GitHub repository:
   ```bash
   git clone <YOUR-GITHUB-REPO-URL> .
   ```

---

## ⚙️ Step 4: Configure Environment Variables

1. Create a `.env` file in the root directory to store database secrets and override defaults:
   ```bash
   nano .env
   ```
2. Add the following configurations (adjust passwords for production security):
   ```env
   POSTGRES_DB=yoganna_db
   POSTGRES_USER=yoganna_admin
   POSTGRES_PASSWORD=SecurePassword123
   POSTGRES_HOST=db
   POSTGRES_PORT=5432
   
   REDIS_HOST=redis
   DJANGO_DEBUG=False
   DJANGO_SECRET_KEY=ReplaceWithLongRandomSecureString
   ```
3. Save the file (`Ctrl + O`, then `Enter`, then `Ctrl + X`).

---

## 🚀 Step 5: Start the Containers

1. Spin up the production containers using Docker Compose:
   ```bash
   docker compose up -d --build
   ```
2. Check container status:
   ```bash
   docker compose ps
   ```
   You should see `yoganna_postgres_db`, `yoganna_redis_broker`, `yoganna_django_backend`, `yoganna_react_frontend`, and `yoganna_nginx_proxy` running.
3. Run database migrations:
   ```bash
   docker exec -it yoganna_django_backend python manage.py migrate
   ```
4. Seed the database with default Owner/Customer accounts and Figma metrics:
   ```bash
   docker exec -it yoganna_django_backend python init_db.py
   ```

---

## 🔒 Step 6: Configure Domain & SSL (HTTPS)

To enable secure HTTPS, point your domain name (e.g., `yogannatractor.com`) to the EC2 Public IP address, then set up Let's Encrypt:

1. Install Certbot on the EC2 instance:
   ```bash
   sudo apt-get install -y certbot
   ```
2. Obtain SSL certificate (Certbot will verify your domain ownership):
   ```bash
   sudo certbot certonly --standalone -d yourdomain.com
   ```
3. Mount the certificate folder to the Nginx container in `docker-compose.yml` to serve traffic over port 443 (see standard SSL configs), or run Certbot natively if preferred.

---

## 🤖 Step 7: Configure CI/CD on GitHub Actions

Your repository contains the CI/CD pipeline script `.github/workflows/deploy.yml`. To enable automated deployments whenever you push to the `main` branch, add these **GitHub Repository Secrets**:

1. Go to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Add the following secrets:
   - `AWS_ACCESS_KEY_ID`: Your AWS IAM User Access Key.
   - `AWS_SECRET_ACCESS_KEY`: Your AWS IAM User Secret Key.
   - `AWS_EC2_IP`: The Public IP address of your EC2 instance.
   - `AWS_SSH_PRIVATE_KEY`: The contents of your private key file (`yoganna-key.pem`).

Now, whenever you push code changes to the `main` branch, GitHub Actions will:
- Check out your code.
- Run python unit tests.
- SSH into your EC2 server, pull changes, rebuild the containers, and run migrations automatically.
