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

const TYPE_AUTHOR = 'authors';
const TYPE_POST = 'posts';
const TYPE_PRODUCT = 'products';
const TYPE_TOPIC = 'topics';

const URLS = [
    'https://theblog.adobe.com/new-data-governance-capabilities-in-adobe-experience-platform-help-brands-manage-data-better',
    'https://theblog.adobe.com/four-paintings-that-show-what-you-can-do-in-adobe-fresco',
    'https://theblog.adobe.com/how-to-build-a-best-of-breed-product-offering'
];

async function getPages(urls, folder) {

    const options = {
        urls: urls,
        directory: `${TMP_DOWNLOAD}/${folder}`,
        recursive: false,
        urlFilter: function(url) {
            return url.indexOf('adobe') !== -1;
        },
        sources: [
            // only keep the imgs
            { selector: 'img', attr: 'src' },
            {selector: '[style]', attr: 'style'},
		    {selector: 'style'},
        ],
        subdirectories: [
            { directory: 'img', extensions: ['.git', '.jpg', '.jpeg', '.png', '.svg'] },
        ],
        plugins: [
            new (class {
                apply(registerAction) {
                    let occupiedFilenames, defaultFilename;

                    registerAction('beforeStart', ({options}) => {
                        occupiedFilenames = [];
                        defaultFilename = options.defaultFilename;
                    });
                    registerAction('generateFilename', async ({ resource }) => {
                        if ('index.html' === resource.filename) {
                            // replace index.html by last segment in path
                            // and remove last / if it is the last character
                            const u = resource.url.replace('/index.html','').replace(/\/$/g,'');
                            const name = u.substring(u.lastIndexOf('/') + 1, u.length);
                            return { filename: `${name}.html` };
                        }

                        let directory = 'img';
                        if ( resource.parent ) {
                            const u = resource.parent.url.replace('/index.html','').replace(/\/$/g,'');
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

async function createMDFile(type, name, content, links) {
    console.log(`Creating a new MD file: ${OUTPUT_PATH}/${type}/${name}.md`);
    unified()
        .use(parse, { emitParseErrors: true, duplicateAttribute: false })
        .use(rehype2remark)
        .use(stringify)
        .process(content, async function(err, file) {
            if (err) {
                console.error(err);
            } else {
                await fs.writeFile(`${OUTPUT_PATH}/${type}/${name}.md`, file.contents);
                console.log(`${name}.md post file created`);

                if (links && links.length > 0) {
                    const folder = `${OUTPUT_PATH}/${type}/${name}`;
                    await fs.mkdirs(folder);
                    // copy resources (imgs...) folder
                    links.forEach(async (l) => {
                        const rName = path.parse(l.url).base;
                        // try to be smart, only copy images "referenced" in the content
                        if (file.contents.indexOf(rName) !== -1) {
                            await fs.copy(`${TMP_DOWNLOAD}/${type}/${l.filename}`, `${folder}/${rName}`);
                        }
                    });
                }
            }
        });
}

async function createMDFromResource(type, resource, content) {
    const name = path.parse(resource.filename).name
    await createMDFile(type, name, content, resource.children);
}

async function handleAuthor($) {
    const postedBy = $('.author-link').text();
    const authorLink = $('.author-link')[0].href;
    const postedOn = $('.post-date').text().toLowerCase();
    
    const $p = $('<p>');
    $p.append(`by ${postedBy}<br>${postedOn}`);

    const authorFilename  = path.parse(authorLink).name;
    const fullPath = `${OUTPUT_PATH}/${TYPE_AUTHOR}/${authorFilename}.md`;
    if (!await fs.exists(fullPath)) {
        // createMDFile(OUTPUT_AUTHORS, authorFilename, content, []);
        console.log(`${fullPath} does not exist. Retrieving it now.`);
        (await getPages([authorLink], TYPE_AUTHOR)).forEach(async (resource) => {

            const dom = new JSDOM(resource.text);
            const { document } = dom.window;
            const $ = jquery(document.defaultView);
            
            const $main = $('.author-header');

            // convert author-img from div to img for auto-processing
            const $div = $('.author-header .author-img');
            const urlstr = $div.css('background-image');
            const url = /\(([^)]+)\)/.exec(urlstr)[1];
            $main.prepend(`<img src="${url}">`);
            $div.remove();

            const content = $main.html();
            await createMDFromResource(TYPE_AUTHOR, resource, content);
        });

    }

    return $p;
}

async function handleTopics($) {
    let topics = '';
    $('.article-footer-topics-wrap .text').each((i, t) => {
        topics += `${t.innerHTML}, `;
    });

    topics = topics.slice(0, -2); 
    
    const $p = $('<p>');
    $p.append(`Topics: ${topics}`);

    return $p;
}

async function main() {
    await fs.remove(TMP_DOWNLOAD);
    await fs.remove(OUTPUT_PATH);
    await fs.mkdirs(`${OUTPUT_PATH}/${TYPE_AUTHOR}`);
    await fs.mkdirs(`${OUTPUT_PATH}/${TYPE_POST}`);
    await fs.mkdirs(`${OUTPUT_PATH}/${TYPE_TOPIC}`);
    await fs.mkdirs(`${OUTPUT_PATH}/${TYPE_PRODUCT}`);

    (await getPages(URLS, TYPE_POST)).forEach(async (resource) => {
        const dom = new JSDOM(resource.text);
        const { document } = dom.window;
        const $ = jquery(document.defaultView);
        
        const $main = $('.main-content');

        const $newAuthorWrap = await handleAuthor($);
        $main.append($newAuthorWrap);
        $('<hr>').insertBefore($newAuthorWrap);

        const $newTopicWrap = await handleTopics($);
        $main.append($newTopicWrap);
        $('<hr>').insertBefore($newTopicWrap);

        // remove author / products section
        $('.article-author-wrap').remove();
        // remove footer
        $('.article-footer').remove();
        // remove nav
        $('#article-nav-wrap').remove();
        // remove 'products in article'
        $('.article-body-products').remove();

        const content = $main.html();

        createMDFromResource(TYPE_POST, resource, content);
    });
}

main();
