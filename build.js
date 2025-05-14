const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const matter = require('gray-matter');

// Configure marked for security
marked.setOptions({
    headerIds: false,
    mangle: false
});

// Helper function to calculate reading time
function calculateReadingTime(text) {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
}

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

// Read templates
const baseTemplate = fs.readFileSync(
    path.join(templateDir, 'base.html'),
    'utf-8'
);
const blogTemplate = fs.readFileSync(
    path.join(templateDir, 'blog.html'),
    'utf-8'
);

// Helper function to format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

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
            const readingTime = calculateReadingTime(markdown);
            
            // Replace placeholders in blog template
            let finalHtml = blogTemplate
                .replace(/{{title}}/g, data.title || 'Blog Post')
                .replace('{{date}}', formatDate(data.date))
                .replace('{{reading_time}}', readingTime)
                .replace('{{content}}', html);

            // Handle optional author field
            if (data.author) {
                finalHtml = finalHtml.replace('{{#if author}}', '')
                    .replace('{{/if}}', '')
                    .replace('{{author}}', data.author);
            } else {
                // Remove author section if no author specified
                finalHtml = finalHtml.replace(/{{#if author}}[\s\S]*?{{\/if}}/g, '');
            }
            
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
                author: data.author,
                readingTime: readingTime,
                slug: file.replace('.md', ''),
                excerpt: data.excerpt || ''
            });
        }
    });

    // Create blog index
    const blogIndexContent = `
        <div class="blog-content">
            <h1>Latest Posts</h1>
            <div class="post-list">
                ${posts
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(post => `
                        <article class="post-preview">
                            <h2><a href="${post.slug}.html">${post.title}</a></h2>
                            <div class="post-meta">
                                <time datetime="${post.date}">${formatDate(post.date)}</time>
                                <span class="separator"></span>
                                <span class="reading-time">${post.readingTime} mins</span>
                                ${post.author ? `<span class="separator"></span><span class="author">${post.author}</span>` : ''}
                            </div>
                            <p class="excerpt">${post.excerpt}</p>
                            <a href="${post.slug}.html" class="read-more">Read more →</a>
                        </article>
                    `)
                    .join('')}
            </div>
        </div>
    `;

    // Create a special version of the base template for the blog index
    const blogIndexHtml = baseTemplate
        .replace('{{title}}', 'Blog')
        .replace('<link rel="stylesheet" href="css/style.css">', '<link rel="stylesheet" href="../css/style.css">')
        .replace('<link rel="stylesheet" href="css/blog.css">', '<link rel="stylesheet" href="../css/blog.css">')
        .replace('<script src="js/main.js">', '<script src="../js/main.js">')
        .replace('href="/"', 'href="../"')
        .replace('href="blog"', 'href="."')
        .replace('href="about.html"', 'href="../about.html"')
        .replace('href="faq.html"', 'href="../faq.html"')
        .replace('{{content}}', blogIndexContent);
    
    fs.writeFileSync(path.join(outputDir, 'blog', 'index.html'), blogIndexHtml);
}

buildPages(); 