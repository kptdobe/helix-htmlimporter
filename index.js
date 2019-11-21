const jquery = require("jquery");
const unified = require("unified");
const parse = require('rehype-parse')
const rehype2remark = require('rehype-remark')
const stringify = require('remark-stringify')
const jsdom = require("jsdom");
const fs = require('fs').promises;

const { JSDOM } = jsdom;


async function main() {
    const html = await fs.readFile('content/input/b1.html', 'utf8');
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

    unified()
        .use(parse, { emitParseErrors: true, duplicateAttribute: false })
        .use(rehype2remark)
        .use(stringify)
        .process(content, async function(err, file) {
            if (err) {
                console.error(err);
            } else {
                console.log(String(file))
                await fs.writeFile('content/output/b1.md', file.contents);
            }
        });
}

main();
