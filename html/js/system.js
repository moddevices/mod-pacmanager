/*
 * Copyright 2012-2013 AGR Audio, Industria e Comercio LTDA. <contato@portalmod.com>
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * This handles software upgrade. Steps are:
 *   - Synchronize package database
 *   - 
 */

function Installer(options) {
    var self = this

    options = $.extend({
	// This is usually defined, but let's have it hardcoded here anyway
	repository: 'http://packages.portalmod.com/api', 
	// The address of the server where packages will be installed. Empty is
	// ok if the interface is being served by the package server
	localServer: '',
	reportStatus: function(status) {}
    }, options)

    this.update = function(callback) {
	var trans = new Transference(options.repository,
				     options.localServer + '/system/update',
				     'mod.db.tar.gz');
	trans.reportFinished = callback
	trans.start()
    }

    this.checkUpgrade = function(callback) {
	this.update(function() {
	    $.ajax({
		method: 'get',
		url: options.localServer + '/system/upgrade/dependencies',
		success: function(packages) {
		    callback(packages)
		},
		dataType: 'json'
	    })
	})
    }

    this.upgrade = function(callback) {
	this.checkUpgrade(function(packages) {
	    self.download(packages, function() {
		self.doUpgrade(callback) 
	    })
	})
    }

    this.doUpgrade = function(callback) {
	$.ajax({
	    method: 'get',
	    url: options.localServer + '/system/upgrade',
	    success: callback,
	})
    }

    this.install = function(packageName, callback) {
	this.update(function() {
	    $.ajax({
		method: 'get',
		url: options.localServer + '/system/package/dependencies/'+packageName,
		success: function(packages) {
		    self.download(packages, 
				  function() {
				      self.doInstall(packageName, callback)
				  })
		},
		dataType: 'json'
	    })
	})
    }

    this.doInstall = function(packageName, callback) {
	$.ajax({
	    method: 'get',
	    url: options.localServer + '/system/package/install/'+packageName,
	    success: callback
	})
    }

    this.download = function(packages, callback) {
	self.downloadQueue = packages
	var totalFiles = packages.length
	var fileNum = 0
	var processNext = function() {
	    if (self.downloadQueue.length == 0) {
		return callback()
	    }
	    var fileName = self.downloadQueue.shift()
	    fileNum += 1
	    var trans = new Transference(options.repository,
					 options.localServer + '/system/package/download',
					 fileName)
	    trans.reportFinished = processNext
	    trans.reportStatus = function(status) {
		status.totalFiles = totalFiles
		status.numFile = fileNum
		status.currentFile = fileName
		options.reportStatus(status)
	    }
	    trans.start()
	}
	processNext()
    }

    this.downloadQueue = []
}
