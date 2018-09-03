/**
 * Created by Joshua.Austill on 8/11/2016.
 * Modified by Desmond Kyeremeh
 */
/*
TODO: API functions to integrate
	seekfolder
	summarize
	extract
*/
var config;
const express = require('express');
const fs = require('fs');
const paths = require('path');
const multer = require('multer');
paths.posix = require('path-posix');

const router = express.Router(); // eslint-disable-line
const upload = multer({dest: 'public/'});

const gcloud = require('./gcloud-utils');

module.exports = (__appRoot, configPath) => { // eslint-disable-line max-statements
	//Init config
	if ( typeof( configPath ) == "string" ) {
		config = require(configPath);
	}
	else if( typeof( configPath ) == "object"  ){
		config = configPath;
	}

	// finally, our main route handling that calls the above functions :)
	router.get('/', async (req, res) => { // eslint-disable-line complexity
		const mode = req.query.mode;
		const path = req.query.path;

		switch (mode.trim()) {
			case 'initiate':
				respond(res, {
                    data: {
                        id: "/",
                        type: mode ,
                        attributes: {
                            config: {
                                security: {
									readOnly: false,
									extensions: {
										policy: 'DISALLOW_LIST',
										ignoreCase: true,
										restrictions: []
									}
								},
                                upload: config.upload
                            }
                        }
                    }
				});
			break;
			case 'getinfo':
				var results = await gcloud.list(path);				
				respond(res, {
						data: results
				});
			break;
			case 'readfolder':
				var folderPath = path == '/' ? '' : path;
				var results = await gcloud.list(folderPath);				
				respond(res, {
						data: results
				});
			break;
			case 'getimage':
				parsePath(path, (pp) => {
					res.sendFile(paths.resolve(pp.osFullPath));
				}); // parsePath
			break;
			case 'readfile':
				//const file = await gcloud.listFile(path);				
				res.sendFile();
			break;
			case 'download':
			const file = await gcloud.listFile(path);
				res.setHeader('content-type', 'text/html; charset=UTF-8');
				res.setHeader('content-description', 'File Transfer');
				res.setHeader('content-disposition', 'attachment; filename="' + file.name + '"');
				res.sendFile(file);
			break;
			case 'addfolder':
				parsePath(path, (pp) => {
					addfolder(pp, req.query.name, (result) => {
						respond(res, {
							data: result
						});
					}); // addfolder
				}); // parsePath
			break;
			case 'delete':
				parsePath(path, (pp) => {
					deleteItem(pp, (result) => {
						respond(res, {
							data: result
						});
					}); // parsePath
				}); // parsePath
			break;
			case 'rename':
				parsePath(req.query.old, (opp) => {
					const newPath = paths.posix.parse(opp.uiPath)
						.dir;
					const newish = paths.posix.join(newPath, req.query.new);

					parseNewPath(newish, (npp) => {
						rename(opp, npp, (result) => {
							respond(res, {
								data: result
							});
						}); // rename
					}); // parseNewPath
				}); // parsePath
			break;
			case 'move':
				parsePath(req.query.old, (opp) => {
					parseNewPath(paths.posix.join('/', req.query.new, opp.filename), (npp) => {
						rename(opp, npp, (result) => {
							respond(res, {
								data: result
							});
						}); // rename
					}); // parseNewPath
				}); // parsePath
			break;
			case 'copy':
				parsePath(req.query.source, (opp) => {
					parseNewPath(paths.posix.join('/', req.query.target, opp.filename), (npp) => {
						copy(opp, npp, (result) => {
							respond(res, {
								data: result
							});
						}); // rename
					}); // parseNewPath
				}); // parsePath
			break;
			default:
				// eslint-disable-next-line no-console
				console.log('no matching GET route found with mode: \'', mode.trim(), '\' query -> ', req.query);
				respond(res, {
					Code: 0
				});
		} // switch
	}); // get

	router.post('/', upload.array('files', config.upload.maxNumberOfFiles), (req, res) => {
		const mode = req.body.mode;
		const path = req.body.path;
		switch (mode.trim()) {
			case 'upload':
				parsePath(req.body.path, (pp) => {
					savefiles(pp, req.files, (result) => {
						respond(res, {
							data: result
						});
					}); // savefiles
				}); // parsePath
			break;
			case 'savefile':
				parsePath(path, (pp) => {
					getinfo(pp, (result) => {
						fs.writeFile(paths.resolve(pp.osFullPath), req.body.content, (error) => {
							if (error) {
								res.status(500)
									.send(error);
							}
							fs.readFile(paths.resolve(pp.osFullPath), (err, f) => {
								if (err) {
									res.status(500)
										.send(err);
								}
								result.attributes.content = f.toString();
								respond(res, {
									data: result
								});
							});
						});
					}); // getinfo
				}); // parsePath
			break;
			default:
				// eslint-disable-next-line no-console
				console.log("no matching POST route found with mode: '", mode.trim(), '\' query -> ', req.query);
				respond(res, {
					Code: 0
				});
		} // switch
	}); // post



	// We will handle errors consistently by using a function that returns an error object
	function errors(err) {
		const error = err || {}; // This allows us to call errors and just get a default error
		return {
			Error: error.Error,
			nodeCode: error.errno,
			Code: -1,
		}; // return
	} // errors

	// This is a seperate function because branch new files are uploaded and won't have an existing file
	// to get information from
	function parseNewPath(inputPath, callback) {
		let path = inputPath;
		const parsedPath = {};
		const fileRoot = config.options.fileRoot || '';
		parsedPath.uiPath = path;

		// if the passed in path isn't in the fileRoot path, make it so
		// This should go away and every path should be relative to the fileRoot
		if (path.substring(0, fileRoot.length) !== fileRoot) {
			path = paths.posix.join(fileRoot, path);
		}

		parsedPath.relativePath = paths.posix.normalize(path);
		parsedPath.filename = paths.posix.basename(parsedPath.relativePath);
		parsedPath.osRelativePath = paths.normalize(path);
		parsedPath.osExecutionPath = __appRoot;
		parsedPath.osFullPath = paths.join(parsedPath.osExecutionPath, parsedPath.osRelativePath);
		parsedPath.osFullDirectory = paths.parse(parsedPath.osFullPath)
			.dir;
		callback(parsedPath);
	} // parseNewPath

	// because of windows, we are going to start by parsing out all the needed path information
	// this will include original values, as well as OS specific values
	function parsePath(path, callback) {
		parseNewPath(path, (parsedPath) => {
			fs.stat(parsedPath.osFullPath, (err, stats) => {
				if (err) {
					callback(errors(err));
				} else if (stats.isDirectory()) {
					parsedPath.isDirectory = true;
					parsedPath.stats = stats;
					callback(parsedPath);
				} else if (stats.isFile()) {
					parsedPath.isDirectory = false;
					parsedPath.stats = stats;
					callback(parsedPath);
				} else {
					callback(errors(err));
				}
			});
		}); // parseNewPath
	} // parsePath

	// This function will create the return object for a file.  This keeps it consistent and
	// adheres to the DRY principle
	function fileInfo(pp, callback) {
		const result = {
			id: pp.uiPath,
			type: 'file',
			attributes: {
				created: pp.stats.birthtime,
				modified: pp.stats.mtime,
				name: pp.filename,
				path: pp.uiPath,
				readable: 1,
				writable: 1,
				timestamp: '',
			},
		};
		callback(result);
	} // fileInfo

	// This function will create the return object for a directory.  This keeps it consistent and
	// adheres to the DRY principle
	function directoryInfo(pp, callback) {
		const result = {
			id: pp.uiPath.replace(/([\s\S^/])\/?$/, '$1/'),
			type: 'folder',
			attributes: {
				created: pp.stats.birthtime,
				modified: pp.stats.mtime,
				name: pp.filename,
				path: pp.uiPath.replace(/([\s\S^/])\/?$/, '$1/'),
				readable: 1,
				writable: 1,
				timestamp: '',
			},
		};
		callback(result);
	} // directoryInfo

	// Here we get the information for a folder, which is a content listing

	// This function exists merely to capture the index and and pp(parsedPath) information in the for loop
	// otherwise the for loop would finish before our async functions
	function getIndividualFileInfo(pp, files, loopInfo, callback, $index) {
		parsePath(paths.posix.join(pp.uiPath, files[$index]), (ipp) => {
			getinfo(ipp, (result) => {
				loopInfo.results.push(result);
				if (loopInfo.results.length === loopInfo.total) {
					callback(loopInfo.results);
				} // if
			}); // getinfo
		}); // parsePath
	} // getIndividualFileInfo

	function readfolder(pp, callback) {
		fs.readdir(pp.osFullPath, (err, files) => {
			if (err) {
				console.log('err -> ', err); // eslint-disable-line no-console
				callback(errors(err));
			} else {
				const loopInfo = {
					results: [],
					total: files.length,
				};

				if (loopInfo.total === 0) {
					callback(loopInfo.results);
				}

				for (let i = 0; i < loopInfo.total; i++) {
					getIndividualFileInfo(pp, files, loopInfo, callback, i);
				} // for
			} // if
		}); // fs.readdir
	} // getinfo

	// function to delete a file/folder
	function deleteItem(pp, callback) {
		if (pp.isDirectory === true) {
			fs.rmdir(pp.osFullPath, (err) => {
				if (err) {
					callback(errors(err));
				} else {
					directoryInfo(pp, callback);
				} // if
			}); // fs.rmdir
		} else {
			fs.unlink(pp.osFullPath, (err) => {
				if (err) {
					callback(errors(err));
				} else {
					fileInfo(pp, callback);
				} // if
			}); // fs.unlink
		} // if
	} // deleteItem

	// function to add a new folder
	function addfolder(pp, name, callback) {
		fs.mkdir(paths.join(pp.osFullPath, name), (err) => {
			if (err) {
				callback(errors(err));
			} else {
				const result = {
					id: `${pp.relativePath}${name}/`,
					type: 'folder',
					attributes: {
						name,
						created: pp.stats.birthtime,
						modified: pp.stats.mtime,
						path: `${pp.relativePath}${name}/`,
						readable: 1,
						writable: 1,
						timestamp: '',
					},
				};
				callback(result);
			} // if
		}); // fs.mkdir
	} // addfolder

	// function to save uploaded files to their proper locations
	function renameIndividualFile(loopInfo, files, pp, callback, $index) {
		if (loopInfo.error === false) {
			// const oldfilename = paths.join(__appRoot, files[$index].path);
			const oldfilename = paths.resolve(files[$index].path);
			// new files comes with a directory, replaced files with a filename.  I think there is a better way to handle this
			// but this works as a starting point
			const newfilename = paths.join(
				__appRoot,
				pp.isDirectory ? pp.relativePath : '',
				pp.isDirectory ? files[$index].originalname : pp.filename
			); // not sure if this is the best way to handle this or not

			fs.rename(oldfilename, newfilename, (err) => {
				if (err) {
					loopInfo.error = true;
					console.log('savefiles error -> ', err); // eslint-disable-line no-console
					callback(errors(err));
					return;
				}
				const name = paths.parse(newfilename)
					.base;
				const result = {
					id: `${pp.relativePath}${name}`,
					type: 'file',
					attributes: {
						name,
						created: pp.stats.birthtime,
						modified: pp.stats.mtime,
						path: `${pp.relativePath}${name}`,
						readable: 1,
						writable: 1,
						timestamp: '',
					},
				};
				loopInfo.results.push(result);
				if (loopInfo.results.length === loopInfo.total) {
					callback(loopInfo.results);
				}
			}); // fs.rename
		} // if not loop error
	} // renameIndividualFile

	function savefiles(pp, files, callback) {
		const loopInfo = {
			results: [],
			total: files.length,
			error: false,
		};
		
		console.log(files, files.length)

		for (let i = 0; i < loopInfo.total; i++) {
			renameIndividualFile(loopInfo, files, pp, callback, i);
		} // for
	} // savefiles

	// function to rename files
	function rename(old, newish, callback) {
		fs.rename(old.osFullPath, newish.osFullPath, (err) => {
			if (err) {
				callback(errors(err));
			} else {
				const name = paths.parse(newish.osFullPath)
					.base;
				const result = {
					id: `${newish.relativePath}`,
					type: 'file',
					attributes: {
						name,
						created: '',
						modified: '',
						path: `${newish.relativePath}`,
						readable: 1,
						writable: 1,
						timestamp: '',
					},
				};
				callback(result);
			} // if
		}); // fs.rename
	} // rename

	// function to copy files
	function copy(source, target, callback) {
		fs.readFile(source.osFullPath, (err, file) => {
			if (err) {
				callback(errors(err));
				return;
			}
			fs.writeFile(target.osFullPath, file, (error) => {
				if (err) {
					callback(errors(error));
					return;
				}
				const name = paths.parse(target.osFullPath)
					.base;
				const result = {
					id: `${target.relativePath}`,
					type: 'file',
					attributes: {
						name,
						created: '',
						modified: '',
						path: `${target.relativePath}`,
						readable: 1,
						writable: 1,
						timestamp: '',
					},
				};
				callback(result);
			});
		});
	} // copy

	// RichFilemanager expects a pretified string and not a json object, so this will do that
	// This results in numbers getting recieved as 0 instead of '0'
	function respond(res, obj) {
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(obj));
	} // respond

	return router;
}; // module.exports