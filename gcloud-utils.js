// Imports the Google Cloud client library
const Storage = require('@google-cloud/storage');
const projectId = process.env.GCLOUD_PROJECT_ID;
const bucket = process.env.GCLOUD_BUCKET;


// Creates a client
const storage = new Storage({
  projectId: projectId,
});

async function create(file, path) {
    const response = await storage
        .bucket(bucket)
        .upload(file, {
            destination: path + file,
        });
    return response;
}

async function list(path) {
    var options = {};
    if (path) {
        options = {
            prefix: path
        };
    }

    const response = await storage
        .bucket(bucket)
        .getFiles(options);

    const files = [];
    response[0].forEach(f => {
        const type = f.name.endsWith('/') ? 'folder': 'file';
        var name = '';
        if (type == 'folder') {
            name = f.name.split('/').reverse()[1];
        } else {
            name = f.name.substring(f.name.lastIndexOf('/') + 1);
        }
        const file = {
            id: f.name,
            type: type,
            attributes: {
                name: name,
                readable: 1,
                writable: 1
            }
        };
        files.push(file);
    });

    return files;
}

module.exports = {
    create,
    list
};