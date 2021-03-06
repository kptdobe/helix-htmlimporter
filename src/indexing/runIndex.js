const shell = require('shelljs');
const path = require('path');
const openwhisk = require('openwhisk');

const { asyncForEach } = require('../utils');

require('dotenv').config();

let sleep = require('util').promisify(setTimeout);

const ow = openwhisk({
    apihost: process.env.__OW_API_HOST,
    api_key: process.env.__OW_API_KEY,
    namespace: process.env.__OW_NAMESPACE,
});

const folder = process.argv[2];
const root = process.argv[3];

async function main() {
    const paths = [];

    shell.cd(folder);
    shell.ls(`*.md`).forEach(function (file) {
        const name = path.parse(file).name;
        paths.push(`${root}/${name}.html`);
    });

    console.log(`Found ${paths.length} md files`);


    do {
        let spliced = paths.splice(0, 20);
        try {
            console.log(`Triggering indexing for a batch of ${spliced.length} url(s).`);
            const result = await ow.actions.invoke({
                name: '/helix-index/helix-services/index-files@latest',
                blocking: true,
                result: true,
                params: {
                    'owner': 'davidnuescheler',
                    'repo': 'theblog',
                    'ref': 'master',
                    'branch': 'master',
                    paths: spliced,
                    'namespace': 'helix-index',
                    'package': 'index-pipelines',
                    'sha': 'initial'
                }
            });
            const errors = result.body.results.filter((r) => r.status !== 201);
            if (errors.length === 0) {
                console.log(`Indexing successful`);
            } else {
                errors.forEach((e) => {
                    console.log(`Indexing failed for ${e.path}: ${e.reason}`);
                });
            }

            if (paths.length > 0) {
                const seconds = 45;
                console.log(`Sleeping ${seconds}s...`);
                await sleep(seconds * 1000);
            }
        } catch(error) {
            console.log(`Indexing request failed for ${spliced}`, error);
        }
    } while(paths.length > 0);
    console.log(`Indexing is over.`);
}

main();
