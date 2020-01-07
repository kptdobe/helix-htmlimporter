const unified = require("unified");
const parse = require('rehype-parse');
const rehype2remark = require('rehype-remark');
const stringify = require('remark-stringify');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const scrape = require('website-scraper');
const byTypeFilenameGenerator = require('website-scraper/lib/filename-generator/by-type');
const SaveToExistingDirectoryPlugin = require('website-scraper-existing-directory');

const { asyncForEach } = require('./utils');

async function getPages(urls) {
    const options = {
        urls: urls,
        directory: await fs.mkdtemp(path.join(os.tmpdir(), 'htmlimporter-get-pages-')),
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
                    let occupiedFilenames, defaultFilename, rootDirectory;

                    registerAction('beforeStart', ({options}) => {
                        occupiedFilenames = [];
                        defaultFilename = options.defaultFilename;
                        rootDirectory = options.directory;
                    });
                    registerAction('generateFilename', async ({ resource }) => {
                        if ('index.html' === resource.filename) {
                            // replace index.html by last segment in path
                            // and remove last / if it is the last character
                            const u = resource.url.replace('/index.html','').replace(/\/$/g,'');
                            const name = u.substring(u.lastIndexOf('/') + 1, u.length);
                            resource.localPath = `${rootDirectory}/${name}.html`;
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
                        resource.localPath = `${rootDirectory}/${filename}`;
                        return { filename };
                    });
                }
            })(),
            new SaveToExistingDirectoryPlugin()
        ]
    };
    
    console.log(`Starting to scrape urls ${urls.join(',')}`);
    const result = await scrape(options);
    console.log(`Done with scraping. Downloaded ${result.length} page(s).`);

    return result;
};

async function createMarkdownFile(directory, name, content, links = []) {
    console.log(`Creating a new MD file: ${directory}/${name}.md`);
    await unified()
        .use(parse, { emitParseErrors: true, duplicateAttribute: false })
        .use(rehype2remark)
        .use(stringify, { rule: '-', ruleSpaces: false })
        .process(content)
        .then(async (file) => {
            const p = `${directory}/${name}.md`;
            await fs.mkdirs(`${directory}`);
            let contents = file.contents;

            if (links && links.length > 0) {
                const folder = `${directory}/${name}`;
                await fs.mkdirs(folder);
                // copy resources (imgs...) folder
                await asyncForEach(links, async (l) => {
                    const rName = path.parse(l.url).base;
                    // try to be smart, only copy images "referenced" in the content
                    if (l.saved && file.contents.indexOf(rName) !== -1) {
                        // b64 inline images
                        const bitmap = fs.readFileSync(l.localPath);
                        const b64 = Buffer.from(bitmap).toString('base64');
                        const ext = path.parse(rName).ext;
                        contents = contents.replace(new RegExp(`${name}\/${rName.replace('.', '\\.')}`, 'g'), `data:image/${ext};base64,${b64}`);
                    }
                });
            }
            await fs.writeFile(p, contents);
            console.log(`MD file created: ${p}`);
        });
}

async function createMarkdownFileFromResource(directory, resource, content) {
    const name = path.parse(resource.filename).name
    await createMarkdownFile(directory, name, content, resource.children);
}

module.exports = { getPages, createMarkdownFile, createMarkdownFileFromResource };