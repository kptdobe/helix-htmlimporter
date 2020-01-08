const fs = require('fs-extra');
const rp = require('request-promise-native');

require('dotenv').config()

const GOOGLE_API = 'https://www.googleapis.com/customsearch/v1';

async function getPagedResult(start, lowRange) {
    try {
        return await rp({
            uri: GOOGLE_API,
            method: 'GET',
            qs: {
                key: process.env.GOOGLE_API_KEY,
                cx: process.env.GOOGLE_API_CX,
                q: 'site:theblog.adobe.com',
                exactTerms: 'min read',
                start,
                lowRange,
            },
            json: true
        });
    } catch(err) {
        console.log('error in request', err.message);
        console.debug(err, start);
        return null;
    }
}


async function main() {

    const URLS_JSON_FILE = 'content/urls.json';

    const urls = await fs.readJson(URLS_JSON_FILE);

    let index = 1;
    let lowRange = 900

    while (index > 0) {
        const ret = await getPagedResult(index, lowRange);

        if (ret && ret.items && ret.queries) {
            totalResults = parseInt(ret.searchInformation.totalResults);

            ret.items.forEach((item) => {
                const year = new Date(item.pagemap.metatags[0]['article:published_time']).getFullYear();
                urls[year] = urls[year] || [];
                if (urls[year].indexOf(item.link) === -1) {
                    console.log(`Found new url ${item.link}`);
                    urls[year].push(item.link);
                } else {
                    //console.log(`Found duplicate ${item.link}`);
                }
            });

            const np = ret.queries.nextPage;
            index =  np && np.length > 0 ? np[0].startIndex : -1;
            if (index > 100) {
                // lowRange += 100;
                // index = 1;
                index = -1;
            }
        } else {
            index = -1;
        }
    }

    await fs.writeJson(URLS_JSON_FILE, urls);
}

main();