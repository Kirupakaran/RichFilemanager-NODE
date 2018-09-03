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
const multer = require('multer');

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
				var results = await gcloud.list(path);				
				respond(res, {
					data: results
				});
			break;
			case 'getimage':
				var file = await gcloud.download(path);				
				res.sendFile(file);
			break;
			case 'readfile':
				var file = await gcloud.download(path);				
				res.sendFile(file);
			break;
			case 'download':
				var file = await gcloud.download(path);
				res.setHeader('content-type', 'text/html; charset=UTF-8');
				res.setHeader('content-description', 'File Transfer');
				res.setHeader('content-disposition', 'attachment; filename="' + file.name + '"');
				res.sendFile(file);
			break;
			case 'addfolder':
				/*parsePath(path, (pp) => {
					addfolder(pp, req.query.name, (result) => {
						respond(res, {
							data: result
						});
					}); // addfolder
				}); // parsePath
				*/
			break;
			case 'delete':
				/*parsePath(path, (pp) => {
					deleteItem(pp, (result) => {
						respond(res, {
							data: result
						});
					}); // parsePath
				}); // parsePath
				*/
			break;
			case 'rename':
				/*parsePath(req.query.old, (opp) => {
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
				*/
			break;
			case 'move':
				/*parsePath(req.query.old, (opp) => {
					parseNewPath(paths.posix.join('/', req.query.new, opp.filename), (npp) => {
						rename(opp, npp, (result) => {
							respond(res, {
								data: result
							});
						}); // rename
					}); // parseNewPath
				}); // parsePath
				*/
			break;
			case 'copy':
				/*parsePath(req.query.source, (opp) => {
					parseNewPath(paths.posix.join('/', req.query.target, opp.filename), (npp) => {
						copy(opp, npp, (result) => {
							respond(res, {
								data: result
							});
						}); // rename
					}); // parseNewPath
				}); // parsePath
				*/
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
				/*parsePath(req.body.path, (pp) => {
					savefiles(pp, req.files, (result) => {
						respond(res, {
							data: result
						});
					}); // savefiles
				}); // parsePath
				*/
			break;
			case 'savefile':
				/*parsePath(path, (pp) => {
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
				*/
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

	} // getIndividualFileInfo

	function readfolder(pp, callback) {
		
	} // getinfo

	// function to delete a file/folder
	function deleteItem(pp, callback) {
		
	} // deleteItem

	// function to add a new folder
	function addfolder(pp, name, callback) {
		
	} // addfolder

	// function to save uploaded files to their proper locations
	function renameIndividualFile(loopInfo, files, pp, callback, $index) {
		
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
		
	} // rename

	// function to copy files
	function copy(source, target, callback) {
		
	} // copy

	// RichFilemanager expects a pretified string and not a json object, so this will do that
	// This results in numbers getting recieved as 0 instead of '0'
	function respond(res, obj) {
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(obj));
	} // respond

	return router;
}; // module.exports