const fs = require('fs-extra');
const axios = require('axios');
const cheerio = require('cheerio');

let scrapped = [];

async function scrap(url, json) {
    console.log(`Scrapping ${url}`);
    scrapped.push(url);

    try {
        const response = await axios({
            url,
            maxRedirects: 0
        });

        const $ = cheerio.load(response.data);

        const pubDate = $('[property="article:published_time"]').attr('content');
        if (pubDate) {
            // article
            const year = new Date(pubDate).getFullYear();
            // store url
            json[year] = json[year] || [];
            if (json[year].indexOf(url) === -1) {
                console.log(`Found new url ${year} ${url}`);
                json[year].push(url);
            }
        }

        // try to find links
        const links = $('body').find('a.article-link, a.prev, a.next');
        console.log(`Number of links found ${links.length}`);
        for (let i=0; i<links.length; i++) {
            const link = links[i];
            const linkUrl = link.attribs.href;
            if (scrapped.indexOf(linkUrl) === -1 && linkUrl.indexOf('theblog.adobe.com') !== -1) {
                await scrap(linkUrl, json);
            }
        }
    } catch(error) {
        console.log('Found error', error);
    }

}

async function main() {
    const URLS_JSON_FILE = process.argv[2];
    const urls = await fs.readJson(URLS_JSON_FILE);

    for(let y in urls) {
        scrapped = scrapped.concat(urls[y]);
    }

    await scrap('https://theblog.adobe.com/', urls);
    await fs.writeJson(URLS_JSON_FILE, urls);
}

main();