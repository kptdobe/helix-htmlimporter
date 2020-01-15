const fs = require('fs-extra');
const mime = require('mime-types');
const path = require('path');

require('dotenv').config()

const BlogHandler = require('../BlogHandler');

let blobHandler;

if (process.env.AZURE_BLOB_SAS && process.env.AZURE_BLOB_URI) {
    blobHandler = new BlogHandler({
        azureBlobSAS: process.env.AZURE_BLOB_SAS,
        azureBlobURI: process.env.AZURE_BLOB_URI,
    });
}

async function getBlobURI(handler, buffer, contentType) {
    const blob = handler.createExternalResource(buffer, contentType);
    const exists = await handler.checkBlobExists(blob);
    if (!exists) {
        await handler.upload(blob);
    }
    return blob;
}

async function main() {
    if (blobHandler) {
        // if blob handler is defined, upload image and update reference
        const fileName = process.argv[2];
        const bitmap = fs.readFileSync(fileName);
        console.log(`Read file ${fileName}`);
        const ext = path.parse(fileName).ext.replace('.', '');

        const externalResource = await getBlobURI(blobHandler, Buffer.from(bitmap), mime.lookup(ext));
        
        console.log(`Successfully uploaded as ${externalResource.uri}`);
    } else {
        console.error('No Azure config provided');
    }
}

main();