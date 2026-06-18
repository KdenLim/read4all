# Read4All Website

Static campaign website for **Read4All**, a student-led digital book club campaign aligned with SDG 4: Quality Education.

## Project Structure

```text
index.html
styles.css
script.js
assets/
  favicon.svg
  read4all-hero.jpg
  read4all-hero.png
```

## Local Preview

Open `index.html` directly in a browser, or serve the folder with any static server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Cloudflare Pages Deployment

This project uses plain HTML, CSS, and JavaScript with no backend.

- Framework preset: `None`
- Build command: leave blank
- Build output directory: `/`

After deployment, update the placeholder links in `index.html`:

- `https://example.com/whatsapp-group`
- `https://instagram.com/read4all`
- Library/resource placeholders if the campaign has official links

## Legal Content Note

Read4All does not host copyrighted books or pirated PDFs. All shared materials should be legal, publicly available, or authorized resources.
