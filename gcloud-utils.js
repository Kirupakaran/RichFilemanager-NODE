// Imports the Google Cloud client library
const Storage = require('@google-cloud/storage');
const projectId = process.env.GCLOUD_PROJECT_ID;
const bucketName = process.env.GCLOUD_BUCKET;
const fs = require('fs');
var mkdirp = require('mkdirp');

// Creates a client
const storage = new Storage({
  projectId: projectId,
});

const bucket = storage.bucket(bucketName);

async function upload(path, file) {
    path = path == '/' ? '': path;

    const response = await bucket.upload(file.path, {
        destination: path + file.originalname,
    });

    var data = [{
        id: '/' + path + file.originalname,
        type: 'file',
        attributes: {
            name: file.originalname,
            path: '/' + path + file.originalname,
            readable: 1,
            writable: 1
        }
    }];
    return data;
}

async function download(file) {
    if (!fs.existsSync('public/temp/' + file)) {
        if (file.indexOf('/') != -1) {
            mkdirp.sync('public/temp/' + file.substring(0, file.lastIndexOf('/')));
        }
        const response = await bucket
        .file(file)
        .download({
            destination: 'public/temp/' + file,
            validation: false
        });
        return response[0];
    }
    else {
        return fs.readFileSync('public/temp/' + file);
    }
}

async function list(path) {
    var options = {};
    if (path && path != '/') {
        path = path.startsWith('/') ? path.substr(1) + '/' : path;
        options = {
            prefix: path
        };
    }

    const response = await bucket.getFiles(options);

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
                path: '/' + f.name,
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
    return files;
}

async function createFolder(path, name) {
    const folder = await bucket.file(path + name + '/').save('');
    
    const response = {
        id: path + name + '/',
        type: 'folder',
        attributes: {
            name: name,
            path: path + name + '/',
            readable: 1,
            writable: 1
        }
    };
    return response;
}

function isSubfolder(folder, path) {
    const relativeName = path ? folder.substr(path.length + 1) : folder;
    const subfolder = relativeName.match(/\//g);
    if (subfolder != null && subfolder.length > 1) return true;
    return false;
}

function getName(path) {
    return path.substring(path.lastIndexOf('/') + 1);
}

module.exports = {
    upload,
    createFolder,
    list,
    download,
    getName,
};