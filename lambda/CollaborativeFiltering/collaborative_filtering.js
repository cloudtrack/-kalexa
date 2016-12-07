var aws = require('aws-sdk');
var async = require('async');
var lambda = new aws.Lambda({
	  region: 'us-east-1'
});

const db = new aws.DynamoDB.DocumentClient();
const S3_PREFIX = 'https://s3.amazonaws.com/kpopmusic/';
const DEFAULT_SONG = 3929469;


function getMostPlayedSongInPlaylist(songs) {
	var songCount = {};
	songs.forEach(function(song, idx) {
		var songId = song.songId;
		if(songCount[songId]) songCount[songId] += 1;
		else songCount[songId] = 1;
	});
	var mostPlayedSong, maxCount = 0;
	Object.keys(songCount).forEach(function(key, idx) {
		if(maxCount < songCount[key]) {
			maxCount = songCount[key];
			mostPlayedSong = key;
		}
	})
	if(!mostPlayedSong) mostPlayedSong = DEFAULT_SONG;
	return mostPlayedSong;
}

function getFavoriteArtistInPlaylist(songs) {
	var songCount = {};
	songs.forEach(function(song, idx) {
		var artistId = song.artistId;
		if(songCount[artistId]) songCount[artistId] += 1;
		else songCount[artistId] = 1;
	});
	var mostPlayedSong, maxCount = 0;
	Object.keys(songCount).forEach(function(key, idx) {
		if(maxCount < songCount[key]) {
			maxCount = songCount[key];
			mostPlayedSong = key;
		}
	})
	if(!mostPlayedSong) mostPlayedSong = DEFAULT_SONG;
	return mostPlayedSong;
}

exports.handler = function(event, context, callback) {
	var userId = event.userId;
	var songId = DEFAULT_SONG; // default songs
	async.waterfall([
		function(cb) {
			var playlistType = Math.floor(Math.random()*3); // 3 recommendations
			console.log('playlist', playlistType);
			if(playlistType === 0) { // random user's playlist
				db.scan({ 
					TableName : 'kpop_playlist'
				}, function(err, data) {
					if(err) {
						cb(null); // default song
					}
					var playlists = data.Items;
					var random_idx = Math.floor(Math.random()*playlists.length);
					
					var playlist = playlists[random_idx];
					if(playlist && playlist.songs) { // 
						var songs = playlist.songs;
						cb(null, songs);
					} else {
					    cb(null); // default song
					}
				});
			} else if(playlistType === 1) { // same favorite song user's
				db.scan({ 
					TableName : 'kpop_playlist'
				}, function(err, data) {
					if(err) {
						cb(null); // default song
					}
					var playlists = data.Items;
					var mostPlayedSong = DEFAULT_SONG;
					// get current user's most played song
					playlists.forEach(function(p, idx) {
						if(p.userId === userId) { 
							mostPlayedSong = getMostPlayedSongInPlaylist(p.songs);
							delete playlists[idx];
						}
					});

					var recommendUserIdx = 0;
					// find user whose most played song issame as current user's
					playlists.forEach(function(p, idx) {
						var userMostPlayed = getMostPlayedSongInPlaylist(p.songs);
						if(userMostPlayed === mostPlayedSong)
							recommendUserIdx = idx;
					});
					var playlist = playlists[recommendUserIdx];
					if(playlist && playlist.songs) { // 
						var songs = playlist.songs;

						// remove most played song from the list, to prevent recommendation is same all the time
						songs.forEach(function(song, idx) {
							if(song.songId === mostPlayedSong) delete songs[idx];
						});
						cb(null, songs);
					} else {
					    cb(null); // default song
					}
				});
			} else { // same favoirte artist user's
				db.scan({ 
					TableName : 'kpop_playlist'
				}, function(err, data) {
					if(err) {
						cb(null); // default song
					}
					var playlists = data.Items;
					var favoriteArtist;
					// get current user's most played song
					playlists.forEach(function(p, idx) {
						if(p.userId === userId) { 
							favoriteArtist = getFavoriteArtistInPlaylist(p.songs);
							delete playlists[idx];
						}
					});

					var recommendUserIdx = 0;
					// find user whose favorite artist is same as current user's
					playlists.forEach(function(p, idx) {
						var userFavoriteArtist = getFavoriteArtistInPlaylist(p.songs);
						if(userFavoriteArtist === favoriteArtist)
							recommendUserIdx = idx;
					});
					var playlist = playlists[recommendUserIdx];
					if(playlist && playlist.songs) { // 
						var songs = playlist.songs;
						cb(null, songs);
					} else {
					    cb(null); // default song
					}
				});
			}
		}, function(songs, cb) {
		    console.log('songs', songs)
			if(songs) {
				var type = Math.floor(Math.random() * 3);
				console.log('song type', type);
				if(type === 0) { // most recent played
					songId = songs[songs.length - 1].songId;
				} else if(type === 1) { // random
				    var random_idx = Math.floor(Math.random()*songs.length);
					songId = songs[random_idx].songId;
				} else { // most played
					songId = getMostPlayedSongInPlaylist(songs);
				}
				cb(null);
			} else {
				cb(null); // default song
			}
		}
	], function(err, result) {
		if(err) {
			console.log(err);
			context.done('error', err);
		}
		context.succeed(S3_PREFIX + songId+ '.mp3');
	});
}

//exports.handler();

