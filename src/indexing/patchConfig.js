const shell = require('shelljs');
const path = require('path');
const fs = require('fs-extra');

const root = process.argv[2];
const paramsPath = process.argv[3];

async function main() {
    const paths = [];

    shell.ls(`*.md`).forEach(function (file) {
        const name = path.parse(file).name;
        paths.push(`${root}/${name}.html`);
    });

    console.log(`Found ${paths.length} md files`);

    console.log(`Loading params.json config at: ${paramsPath}`);
    const params = await fs.readJson(paramsPath);
    params.paths = paths;
    await fs.writeJson(paramsPath, params);
}

main();
