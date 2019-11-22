const jquery = require("jquery");
const unified = require("unified");
const parse = require('rehype-parse')
const rehype2remark = require('rehype-remark')
const stringify = require('remark-stringify')
const jsdom = require("jsdom");
const fs = require('fs').promises;

const { JSDOM } = jsdom;

const OUTPUT_PATH = 'content/output'
const OUTPUT_AUTHORS = `${OUTPUT_PATH}/authors`;
const OUTPUT_POSTS = `${OUTPUT_PATH}/posts`;
const OUTPUT_PRODUCTS = `${OUTPUT_PATH}/products`;
const OUTPUT_TOPICS = `${OUTPUT_PATH}/topics`;

async function getBlogPages() {
    // TODO: fetch directly from website
    return [{
        html: await fs.readFile('content/input/b1.html', 'utf8'),
        name: 'b1',
    }, {
        html: await fs.readFile('content/input/b2.html', 'utf8'),
        name: 'b2',
    }, {
        html: await fs.readFile('content/input/b3.html', 'utf8'),
        name: 'b3',
    }]
}

async function createPost(content) {
    unified()
        .use(parse, { emitParseErrors: true, duplicateAttribute: false })
        .use(rehype2remark)
        .use(stringify)
        .process(content, async function(err, file) {
            if (err) {
                console.error(err);
            } else {
                // TODO deal with images
                await fs.writeFile(`${OUTPUT_POSTS}/${name}.md`, file.contents);
                console.log(`${OUTPUT_POSTS}/${name}.md file created`);
            }
        });
}

async function main() {
    (await getBlogPages()).forEach((page) => {
        const { name, html } = page;

        const dom = new JSDOM(html);
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

        createPost();
    });
}

main();
