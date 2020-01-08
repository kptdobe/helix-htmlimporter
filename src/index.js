const jquery = require('jquery');
const jsdom = require('jsdom');
const fs = require('fs-extra');
const path = require('path');

const { asyncForEach, asyncForKey } = require('./utils');
const { getPages, createMarkdownFileFromResource } = require('./importer');

const { JSDOM } = jsdom;

const OUTPUT_PATH = 'content/output';

const TYPE_AUTHOR = 'authors';
const TYPE_POST = 'posts';
const TYPE_TOPIC = 'topics';

async function handleAuthor($) {
    let postedBy = $('.author-link').text();
    postedBy = postedBy.split(',')[0].trim();
    const authorLink = $('.author-link')[0].href;
    const postedOn = $('.post-date').text().toLowerCase();
    
    const $p = $('<p>');
    $p.append(`by ${postedBy}<br>${postedOn}`);

    const authorFilename  = postedBy.toLowerCase().trim().replace(/\s/g,'-');
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
            await createMarkdownFileFromResource(`${OUTPUT_PATH}/${TYPE_AUTHOR}`, resource, content, authorFilename);
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

    return topics;
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

    return products.slice(0, -2);
}

async function main() {
    await fs.remove(OUTPUT_PATH);

    const URLS_JSON_FILE = process.argv[2];

    await asyncForKey(urls, async (year) => {
        const us = urls[year].filter((u) => !oldurls[year] || oldurls[year].indexOf(u) === -1);
        await asyncForEach(await getPages(us), async (resource) => {
            // encoding issue, do not use resource.text
            const text = await fs.readFile(`${resource.localPath}`, 'utf8');
            const dom = new JSDOM(text);
            const { document } = dom.window;
            const $ = jquery(document.defaultView);
            
            const $main = $('.main-content');

            // remove all hidden elements
            $main.find('.hidden-md-down, .hidden-xs-down').remove();

            // add a thematic break after first titles
            $('<hr>').insertAfter($('.article-header'));

            // add a thematic break after hero banner
            const $heroHr = $('<hr>').insertAfter($('.article-hero'));

            const $newAuthorWrap = await handleAuthor($);
            $newAuthorWrap.insertAfter($heroHr);
            $('<hr>').insertAfter($newAuthorWrap);

            const topics = await handleTopics($);
            const products = await handleProducts($);

            const $metaWrap = $('<p>');
            $metaWrap.html(`Topics: ${topics}<br>Products: ${products}`);

            $main.append($metaWrap);
            $('<hr>').insertBefore($metaWrap);

            const headers = $('.article-header');
            if (headers.length === 0) {
                // posts with headers after image
                const $articleRow = $('.article-title-row');
                $('.article-content').prepend($articleRow);
                $('<hr>').insertAfter($articleRow);
            }
            $('.article-collection-header').remove();

            // remove author / products section
            $('.article-author-wrap').remove();
            // remove footer
            $('.article-footer').remove();
            // remove nav
            $('#article-nav-wrap').remove();
            // remove 'products in article'
            $('.article-body-products').remove();

            const content = $main.html();

            await createMarkdownFileFromResource(`${OUTPUT_PATH}/${TYPE_POST}/${year}`, resource, content);
        });
    });

    console.log('Process done!');
}

main();
