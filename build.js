const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const matter = require('gray-matter');

// Configure marked for security
marked.setOptions({
    headerIds: false,
    mangle: false
});

// Paths
const contentDir = path.join(__dirname, 'content');
const templateDir = path.join(__dirname, 'src', 'templates');
const outputDir = path.join(__dirname, 'dist');
const staticDir = path.join(__dirname, 'src');

// Create necessary directories
fs.ensureDirSync(outputDir);
fs.ensureDirSync(path.join(contentDir, 'blog'));
fs.ensureDirSync(path.join(contentDir, 'pages'));

// Copy static assets
fs.copySync(
    path.join(staticDir, 'css'),
    path.join(outputDir, 'css'),
    { overwrite: true }
);
fs.copySync(
    path.join(staticDir, 'js'),
    path.join(outputDir, 'js'),
    { overwrite: true }
);

// Read base template
const baseTemplate = fs.readFileSync(
    path.join(templateDir, 'base.html'),
    'utf-8'
);

// Build pages
function buildPages() {
    // Build regular pages
    const pageFiles = fs.readdirSync(path.join(contentDir, 'pages'));
    pageFiles.forEach(file => {
        if (file.endsWith('.md')) {
            const content = fs.readFileSync(
                path.join(contentDir, 'pages', file),
                'utf-8'
            );
            const { data, content: markdown } = matter(content);
            const html = marked.parse(markdown);
            
            const finalHtml = baseTemplate
                .replace('{{title}}', data.title || 'My Site')
                .replace('{{content}}', html);
            
            const outputPath = path.join(
                outputDir,
                file.replace('.md', '.html')
            );
            fs.writeFileSync(outputPath, finalHtml);
        }
    });

    // Build blog posts
    const blogFiles = fs.readdirSync(path.join(contentDir, 'blog'));
    const posts = [];
    
    blogFiles.forEach(file => {
        if (file.endsWith('.md')) {
            const content = fs.readFileSync(
                path.join(contentDir, 'blog', file),
                'utf-8'
            );
            const { data, content: markdown } = matter(content);
            const html = marked.parse(markdown);
            
            const finalHtml = baseTemplate
                .replace('{{title}}', data.title || 'Blog Post')
                .replace('{{content}}', `
                    <article class="post">
                        <h1>${data.title}</h1>
                        <div class="post-meta">
                            ${data.date || ''}
                        </div>
                        <div class="markdown">
                            ${html}
                        </div>
                    </article>
                `);
            
            const outputPath = path.join(
                outputDir,
                'blog',
                file.replace('.md', '.html')
            );
            fs.ensureDirSync(path.dirname(outputPath));
            fs.writeFileSync(outputPath, finalHtml);

            posts.push({
                title: data.title,
                date: data.date,
                slug: file.replace('.md', ''),
                excerpt: data.excerpt || ''
            });
        }
    });

    // Create blog index
    const blogIndexHtml = baseTemplate
        .replace('{{title}}', 'Blog')
        .replace('{{content}}', `
            <h1>Blog Posts</h1>
            <div class="post-list">
                ${posts
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(post => `
                        <article class="post-preview">
                            <h2><a href="/blog/${post.slug}.html">${post.title}</a></h2>
                            <div class="post-meta">${post.date}</div>
                            <p>${post.excerpt}</p>
                        </article>
                    `)
                    .join('')}
            </div>
        `);
    
    fs.writeFileSync(path.join(outputDir, 'blog', 'index.html'), blogIndexHtml);
}

buildPages(); 