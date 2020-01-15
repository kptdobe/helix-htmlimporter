const jquery = require('jquery');
const jsdom = require('jsdom');
const fs = require('fs-extra');
const path = require('path');

require('dotenv').config()

const { asyncForEach, asyncForKey } = require('./utils');
const { getPages, createMarkdownFileFromResource } = require('./importer');

const { JSDOM } = jsdom;

const OUTPUT_PATH = 'content/output';

const TYPE_AUTHOR = 'authors';
const TYPE_POST = 'posts';
const TYPE_TOPIC = 'topics';
const TYPE_PRODUCT = 'products';

async function handleAuthor($) {
    let postedBy = $('.author-link').text();
    postedBy = postedBy.split(',')[0].trim();
    const authorLink = $('.author-link')[0].href;
    const postedOn = $('.post-date').text().toLowerCase();
    
    const nodes = [];
    nodes.push($('<p>').append(`by ${postedBy}`));
    nodes.push($('<p>').append(postedOn));

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

    return nodes;
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
                    filename: `${t.replace(/\s/gm,'-').replace(/\&amp;/gm,'').toLowerCase()}.md`,
                }, `<h1>${t}</h1>`);
            } else {
                console.log(`Topic already exists: ${t}`);
            }
        });

    return topics;
}

async function handleProducts($, localPath, resourceName) {
    let output = '';
    const products = [];
    $('.sidebar-products-row .product-team-link').each((i, p) => {
        const $p = $(p);
        let name = path.parse(p.href).name;

        const src = $p.find('img').attr('src');

        // edge case, some link redirect to homepage, try to get product from image src
        if (name === 'en') {
            name = path.parse(src).name;
        }

        name = name.replace(/\-/g,' ').replace(/\b[a-z](?=[a-z]{2})/g, function(letter) {
            return letter.toUpperCase();
        });
        
        const fileName = name.replace(/\s/g,'-').toLowerCase();
        products.push({
            name,
            fileName,
            href: p.href,
            imgSrc: `${fileName}/${path.parse(src).base}`,
            imgLocalPath: `${localPath}/${src}`
        })
        output += `${name}, `;
    });

    output = output.slice(0, -2);

    await asyncForEach(
        products,
        async (p) => {
            const fullPath = `${OUTPUT_PATH}/${TYPE_PRODUCT}/${p.fileName}.md`
            if (!await fs.exists(fullPath)) {
                console.log(`Found a new product: ${p.name}`);
                await createMarkdownFileFromResource(`${OUTPUT_PATH}/${TYPE_PRODUCT}`, {
                    filename: `${p.fileName}.md`,
                    children: [{
                        saved: true,
                        url: p.imgSrc,
                        localPath: p.imgLocalPath
                    }]
                }, `<h1>${p.name}</h1><a href='${p.href}'><img src='${p.imgSrc}'></a>`);
            } else {
                console.log(`Product already exists: ${p.name}`);
            }
        });

    return output;
}

async function main() {
    await fs.remove(OUTPUT_PATH);

    const URLS_JSON_FILE = process.argv[2];
    const OLD_URLS_JSON_FILE = process.argv[3];
    const urls = await fs.readJson(URLS_JSON_FILE);
    let oldurls = {};
    if (OLD_URLS_JSON_FILE) {
        oldurls = await fs.readJson(OLD_URLS_JSON_FILE);
    }

    await asyncForKey(urls, async (year) => {
        const us = urls[year].filter((u) => !oldurls[year] || oldurls[year].indexOf(u) === -1);
        await asyncForEach(await getPages(us), async (resource) => {
            // encoding issue, do not use resource.text
            const text = await fs.readFile(`${resource.localPath}`, 'utf8');
            const dom = new JSDOM(text);
            const { document } = dom.window;
            const $ = jquery(document.defaultView);
            
            const $main = $('.main-content');

            // remove all existing hr to avoid section collisions
            $main.find('hr').remove();

            // remove all hidden elements
            $main.find('.hidden-md-down, .hidden-xs-down').remove();

            // add a thematic break after first titles
            $('<hr>').insertAfter($('.article-header'));

            // add a thematic break after hero banner
            const $heroHr = $('<hr>').insertAfter($('.article-hero'));

            $('<hr>').insertAfter($heroHr);
            const nodes = await handleAuthor($);
            let previous = $heroHr;
            nodes.forEach((n) => {
                n.insertAfter(previous);
                previous = n;
            });
            
            const topics = await handleTopics($);
            const products = await handleProducts($, path.parse(resource.localPath).dir, path.parse(resource.localPath).name);

            const $topicsWrap = $('<p>');
            $topicsWrap.html(`Topics: ${topics}`);
            const $productsWrap = $('<p>');
            $productsWrap.html(`Products: ${products}`);

            $main.append($topicsWrap);
            $main.append($productsWrap);
            $('<hr>').insertBefore($topicsWrap);

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
