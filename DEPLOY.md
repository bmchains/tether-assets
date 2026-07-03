# Publish TetherAsset Globally

This website is ready as a static site. To make it reachable on the public internet from server `77.110.119.154`, you need two things:

1. Open inbound ports `80` and `443` on the server firewall / hosting provider firewall
2. Upload these files to the web root or deploy them from GitHub

## Current blocker

Public checks to `77.110.119.154:80` and `77.110.119.154:443` are currently failing, so the server is not publicly serving HTTP or HTTPS yet.

## Fastest public option

If you want a quick global URL without touching the server yet, use GitHub Pages.

The workflow file `.github/workflows/pages.yml` is already prepared. After you push to `main`:

1. Open repository settings
2. Open `Pages`
3. Set source to `GitHub Actions`
4. Wait for the workflow to finish

Your public URL should then be:

- `https://bmchains.github.io/tether-assets/`

## Recommended repo structure

Upload these files to the GitHub repository root:

- `index.html`
- `styles.css`
- `app.js`
- `assets/token-banner.jpg`
- `README.md`
- `DEPLOY.md`
- `.github/workflows/deploy.yml`
- `.github/workflows/pages.yml`
- `server/nginx-tether-assets.conf`

## Manual server deploy

If your server already has Nginx:

1. Install Nginx
2. Copy the site files into:
   - `/var/www/tether-assets`
3. Copy `server/nginx-tether-assets.conf` into:
   - `/etc/nginx/sites-available/tether-assets`
4. Enable the site and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/tether-assets /etc/nginx/sites-enabled/tether-assets
sudo nginx -t
sudo systemctl reload nginx
```

## GitHub Actions deploy

The workflow file in `.github/workflows/deploy.yml` deploys the site to your server over SSH.

Add these GitHub repository secrets:

- `DEPLOY_HOST` = `77.110.119.154`
- `DEPLOY_USER` = your server SSH username
- `DEPLOY_SSH_KEY` = your private SSH key
- `DEPLOY_TARGET` = target folder such as `/var/www/tether-assets`
- `DEPLOY_PORT` = optional SSH port, for example `22`

Then push to `main`.

## Optional next step

After the site is live on HTTP, add SSL with Let's Encrypt so the website is reachable on HTTPS as well.
