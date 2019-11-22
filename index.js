const jquery = require("jquery");
const unified = require("unified");
const parse = require('rehype-parse')
const rehype2remark = require('rehype-remark')
const stringify = require('remark-stringify')
const jsdom = require("jsdom");
const fs = require('fs-extra');
const path = require('path');
const scrape = require('website-scraper');
const byTypeFilenameGenerator = require('website-scraper/lib/filename-generator/by-type');

const { JSDOM } = jsdom;

const TMP_DOWNLOAD = 'content/tmp'
const OUTPUT_PATH = 'content/output'

const OUTPUT_AUTHORS = `${OUTPUT_PATH}/authors`;
const OUTPUT_POSTS = `${OUTPUT_PATH}/posts`;
const OUTPUT_PRODUCTS = `${OUTPUT_PATH}/products`;
const OUTPUT_TOPICS = `${OUTPUT_PATH}/topics`;

const URLS = [
    'https://theblog.adobe.com/new-data-governance-capabilities-in-adobe-experience-platform-help-brands-manage-data-better',
    'https://theblog.adobe.com/four-paintings-that-show-what-you-can-do-in-adobe-fresco',
    'https://theblog.adobe.com/how-to-build-a-best-of-breed-product-offering'
];

async function getBlogPages(urls) {

    await fs.remove(TMP_DOWNLOAD);

    const options = {
        urls: urls,
        directory: TMP_DOWNLOAD,
        recursive: false,
        urlFilter: function(url) {
            return url.indexOf('adobe') !== -1;
        },
        sources: [
            // only keep the imgs
            { selector: 'img', attr: 'src' },
        ],
        subdirectories: [
            { directory: 'img', extensions: ['.git', '.jpg', '.jpeg', '.png', '.svg'] },
        ],
        plugins: [
            new (class {
                apply(registerAction) {
                    let occupiedFilenames, subdirectories, defaultFilename;

                    registerAction('beforeStart', ({options}) => {
                        occupiedFilenames = [];
                        subdirectories = options.subdirectories;
                        defaultFilename = options.defaultFilename;
                    });
                    registerAction('generateFilename', async ({ resource }) => {
                        if ('index.html' === resource.filename) {
                            // replace index.html by last segment in path
                            const u = resource.url.replace('/index.html','');
                            const name = u.substring(u.lastIndexOf('/') + 1, u.length);
                            return { filename: `${name}.html` };
                        }

                        let directory = 'img';
                        if ( resource.parent ) {
                            const u = resource.parent.url.replace('/index.html','');
                            directory = u.substring(u.lastIndexOf('/') + 1, u.length);
                        }

                        // else default behavior
                        const filename = byTypeFilenameGenerator(resource, { 
                            subdirectories: [ { directory, extensions: ['.git', '.jpg', '.jpeg', '.png', '.svg'] } ],
                            defaultFilename }, occupiedFilenames);
                        occupiedFilenames.push(filename);
                        return { filename };
                    });
                }
            })()
        ]
    };
    
    console.log('Starting to scrape urls');
    const result = await scrape(options);
    console.log(`Done with scraping. Downloaded ${result.length} pages.`);

    return result;
}

async function createPost(resource, content) {
    console.log('Creating a new post file');
    unified()
        .use(parse, { emitParseErrors: true, duplicateAttribute: false })
        .use(rehype2remark)
        .use(stringify)
        .process(content, async function(err, file) {
            if (err) {
                console.error(err);
            } else {
                const name = path.parse(resource.filename).name
                await fs.writeFile(`${OUTPUT_POSTS}/${name}.md`, file.contents);
                console.log(`${name}.md post file created`);

                if (resource.children && resource.children.length > 0) {
                    // copy resources (imgs...) folder
                    await fs.copy(`${TMP_DOWNLOAD}/${name}`, `${OUTPUT_POSTS}/${name}`);
                }
            }
        });
}

async function main() {
    (await getBlogPages(URLS)).forEach((resource) => {
        const dom = new JSDOM(resource.text);
        const { document } = dom.window;
        const $ = jquery(document.defaultView);
        
        // remove nav
        $('#article-nav-wrap').remove();
        // remove 'products in article'
        $('.article-body-products').remove();
        
        const $main = $('.main-content');
        const $authorWrap = $('.article-author-wrap');
        $main.append($authorWrap);
        $('<hr>').insertBefore($authorWrap);
        $('<hr>').insertAfter($authorWrap);

        const $footer = $('.article-footer');
        $main.append($footer);
        $('<hr>').insertAfter($footer);


        const content = $main.html();

        createPost(resource, content);
    });
}

main();
