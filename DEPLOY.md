# GitHub Pages Deployment Guide

This guide explains how to deploy the SC2 Gantt Chart application to GitHub Pages.

## Setup

1. **Enable GitHub Pages in your repository:**
   - Go to your repository settings
   - Scroll down to "Pages" section
   - Under "Source", select "GitHub Actions"

2. **Push your code to the main branch:**
   ```bash
   git add .
   git commit -m "Add GitHub Pages deployment"
   git push origin main
   ```

3. **The deployment will start automatically** when you push to the main branch.

## How it Works

### GitHub Actions Workflow
- Located at `.github/workflows/deploy.yml`
- Triggers on pushes to the main branch
- Builds the static site using Python
- Deploys to GitHub Pages

### Build Process
- `build_static.py` converts the Flask app to static files
- Generates static HTML, CSS, and JavaScript
- Creates a static API endpoint (`api/sc2-data.json`)
- Updates all paths to work with static hosting

### Static Site Structure
```
dist/
├── index.html              # Main application page
├── css/
│   └── gantt.css          # Styles
├── js/
│   └── gantt.js           # Application logic (modified for static)
├── assets/
│   └── sc2_comprehensive_data.json  # Game data
├── api/
│   └── sc2-data.json      # Static API endpoint
└── 404.html               # Custom 404 page
```

## Key Modifications for Static Hosting

1. **API Endpoints**: Changed from `/api/sc2-data` to `./api/sc2-data.json`
2. **Asset Paths**: Changed from `/assets/` to `./assets/`
3. **Export Function**: Replaced server-side export with client-side download
4. **Template**: Uses static HTML instead of Flask templates

## Local Testing

To test the static build locally:

```bash
# Build the static site
python build_static.py

# Serve locally (Python 3)
cd dist
python -m http.server 8000

# Open http://localhost:8000 in your browser
```

## Troubleshooting

### Build Fails
- Check that all dependencies are installed
- Ensure the Flask app runs locally first
- Check GitHub Actions logs for specific errors

### Assets Not Loading
- Verify paths are relative (start with `./`)
- Check that files exist in the `dist` directory
- Ensure case sensitivity is correct

### Export Not Working
- The export function uses client-side downloads
- Check browser permissions for downloads
- Verify the JSON structure is valid

## URL Structure

Once deployed, your app will be available at:
- `https://yourusername.github.io/repository-name/`

The application will work entirely client-side with no server dependencies.