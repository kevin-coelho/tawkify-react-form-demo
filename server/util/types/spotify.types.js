/**
 * @typedef {Object} SpotifyImageObject
 * @property {number} height
 * @property {string} url
 * @property {number} width
 */

/**
 * @typedef {Object} SpotifyAlbumObject
 * @property {string} album_type "single", "ep", ...
 * @property {Array<string>} available_markets "AD", "AR", ...
 * @property {string} href https://api.spotify.com/v1/albums/5GWoXPsTQylMuaZ84PC563
 * @property {string} id 5GWoXPsTQylMuaZ84PC563
 * @property {Array<SpotifyImageObject>} images
 * @property {string} name I'm Not The Only One
 * @property {string} type album
 * @property {string} uri spotify:album:5GWoXPsTQylMuaZ84PC563
 */

/**
 * @typedef {Object} SpotifyArtistObject
 * @property {string} href https://api.spotify.com/v1/artists/2wY79sveU1sp5g7SokKOiI
 * @property {string} id 2wY79sveU1sp5g7SokKOiI
 * @property {string} name Sam Smith
 * @property {string} type artist
 * @property {string} uri spotify:artist:2wY79sveU1sp5g7SokKOiI
 */

/**
 * @typedef {Object} SpotifyTrackObject
 * @property {SpotifyAlbumObject} album
 * @property {Array<SpotifyArtistObject>} artists
 * @property {string} href https://api.spotify.com/v1/tracks/4i9sYtSIlR80bxje5B3rUb
 * @property {number} duration_ms 204732
 * @property {number} disc_number
 * @property {Array<string>} available_markets "AD", "AR", "AT", "AU", ...
 * @property {string} id 4i9sYtSIlR80bxje5B3rUb
 * @property {string} name I'm Not The Only One - Radio Edit
 * @property {number} popularity 45
 * @property {string} preview_url https://p.scdn.co/mp3-preview/dd64cca26c69e93ea78f1fff2cc4889396bb6d2f
 * @property {number} track_number
 * @property {string} type track
 * @property {string} uri spotify:track:4i9sYtSIlR80bxje5B3rUb
 *
 */

/**
 * @typedef {Object} SpotifyPlaylistTrackObject
 * @property {string} added_at 2014-09-01T04:21:28Z
 * @property {SpotifyTrackObject} track
 */

/**
 * @typedef {Object} SpotifyPagingObject
 * @property {string} href https://api.spotify.com/v1/users/spotify/playlists/59ZbFPES4DQwEjBpWHzrtC/tracks
 * @property {Array<SpotifyPlaylistTrackObject>} items
 * @property {number} limit 100
 * @property {string|null} next https://api.spotify.com/v1/users/spotify/playlists/59ZbFPES4DQwEjBpWHzrtC/tracks?offset=100&limit=100
 * @property {number} offset 0
 * @property {string|null} previous null
 * @property {number} total 105
 */

/**
 * @typedef {Object} SpotifyPlaylistObject
 * @property {string} id 59ZbFPES4DQwEjBpWHzrtC
 * @property {string} href https://api.spotify.com/v1/users/spotify/playlists/59ZbFPES4DQwEjBpWHzrtC
 * @property {Array<SpotifyImageObject>} images
 * @property {{href:string|null,total:number}} followers
 * @property {string} description Having friends over for dinner? Here´s the perfect playlist.
 * @property {boolean} collaborative false
 * @property {string} name Dinner with Friends
 * @property {SpotifyOwnerObject} owner
 * @property {string|null} public null
 * @property {string} snapshot_id bNLWdmhh+HDsbHzhckXeDC0uyKyg4FjPI/KEsKjAE526usnz2LxwgyBoMShVL+z+
 * @property {SpotifyPagingObject} tracks
 * @property {string} type playlist
 * @property {string} uri spotify:user:spotify:playlist:59ZbFPES4DQwEjBpWHzrtC
 */

/**
 * @typedef {Object} SpotifyOwnerObject
 * @property {{spotify:string}} external_urls { "spotify" : "http://open.spotify.com/user/spotify" }
 * @property {string} href https://api.spotify.com/v1/users/spotify
 * @property {string} id spotify
 * @property {string} type user
 * @property {string} uri spotify:user:spotify
 */