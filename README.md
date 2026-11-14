# Chandira Imanjith — portfolio

A static portfolio site: sketches and studies shown on a pannable park map, with a page per project.

## Layout

```
index.html        Home: the park map
projects.html     All projects, as a looping list
project.html      One project (project.html?p=<slug>)
about.html        About
contact.html      Contact
assets/
  css/style.css   All styles
  js/data.js      All content: projects, images, map positions
  js/             Page scripts (map, park, lists, contact form)
  img/            Web-ready images
originals/        Source PDFs and photos (kept locally, not in git)
```

## Editing content

Everything shown on the site is defined in `assets/js/data.js`. The comment at the top of that file explains how to add a project.

## Running locally

```bash
python -m http.server 4173
```

Then open http://localhost:4173.
