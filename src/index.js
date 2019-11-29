const jquery = require('jquery');
const jsdom = require('jsdom');
const fs = require('fs-extra');
const path = require('path');

const { asyncForEach } = require('./utils');
const { getPages, createMarkdownFileFromResource } = require('./importer');

const { JSDOM } = jsdom;

const OUTPUT_PATH = 'content/output';

const TYPE_AUTHOR = 'authors';
const TYPE_POST = 'posts';
const TYPE_TOPIC = 'topics';

const URLS = [
    'https://theblog.adobe.com/conversion-success-events/',
    'https://theblog.adobe.com/new-data-governance-capabilities-in-adobe-experience-platform-help-brands-manage-data-better',
    'https://theblog.adobe.com/four-paintings-that-show-what-you-can-do-in-adobe-fresco',
    'https://theblog.adobe.com/how-to-build-a-best-of-breed-product-offering',
    'https://theblog.adobe.com/weve-achieved-global-gender-pay-parity-a-milestone-worth-celebrating/',
    'https://theblog.adobe.com/leadership-lessons-from-the-u-s-womens-national-soccer-team/',
    'https://theblog.adobe.com/adobe-breaks-ground-on-north-tower-in-san-jose/',
    'https://theblog.adobe.com/recovering-reservations-from-visitors-who-abandon-the-hotel-reservation-process/',
    'https://theblog.adobe.com/helping-travelers-find-personal-dream-vacations/',
    'https://theblog.adobe.com/creating-adobe-experience-platform-pipeline-with-kafka/',
    'https://theblog.adobe.com/how-marketo-engage-helped-icf-align-sales-and-marketing/'
];

async function handleAuthor($) {
    const postedBy = $('.author-link').text();
    const authorLink = $('.author-link')[0].href;
    const postedOn = $('.post-date').text().toLowerCase();
    
    const $p = $('<p>');
    $p.append(`by ${postedBy}<br>${postedOn}`);

    const authorFilename  = path.parse(authorLink).name;
    const fullPath = `${OUTPUT_PATH}/${TYPE_AUTHOR}/${authorFilename}.md`;
    if (!await fs.exists(fullPath)) {
        console.log(`File ${fullPath} does not exist. Retrieving it now.`);
        await asyncForEach(await getPages([authorLink]), async (resource) => {
            const text = await fs.readFile(`${resource.localPath}`, 'utf8');
            const dom = new JSDOM(text);
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
            await createMarkdownFileFromResource(`${OUTPUT_PATH}/${TYPE_AUTHOR}`, resource, content);
        });
    } else {
        console.log(`File ${fullPath} exists, no need to compute it again.`);
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

    await asyncForEach(
        topics.split(',')
            .filter(t => t && t.length > 0)
            .map(t => t.trim()),
        async (t) => {
            const fullPath = `${OUTPUT_PATH}/${TYPE_TOPIC}/${t.replace(/\s/g,'-').toLowerCase()}.md`
            if (!await fs.exists(fullPath)) {
                console.log(`Found a new topic: ${t}`);
                await createMarkdownFileFromResource(`${OUTPUT_PATH}/${TYPE_TOPIC}`, {
                    filename: `${t.replace(/\s/g,'-').toLowerCase()}.md`,
                }, `<h1>${t}</h1>`);
            } else {
                console.log(`Topic already exists: ${t}`);
            }
        });

    return $p;
}

async function handleProducts($) {
    let products = '';
    $('.sidebar-products-row .product-team-link').each((i, t) => {
        let name = path.parse(t.href).name;
        name = name.replace(/\-/g,' ').replace(/\b[a-z](?=[a-z]{2})/g, function(letter) {
            return letter.toUpperCase();
        });
        products += `${name}, `;
    });

    products = products.slice(0, -2); 
    
    const $p = $('<p>');
    $p.append(`Products: ${products}`);

    return $p;
}

async function main() {
    await fs.remove(OUTPUT_PATH);

    await asyncForEach(await getPages(URLS), async (resource) => {
        // encoding issue, do not use resource.text
        const text = await fs.readFile(`${resource.localPath}`, 'utf8');
        const dom = new JSDOM(text);
        const { document } = dom.window;
        const $ = jquery(document.defaultView);
        
        const $main = $('.main-content');

        const $newAuthorWrap = await handleAuthor($);
        $main.append($newAuthorWrap);
        $('<hr>').insertBefore($newAuthorWrap);

        const $newTopicWrap = await handleTopics($);
        $main.append($newTopicWrap);
        $('<hr>').insertBefore($newTopicWrap);

        const $newProductsWrap = await handleProducts($);
        $main.append($newProductsWrap);
        $('<hr>').insertBefore($newProductsWrap);

        // remove author / products section
        $('.article-author-wrap').remove();
        // remove footer
        $('.article-footer').remove();
        // remove nav
        $('#article-nav-wrap').remove();
        // remove 'products in article'
        $('.article-body-products').remove();

        const content = $main.html();

        await createMarkdownFileFromResource(`${OUTPUT_PATH}/${TYPE_POST}`, resource, content);
    });

    console.log('Process done!');
}

main();
