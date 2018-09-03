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

async function download(file) {
    const response = await storage
        .bucket(bucket)
        .file(file)
        .download();

    return response[0];
}

async function list(path) {
    var options = {};
    if (path && path != '/') {
        path = path.startsWith('/') ? path.substr(1) + '/' : path;
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
                path: f.name,
                readable: 1,
                writable: 1
            }
        };

        if (!isSubfolder(f.name, path)) {
            if (path != f.name) {
                files.push(file);
            }
        }
    });
    console.log(files);
    return files;
}

function isSubfolder(folder, path) {
    const relativeName = path ? folder.substr(path.length + 1) : folder;
    const subfolder = relativeName.match(/\//g);
    if (subfolder != null && subfolder.length > 1) return true;
    return false;
}

module.exports = {
    create,
    list,
    download
};