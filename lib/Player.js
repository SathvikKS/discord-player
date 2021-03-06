"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const events_1 = require("events");
const discord_js_1 = require("discord.js");
const Util_1 = __importDefault(require("./utils/Util"));
const AudioFilters_1 = __importDefault(require("./utils/AudioFilters"));
const Queue_1 = require("./Structures/Queue");
const Track_1 = require("./Structures/Track");
const Constants_1 = require("./utils/Constants");
const PlayerError_1 = __importDefault(require("./utils/PlayerError"));
const discord_ytdl_core_1 = __importDefault(require("discord-ytdl-core"));
const ExtractorModel_1 = require("./Structures/ExtractorModel");
const os_1 = __importDefault(require("os"));
// @ts-ignore
const spotify_url_info_1 = __importDefault(require("spotify-url-info"));
// @ts-ignore
const soundcloud_scraper_1 = require("soundcloud-scraper");
const youtube_sr_1 = __importDefault(require("youtube-sr"));
const SoundCloud = new soundcloud_scraper_1.Client();
/**
 * The Player class
 * @extends {EventEmitter}
 */
class Player extends events_1.EventEmitter {
    /**
     * Creates new Player instance
     * @param {DiscordClient} client The discord.js client
     * @param {PlayerOptions} options Player options
     */
    constructor(client, options) {
        super();
        /**
         * The collection of queues in this player
         * @type {DiscordCollection<Queue>}
         */
        this.queues = new discord_js_1.Collection();
        /**
         * Collection of results collectors
         * @type {DiscordCollection<DiscordCollector<DiscordSnowflake, DiscordMessage>>}
         * @private
         */
        this._resultsCollectors = new discord_js_1.Collection();
        /**
         * Collection of cooldowns timeout
         * @type {DiscordCollection<Timeout>}
         * @private
         */
        this._cooldownsTimeout = new discord_js_1.Collection();
        /**
         * The extractor model collection
         * @type {DiscordCollection<ExtractorModel>}
         */
        this.Extractors = new discord_js_1.Collection();
        /**
         * The discord client that instantiated this player
         * @name Player#client
         * @type {DiscordClient}
         * @readonly
         */
        Object.defineProperty(this, 'client', {
            value: client,
            enumerable: false
        });
        /**
         * The player options
         * @type {PlayerOptions}
         */
        this.options = Object.assign({}, Constants_1.PlayerOptions, options !== null && options !== void 0 ? options : {});
        // check FFmpeg
        void Util_1.default.alertFFmpeg();
        /**
         * Audio filters
         * @type {Object}
         */
        this.filters = AudioFilters_1.default;
        this.client.on('voiceStateUpdate', this._handleVoiceStateUpdate.bind(this));
        // auto detect @discord-player/extractor
        if (!this.options.disableAutoRegister) {
            let nv;
            // tslint:disable:no-conditional-assignment
            if ((nv = Util_1.default.require('@discord-player/extractor'))) {
                ['Attachment', 'Facebook', 'Reverbnation', 'Vimeo'].forEach((ext) => void this.use(ext, nv[ext]));
            }
        }
    }
    static get AudioFilters() {
        return AudioFilters_1.default;
    }
    /**
     * Define custom extractor in this player
     * @param {String} extractorName The extractor name
     * @param {any} extractor The extractor itself
     * @returns {Player}
     */
    use(extractorName, extractor) {
        if (!extractorName)
            throw new PlayerError_1.default('Missing extractor name!', 'PlayerExtractorError');
        const methods = ['validate', 'getInfo'];
        for (const method of methods) {
            if (typeof extractor[method] !== 'function')
                throw new PlayerError_1.default('Invalid extractor supplied!', 'PlayerExtractorError');
        }
        this.Extractors.set(extractorName, new ExtractorModel_1.ExtractorModel(extractorName, extractor));
        return this;
    }
    /**
     * Remove existing extractor from this player
     * @param {String} extractorName The extractor name
     * @returns {Boolean}
     */
    unuse(extractorName) {
        if (!extractorName)
            throw new PlayerError_1.default('Missing extractor name!', 'PlayerExtractorError');
        return this.Extractors.delete(extractorName);
    }
    /**
     * Internal method to search tracks
     * @param {DiscordMessage} message The message
     * @param {string} query The query
     * @param {boolean} [firstResult=false] If it should return the first result
     * @returns {Promise<Track>}
     * @private
     */
    _searchTracks(message, query, firstResult) {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
            let tracks = [];
            const queryType = Util_1.default.getQueryType(query);
            switch (queryType) {
                case 'soundcloud_track':
                    {
                        const data = yield SoundCloud.getSongInfo(query).catch(() => { });
                        if (data) {
                            const track = new Track_1.Track(this, {
                                title: data.title,
                                url: data.url,
                                duration: Util_1.default.buildTimeCode(Util_1.default.parseMS(data.duration)),
                                description: data.description,
                                thumbnail: data.thumbnail,
                                views: data.playCount,
                                author: data.author.name,
                                requestedBy: message.author,
                                fromPlaylist: false,
                                source: 'soundcloud',
                                engine: data
                            });
                            tracks.push(track);
                        }
                    }
                    break;
                case 'spotify_song':
                    {
                        const matchSpotifyURL = query.match(/https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:track\/|\?uri=spotify:track:)((\w|-){22})/);
                        if (matchSpotifyURL) {
                            const spotifyData = yield spotify_url_info_1.default.getData(query).catch(() => { });
                            if (spotifyData) {
                                const spotifyTrack = new Track_1.Track(this, {
                                    title: spotifyData.name,
                                    description: (_a = spotifyData.description) !== null && _a !== void 0 ? _a : '',
                                    author: (_c = (_b = spotifyData.artists[0]) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : 'Unknown Artist',
                                    url: (_e = (_d = spotifyData.external_urls) === null || _d === void 0 ? void 0 : _d.spotify) !== null && _e !== void 0 ? _e : query,
                                    thumbnail: ((_h = (_g = (_f = spotifyData.album) === null || _f === void 0 ? void 0 : _f.images[0]) === null || _g === void 0 ? void 0 : _g.url) !== null && _h !== void 0 ? _h : (_j = spotifyData.preview_url) === null || _j === void 0 ? void 0 : _j.length)
                                        ? `https://i.scdn.co/image/${(_k = spotifyData.preview_url) === null || _k === void 0 ? void 0 : _k.split('?cid=')[1]}`
                                        : 'https://www.scdn.co/i/_global/twitter_card-default.jpg',
                                    duration: Util_1.default.buildTimeCode(Util_1.default.parseMS(spotifyData.duration_ms)),
                                    views: 0,
                                    requestedBy: message.author,
                                    fromPlaylist: false,
                                    source: 'spotify'
                                });
                                if (this.options.fetchBeforeQueued) {
                                    const searchQueryString = this.options.disableArtistSearch
                                        ? spotifyTrack.title
                                        : `${spotifyTrack.title}${' - ' + spotifyTrack.author}`;
                                    const ytv = yield youtube_sr_1.default.search(searchQueryString, {
                                        limit: 1,
                                        type: 'video'
                                    }).catch((e) => { });
                                    if (ytv && ytv[0])
                                        Util_1.default.define({
                                            target: spotifyTrack,
                                            prop: 'backupLink',
                                            value: ytv[0].url
                                        });
                                }
                                tracks = [spotifyTrack];
                            }
                        }
                    }
                    break;
                case 'spotify_album':
                case 'spotify_playlist': {
                    this.emit(Constants_1.PlayerEvents.PLAYLIST_PARSE_START, null, message);
                    const playlist = yield spotify_url_info_1.default.getData(query);
                    if (!playlist)
                        return void this.emit(Constants_1.PlayerEvents.NO_RESULTS, message, query);
                    // tslint:disable-next-line:no-shadowed-variable
                    let tracks = [];
                    if (playlist.type !== 'playlist')
                        tracks = yield Promise.all(playlist.tracks.items.map((m) => __awaiter(this, void 0, void 0, function* () {
                            var _w, _x, _y, _z, _0, _1, _2, _3;
                            const data = new Track_1.Track(this, {
                                title: (_w = m.name) !== null && _w !== void 0 ? _w : '',
                                description: (_x = m.description) !== null && _x !== void 0 ? _x : '',
                                author: (_z = (_y = m.artists[0]) === null || _y === void 0 ? void 0 : _y.name) !== null && _z !== void 0 ? _z : 'Unknown Artist',
                                url: (_1 = (_0 = m.external_urls) === null || _0 === void 0 ? void 0 : _0.spotify) !== null && _1 !== void 0 ? _1 : query,
                                thumbnail: (_3 = (_2 = playlist.images[0]) === null || _2 === void 0 ? void 0 : _2.url) !== null && _3 !== void 0 ? _3 : 'https://www.scdn.co/i/_global/twitter_card-default.jpg',
                                duration: Util_1.default.buildTimeCode(Util_1.default.parseMS(m.duration_ms)),
                                views: 0,
                                requestedBy: message.author,
                                fromPlaylist: true,
                                source: 'spotify'
                            });
                            if (this.options.fetchBeforeQueued) {
                                const searchQueryString = this.options.disableArtistSearch
                                    ? data.title
                                    : `${data.title}${' - ' + data.author}`;
                                const ytv = yield youtube_sr_1.default.search(searchQueryString, {
                                    limit: 1,
                                    type: 'video'
                                }).catch((e) => { });
                                if (ytv && ytv[0])
                                    Util_1.default.define({
                                        target: data,
                                        prop: 'backupLink',
                                        value: ytv[0].url
                                    });
                            }
                            return data;
                        })));
                    else {
                        tracks = yield Promise.all(playlist.tracks.items.map((m) => __awaiter(this, void 0, void 0, function* () {
                            var _4, _5, _6, _7, _8, _9, _10, _11, _12;
                            const data = new Track_1.Track(this, {
                                title: (_4 = m.track.name) !== null && _4 !== void 0 ? _4 : '',
                                description: (_5 = m.track.description) !== null && _5 !== void 0 ? _5 : '',
                                author: (_7 = (_6 = m.track.artists[0]) === null || _6 === void 0 ? void 0 : _6.name) !== null && _7 !== void 0 ? _7 : 'Unknown Artist',
                                url: (_9 = (_8 = m.track.external_urls) === null || _8 === void 0 ? void 0 : _8.spotify) !== null && _9 !== void 0 ? _9 : query,
                                thumbnail: (_12 = (_11 = (_10 = m.track.album) === null || _10 === void 0 ? void 0 : _10.images[0]) === null || _11 === void 0 ? void 0 : _11.url) !== null && _12 !== void 0 ? _12 : 'https://www.scdn.co/i/_global/twitter_card-default.jpg',
                                duration: Util_1.default.buildTimeCode(Util_1.default.parseMS(m.track.duration_ms)),
                                views: 0,
                                requestedBy: message.author,
                                fromPlaylist: true,
                                source: 'spotify'
                            });
                            if (this.options.fetchBeforeQueued) {
                                const searchQueryString = this.options.disableArtistSearch
                                    ? data.title
                                    : `${data.title}${' - ' + data.author}`;
                                const ytv = yield youtube_sr_1.default.search(searchQueryString, {
                                    limit: 1,
                                    type: 'video'
                                }).catch((e) => { });
                                if (ytv && ytv[0])
                                    Util_1.default.define({
                                        target: data,
                                        prop: 'backupLink',
                                        value: ytv[0].url
                                    });
                            }
                            return data;
                        })));
                    }
                    if (!tracks.length)
                        return void this.emit(Constants_1.PlayerEvents.NO_RESULTS, message, query);
                    const pl = Object.assign(Object.assign({}, playlist), { tracks, duration: (_l = tracks === null || tracks === void 0 ? void 0 : tracks.reduce((a, c) => { var _a; return a + ((_a = c === null || c === void 0 ? void 0 : c.durationMS) !== null && _a !== void 0 ? _a : 0); }, 0)) !== null && _l !== void 0 ? _l : 0, thumbnail: (_o = (_m = playlist.images[0]) === null || _m === void 0 ? void 0 : _m.url) !== null && _o !== void 0 ? _o : tracks[0].thumbnail, title: (_q = (_p = playlist.title) !== null && _p !== void 0 ? _p : playlist.name) !== null && _q !== void 0 ? _q : '' });
                    this.emit(Constants_1.PlayerEvents.PLAYLIST_PARSE_END, pl, message);
                    if (this.isPlaying(message)) {
                        const queue = this._addTracksToQueue(message, tracks);
                        this.emit(Constants_1.PlayerEvents.PLAYLIST_ADD, message, queue, pl);
                    }
                    else {
                        const track = tracks[0];
                        const queue = (yield this._createQueue(message, track).catch((e) => void this.emit(Constants_1.PlayerEvents.ERROR, e, message)));
                        this.emit(Constants_1.PlayerEvents.PLAYLIST_ADD, message, queue, pl);
                        this.emit(Constants_1.PlayerEvents.TRACK_START, message, queue.tracks[0], queue);
                        tracks.shift();
                        this._addTracksToQueue(message, tracks);
                    }
                    return;
                }
                case 'youtube_playlist': {
                    this.emit(Constants_1.PlayerEvents.PLAYLIST_PARSE_START, null, message);
                    const playlist = yield youtube_sr_1.default.getPlaylist(query);
                    if (!playlist)
                        return void this.emit(Constants_1.PlayerEvents.NO_RESULTS, message, query);
                    // @ts-ignore
                    playlist.videos = playlist.videos.map((data) => {
                        var _a;
                        return new Track_1.Track(this, {
                            title: data.title,
                            url: data.url,
                            duration: Util_1.default.buildTimeCode(Util_1.default.parseMS(data.duration)),
                            description: data.description,
                            thumbnail: (_a = data.thumbnail) === null || _a === void 0 ? void 0 : _a.displayThumbnailURL(),
                            views: data.views,
                            author: data.channel.name,
                            requestedBy: message.author,
                            fromPlaylist: true,
                            source: 'youtube'
                        });
                    });
                    // @ts-ignore
                    playlist.duration = playlist.videos.reduce((a, c) => a + c.durationMS, 0);
                    // @ts-ignore
                    playlist.thumbnail = (_s = (_r = playlist.thumbnail) === null || _r === void 0 ? void 0 : _r.url) !== null && _s !== void 0 ? _s : playlist.videos[0].thumbnail;
                    // @ts-ignore
                    playlist.requestedBy = message.author;
                    Object.defineProperty(playlist, 'tracks', {
                        get: () => { var _a; return (_a = playlist.videos) !== null && _a !== void 0 ? _a : []; }
                    });
                    this.emit(Constants_1.PlayerEvents.PLAYLIST_PARSE_END, playlist, message);
                    // @ts-ignore
                    // tslint:disable-next-line:no-shadowed-variable
                    const tracks = playlist.videos;
                    if (this.isPlaying(message)) {
                        const queue = this._addTracksToQueue(message, tracks);
                        this.emit(Constants_1.PlayerEvents.PLAYLIST_ADD, message, queue, playlist);
                    }
                    else {
                        const track = tracks[0];
                        const queue = (yield this._createQueue(message, track).catch((e) => void this.emit(Constants_1.PlayerEvents.ERROR, e, message)));
                        this.emit(Constants_1.PlayerEvents.PLAYLIST_ADD, message, queue, playlist);
                        tracks.shift();
                        this._addTracksToQueue(message, tracks);
                        this.emit(Constants_1.PlayerEvents.TRACK_START, message, queue.tracks[0], queue);
                    }
                    return;
                }
                case 'soundcloud_playlist': {
                    this.emit(Constants_1.PlayerEvents.PLAYLIST_PARSE_START, null, message);
                    const data = yield SoundCloud.getPlaylist(query).catch(() => { });
                    if (!data)
                        return void this.emit(Constants_1.PlayerEvents.NO_RESULTS, message, query);
                    const res = {
                        id: data.id,
                        title: data.title,
                        tracks: [],
                        author: data.author,
                        duration: 0,
                        thumbnail: data.thumbnail,
                        requestedBy: message.author
                    };
                    for (const song of data.tracks) {
                        const r = new Track_1.Track(this, {
                            title: song.title,
                            url: song.url,
                            duration: Util_1.default.buildTimeCode(Util_1.default.parseMS(song.duration)),
                            description: song.description,
                            thumbnail: (_t = song.thumbnail) !== null && _t !== void 0 ? _t : 'https://soundcloud.com/pwa-icon-192.png',
                            views: (_u = song.playCount) !== null && _u !== void 0 ? _u : 0,
                            author: (_v = song.author) !== null && _v !== void 0 ? _v : data.author,
                            requestedBy: message.author,
                            fromPlaylist: true,
                            source: 'soundcloud',
                            engine: song
                        });
                        res.tracks.push(r);
                    }
                    if (!res.tracks.length)
                        return this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.PARSE_ERROR, message);
                    res.duration = res.tracks.reduce((a, c) => a + c.durationMS, 0);
                    this.emit(Constants_1.PlayerEvents.PLAYLIST_PARSE_END, res, message);
                    if (this.isPlaying(message)) {
                        const queue = this._addTracksToQueue(message, res.tracks);
                        this.emit(Constants_1.PlayerEvents.PLAYLIST_ADD, message, queue, res);
                    }
                    else {
                        const track = res.tracks[0];
                        const queue = (yield this._createQueue(message, track).catch((e) => void this.emit(Constants_1.PlayerEvents.ERROR, e, message)));
                        this.emit(Constants_1.PlayerEvents.PLAYLIST_ADD, message, queue, res);
                        this.emit(Constants_1.PlayerEvents.TRACK_START, message, queue.tracks[0], queue);
                        res.tracks.shift();
                        this._addTracksToQueue(message, res.tracks);
                    }
                    return;
                }
                default:
                    tracks = yield Util_1.default.ytSearch(query, { user: message.author, player: this });
            }
            if (tracks.length < 1)
                return void this.emit(Constants_1.PlayerEvents.NO_RESULTS, message, query);
            if (firstResult || tracks.length === 1)
                return resolve(tracks[0]);
            const collectorString = `${message.author.id}-${message.channel.id}`;
            const currentCollector = this._resultsCollectors.get(collectorString);
            if (currentCollector)
                currentCollector.stop();
            const collector = message.channel.createMessageCollector((m) => m.author.id === message.author.id, {
                time: 60000
            });
            this._resultsCollectors.set(collectorString, collector);
            this.emit(Constants_1.PlayerEvents.SEARCH_RESULTS, message, query, tracks, collector);
            collector.on('collect', ({ content }) => {
                if (content === 'cancel') {
                    collector.stop();
                    return this.emit(Constants_1.PlayerEvents.SEARCH_CANCEL, message, query, tracks);
                }
                if (!isNaN(content) && parseInt(content) >= 1 && parseInt(content) <= tracks.length) {
                    const index = parseInt(content, 10);
                    const track = tracks[index - 1];
                    collector.stop();
                    resolve(track);
                }
                else {
                    this.emit(Constants_1.PlayerEvents.SEARCH_INVALID_RESPONSE, message, query, tracks, content, collector);
                }
            });
            collector.on('end', (_, reason) => {
                if (reason === 'time') {
                    this.emit(Constants_1.PlayerEvents.SEARCH_CANCEL, message, query, tracks);
                }
            });
        }));
    }
    /**
     * Play a song
     * @param {DiscordMessage} message The discord.js message object
     * @param {string|Track} query Search query, can be `Player.Track` instance
     * @param {Boolean} [firstResult=false] If it should play the first result
     * @example await player.play(message, "never gonna give you up", true)
     * @returns {Promise<void>}
     */
    play(message, query, firstResult) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!message)
                throw new PlayerError_1.default('Play function needs message');
            if (!query)
                throw new PlayerError_1.default('Play function needs search query as a string or Player.Track object');
            if (this._cooldownsTimeout.has(`end_${message.guild.id}`)) {
                clearTimeout(this._cooldownsTimeout.get(`end_${message.guild.id}`));
                this._cooldownsTimeout.delete(`end_${message.guild.id}`);
            }
            if (typeof query === 'string')
                query = query.replace(/<(.+)>/g, '$1');
            let track;
            if (query instanceof Track_1.Track)
                track = query;
            else {
                if (discord_ytdl_core_1.default.validateURL(query)) {
                    const info = yield discord_ytdl_core_1.default.getBasicInfo(query).catch(() => { });
                    if (!info)
                        return void this.emit(Constants_1.PlayerEvents.NO_RESULTS, message, query);
                    if (info.videoDetails.isLiveContent && !this.options.enableLive)
                        return void this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.LIVE_VIDEO, message, new PlayerError_1.default('Live video is not enabled!'));
                    const lastThumbnail = info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1];
                    track = new Track_1.Track(this, {
                        title: info.videoDetails.title,
                        description: info.videoDetails.description,
                        author: info.videoDetails.author.name,
                        url: info.videoDetails.video_url,
                        thumbnail: lastThumbnail.url,
                        duration: Util_1.default.buildTimeCode(Util_1.default.parseMS(parseInt(info.videoDetails.lengthSeconds) * 1000)),
                        views: parseInt(info.videoDetails.viewCount),
                        requestedBy: message.author,
                        fromPlaylist: false,
                        source: 'youtube',
                        live: Boolean(info.videoDetails.isLiveContent)
                    });
                }
                else {
                    for (const [_, extractor] of this.Extractors) {
                        if (extractor.validate(query)) {
                            const data = yield extractor.handle(query);
                            if (data) {
                                track = new Track_1.Track(this, {
                                    title: data.title,
                                    description: data.description,
                                    duration: Util_1.default.buildTimeCode(Util_1.default.parseMS(data.duration)),
                                    thumbnail: data.thumbnail,
                                    author: data.author,
                                    views: data.views,
                                    engine: data.engine,
                                    source: (_a = data.source) !== null && _a !== void 0 ? _a : 'arbitrary',
                                    fromPlaylist: false,
                                    requestedBy: message.author,
                                    url: data.url
                                });
                                if (extractor.important)
                                    break;
                            }
                        }
                    }
                    if (!track)
                        track = yield this._searchTracks(message, query, firstResult);
                }
            }
            if (track) {
                if (this.isPlaying(message)) {
                    const queue = this._addTrackToQueue(message, track);
                    this.emit(Constants_1.PlayerEvents.TRACK_ADD, message, queue, queue.tracks[queue.tracks.length - 1]);
                }
                else {
                    const queue = yield this._createQueue(message, track);
                    if (queue)
                        this.emit(Constants_1.PlayerEvents.TRACK_START, message, queue.tracks[0], queue);
                }
            }
        });
    }
    /**
     * Checks if this player is playing in a server
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    isPlaying(message) {
        return this.queues.some((g) => g.guildID === message.guild.id);
    }
    /**
     * Returns guild queue object
     * @param {DiscordMessage} message The message object
     * @returns {Queue}
     */
    getQueue(message) {
        return this.queues.find((g) => g.guildID === message.guild.id);
    }
    /**
     * Sets audio filters in this player
     * @param {DiscordMessage} message The message object
     * @param {QueueFilters} newFilters Audio filters object
     * @returns {Promise<void>}
     */
    setFilters(message, newFilters) {
        return new Promise((resolve) => {
            const queue = this.queues.find((g) => g.guildID === message.guild.id);
            if (!queue)
                this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message, new PlayerError_1.default('Not playing'));
            if (queue.playing.raw.live)
                return void this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.LIVE_VIDEO, message, new PlayerError_1.default('Cannot use setFilters on livestream'));
            Object.keys(newFilters).forEach((filterName) => {
                // @ts-ignore
                queue.filters[filterName] = newFilters[filterName];
            });
            this._playStream(queue, true).then(() => {
                resolve();
            });
        });
    }
    /**
     * Sets track position
     * @param {DiscordMessage} message The message object
     * @param {Number} time Time in ms to set
     * @returns {Promise<void>}
     */
    setPosition(message, time) {
        return new Promise((resolve) => {
            const queue = this.queues.find((g) => g.guildID === message.guild.id);
            if (!queue)
                return this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            if (typeof time !== 'number' && !isNaN(time))
                time = parseInt(time);
            if (queue.playing.durationMS <= time)
                return this.skip(message);
            if (queue.voiceConnection.dispatcher.streamTime === time ||
                queue.voiceConnection.dispatcher.streamTime + queue.additionalStreamTime === time)
                return resolve();
            if (time < 0)
                this._playStream(queue, false).then(() => resolve());
            this._playStream(queue, false, time).then(() => resolve());
        });
    }
    /**
     * Sets track position
     * @param {DiscordMessage} message The message object
     * @param {Number} time Time in ms to set
     * @returns {Promise<void>}
     */
    seek(message, time) {
        return this.setPosition(message, time);
    }
    /**
     * Skips current track
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    skip(message) {
        const queue = this.getQueue(message);
        if (!queue) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            return false;
        }
        if (!queue.voiceConnection || !queue.voiceConnection.dispatcher) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.MUSIC_STARTING, message);
            return false;
        }
        queue.voiceConnection.dispatcher.end();
        queue.lastSkipped = true;
        return true;
    }
    /**
     * Moves to a new voice channel
     * @param {DiscordMessage} message The message object
     * @param {DiscordVoiceChannel} channel New voice channel to move to
     * @returns {Boolean}
     */
    moveTo(message, channel) {
        if (!channel || channel.type !== 'voice')
            return;
        const queue = this.queues.find((g) => g.guildID === message.guild.id);
        if (!queue) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            return false;
        }
        if (!queue.voiceConnection || !queue.voiceConnection.dispatcher) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.MUSIC_STARTING, message);
            return false;
        }
        if (queue.voiceConnection.channel.id === channel.id)
            return;
        queue.voiceConnection.dispatcher.pause();
        channel
            .join()
            .then(() => queue.voiceConnection.dispatcher.resume())
            .catch(() => this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.UNABLE_TO_JOIN, message));
        return true;
    }
    /**
     * Pause the playback
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    pause(message) {
        const queue = this.getQueue(message);
        if (!queue) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            return false;
        }
        if (!queue.voiceConnection || !queue.voiceConnection.dispatcher) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.MUSIC_STARTING, message);
            return false;
        }
        queue.voiceConnection.dispatcher.pause();
        queue.paused = true;
        return true;
    }
    /**
     * Resume the playback
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    resume(message) {
        const queue = this.getQueue(message);
        if (!queue) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            return false;
        }
        if (!queue.voiceConnection || !queue.voiceConnection.dispatcher) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.MUSIC_STARTING, message);
            return false;
        }
        queue.voiceConnection.dispatcher.resume();
        queue.paused = false;
        return true;
    }
    /**
     * Stops the player
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    stop(message) {
        const queue = this.getQueue(message);
        if (!queue) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            return false;
        }
        if (!queue.voiceConnection || !queue.voiceConnection.dispatcher) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.MUSIC_STARTING, message);
            return false;
        }
        queue.stopped = true;
        queue.tracks = [];
        if (queue.stream)
            queue.stream.destroy();
        queue.voiceConnection.dispatcher.end();
        if (this.options.leaveOnStop)
            queue.voiceConnection.channel.leave();
        this.queues.delete(message.guild.id);
        return true;
    }
    /**
     * Sets music volume
     * @param {DiscordMessage} message The message object
     * @param {Number} percent The volume percentage/amount to set
     * @returns {Boolean}
     */
    setVolume(message, percent) {
        const queue = this.getQueue(message);
        if (!queue) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            return false;
        }
        if (!queue.voiceConnection || !queue.voiceConnection.dispatcher) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.MUSIC_STARTING, message);
            return false;
        }
        queue.volume = percent;
        queue.voiceConnection.dispatcher.setVolumeLogarithmic(queue.calculatedVolume / 200);
        return true;
    }
    /**
     * Clears the queue
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    clearQueue(message) {
        const queue = this.getQueue(message);
        if (!queue) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            return false;
        }
        queue.tracks = queue.playing ? [queue.playing] : [];
        return true;
    }
    /**
     * Plays previous track
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    back(message) {
        const queue = this.getQueue(message);
        if (!queue) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            return false;
        }
        if (!queue.voiceConnection || !queue.voiceConnection.dispatcher) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.MUSIC_STARTING, message);
            return false;
        }
        queue.tracks.splice(1, 0, queue.previousTracks.pop());
        queue.voiceConnection.dispatcher.end();
        queue.lastSkipped = false;
        return true;
    }
    /**
     * Sets repeat mode
     * @param {DiscordMessage} message The message object
     * @param {Boolean} enabled If it should enable the repeat mode
     */
    setRepeatMode(message, enabled) {
        const queue = this.getQueue(message);
        if (!queue) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            return;
        }
        queue.repeatMode = Boolean(enabled);
        return queue.repeatMode;
    }
    /**
     * Sets loop mode
     * @param {DiscordMessage} message The message object
     * @param {Boolean} enabled If it should enable the loop mode
     * @returns {Boolean}
     */
    setLoopMode(message, enabled) {
        const queue = this.getQueue(message);
        if (!queue) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            return;
        }
        queue.loopMode = Boolean(enabled);
        return queue.loopMode;
    }
    /**
     * Returns currently playing track
     * @param {DiscordMessage} message The message object
     * @returns {Track}
     */
    nowPlaying(message) {
        const queue = this.getQueue(message);
        if (!queue) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            return;
        }
        return queue.tracks[0];
    }
    /**
     * Shuffles the queue
     * @param {DiscordMessage} message The message object
     * @returns {Queue}
     */
    shuffle(message) {
        const queue = this.getQueue(message);
        if (!queue) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            return;
        }
        const currentTrack = queue.tracks.shift();
        for (let i = queue.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
        }
        queue.tracks.unshift(currentTrack);
        return queue;
    }
    /**
     * Removes specified track
     * @param {DiscordMessage} message The message object
     * @param {Track|number} track The track object/id to remove
     * @returns {Track}
     */
    remove(message, track) {
        const queue = this.getQueue(message);
        if (!queue) {
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
            return;
        }
        let trackFound = null;
        if (typeof track === 'number') {
            trackFound = queue.tracks[track];
            if (trackFound) {
                queue.tracks = queue.tracks.filter((t) => t !== trackFound);
            }
        }
        else {
            trackFound = queue.tracks.find((s) => s.url === track.url);
            if (trackFound) {
                queue.tracks = queue.tracks.filter((s) => s.url !== trackFound.url);
            }
        }
        return trackFound;
    }
    /**
     * Returns time code of currently playing song
     * @param {DiscordMessage} message The message object
     * @param {Boolean} [queueTime] If it should make the time code of the whole queue
     * @returns {Object}
     */
    getTimeCode(message, queueTime) {
        const queue = this.getQueue(message);
        if (!queue)
            return;
        const previousTracksTime = queue.previousTracks.length > 0 ? queue.previousTracks.reduce((p, c) => p + c.durationMS, 0) : 0;
        const currentStreamTime = queueTime ? previousTracksTime + queue.currentStreamTime : queue.currentStreamTime;
        const totalTracksTime = queue.totalTime;
        const totalTime = queueTime ? previousTracksTime + totalTracksTime : queue.playing.durationMS;
        const currentTimecode = Util_1.default.buildTimeCode(Util_1.default.parseMS(currentStreamTime));
        const endTimecode = Util_1.default.buildTimeCode(Util_1.default.parseMS(totalTime));
        return {
            current: currentTimecode,
            end: endTimecode
        };
    }
    /**
     * Creates progressbar
     * @param {DiscordMessage} message The message object
     * @param {PlayerProgressbarOptions} [options] Progressbar options
     * @returns {String}
     */
    createProgressBar(message, options) {
        const queue = this.getQueue(message);
        if (!queue)
            return;
        const previousTracksTime = queue.previousTracks.length > 0 ? queue.previousTracks.reduce((p, c) => p + c.durationMS, 0) : 0;
        const currentStreamTime = (options === null || options === void 0 ? void 0 : options.queue)
            ? previousTracksTime + queue.currentStreamTime
            : queue.currentStreamTime;
        const totalTracksTime = queue.totalTime;
        const totalTime = (options === null || options === void 0 ? void 0 : options.queue) ? previousTracksTime + totalTracksTime : queue.playing.durationMS;
        const length = typeof (options === null || options === void 0 ? void 0 : options.length) === 'number'
            ? (options === null || options === void 0 ? void 0 : options.length) <= 0 || (options === null || options === void 0 ? void 0 : options.length) === Infinity
                ? 15
                : options === null || options === void 0 ? void 0 : options.length
            : 15;
        const index = Math.round((currentStreamTime / totalTime) * length);
        const indicator = typeof (options === null || options === void 0 ? void 0 : options.indicator) === 'string' && (options === null || options === void 0 ? void 0 : options.indicator.length) > 0 ? options === null || options === void 0 ? void 0 : options.indicator : '????';
        const line = typeof (options === null || options === void 0 ? void 0 : options.line) === 'string' && (options === null || options === void 0 ? void 0 : options.line.length) > 0 ? options === null || options === void 0 ? void 0 : options.line : '???';
        if (index >= 1 && index <= length) {
            const bar = line.repeat(length - 1).split('');
            bar.splice(index, 0, indicator);
            if (Boolean(options === null || options === void 0 ? void 0 : options.timecodes)) {
                const currentTimecode = Util_1.default.buildTimeCode(Util_1.default.parseMS(currentStreamTime));
                const endTimecode = Util_1.default.buildTimeCode(Util_1.default.parseMS(totalTime));
                return `${currentTimecode} ??? ${bar.join('')} ??? ${endTimecode}`;
            }
            else {
                return `${bar.join('')}`;
            }
        }
        else {
            if (Boolean(options === null || options === void 0 ? void 0 : options.timecodes)) {
                const currentTimecode = Util_1.default.buildTimeCode(Util_1.default.parseMS(currentStreamTime));
                const endTimecode = Util_1.default.buildTimeCode(Util_1.default.parseMS(totalTime));
                return `${currentTimecode} ??? ${indicator}${line.repeat(length - 1)} ??? ${endTimecode}`;
            }
            else {
                return `${indicator}${line.repeat(length - 1)}`;
            }
        }
    }
    /**
     * Gets lyrics of a song
     * <warn>You need to have `@discord-player/extractor` installed in order to use this method!</warn>
     * @param {String} query Search query
     * @example const lyrics = await player.lyrics("alan walker faded")
     * message.channel.send(lyrics.lyrics);
     * @returns {Promise<LyricsData>}
     */
    lyrics(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const extractor = Util_1.default.require('@discord-player/extractor');
            if (!extractor)
                throw new PlayerError_1.default("Cannot call 'Player.lyrics()' without '@discord-player/extractor'");
            const data = yield extractor.Lyrics.init().search(query);
            if (Array.isArray(data))
                return null;
            return data;
        });
    }
    /**
     * Toggle autoplay for youtube streams
     * @param {DiscordMessage} message The message object
     * @param {Boolean} enable Enable/Disable autoplay
     * @returns {boolean}
     */
    setAutoPlay(message, enable) {
        const queue = this.getQueue(message);
        if (!queue)
            return void this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message);
        queue.autoPlay = Boolean(enable);
        return queue.autoPlay;
    }
    /**
     * Player stats
     * @returns {PlayerStats}
     */
    getStats() {
        return {
            uptime: this.client.uptime,
            connections: this.client.voice.connections.size,
            // tslint:disable:no-shadowed-variable
            users: this.client.voice.connections.reduce((a, c) => a + c.channel.members.filter((a) => a.user.id !== this.client.user.id).size, 0),
            queues: this.queues.size,
            extractors: this.Extractors.size,
            versions: {
                ffmpeg: Util_1.default.getFFmpegVersion(),
                node: process.version,
                v8: process.versions.v8
            },
            system: {
                arch: process.arch,
                platform: process.platform,
                cpu: os_1.default.cpus().length,
                memory: {
                    total: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2),
                    usage: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
                    rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
                    arrayBuffers: (process.memoryUsage().arrayBuffers / 1024 / 1024).toFixed(2)
                },
                uptime: process.uptime()
            }
        };
    }
    /**
     * Jumps to particular track
     * @param {DiscordMessage} message The message
     * @param {Track|number} track The track to jump to
     * @returns {boolean}
     */
    jump(message, track) {
        const toJUMP = this.remove(message, track);
        const queue = this.getQueue(message);
        if (!toJUMP || !queue)
            throw new PlayerError_1.default('Specified Track not found');
        queue.tracks.splice(1, 0, toJUMP);
        return this.skip(message);
    }
    /**
     * Internal method to handle VoiceStateUpdate events
     * @param {DiscordVoiceState} oldState The old voice state
     * @param {DiscordVoiceState} newState The new voice state
     * @returns {void}
     * @private
     */
    _handleVoiceStateUpdate(oldState, newState) {
        const queue = this.queues.find((g) => g.guildID === oldState.guild.id);
        if (!queue)
            return;
        if (newState.member.id === this.client.user.id && !newState.channelID) {
            queue.stream.destroy();
            this.queues.delete(newState.guild.id);
            this.emit(Constants_1.PlayerEvents.BOT_DISCONNECT, queue.firstMessage);
        }
        if (!queue.voiceConnection || !queue.voiceConnection.channel)
            return;
        if (!this.options.leaveOnEmpty)
            return;
        if (!oldState.channelID || newState.channelID) {
            const emptyTimeout = this._cooldownsTimeout.get(`empty_${oldState.guild.id}`);
            // @todo: make stage channels stable
            const channelEmpty = Util_1.default.isVoiceEmpty(queue.voiceConnection.channel);
            if (!channelEmpty && emptyTimeout) {
                clearTimeout(emptyTimeout);
                this._cooldownsTimeout.delete(`empty_${oldState.guild.id}`);
            }
        }
        else {
            if (!Util_1.default.isVoiceEmpty(queue.voiceConnection.channel))
                return;
            const timeout = setTimeout(() => {
                if (!Util_1.default.isVoiceEmpty(queue.voiceConnection.channel))
                    return;
                if (!this.queues.has(queue.guildID))
                    return;
                queue.voiceConnection.channel.leave();
                this.queues.delete(queue.guildID);
                this.emit(Constants_1.PlayerEvents.CHANNEL_EMPTY, queue.firstMessage, queue);
            }, this.options.leaveOnEmptyCooldown || 0);
            this._cooldownsTimeout.set(`empty_${oldState.guild.id}`, timeout);
        }
    }
    /**
     * Internal method used to add tracks to the queue
     * @param {DiscordMessage} message The discord message
     * @param {Track} track The track
     * @returns {Queue}
     * @private
     */
    _addTrackToQueue(message, track) {
        const queue = this.getQueue(message);
        if (!queue)
            this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_PLAYING, message, new PlayerError_1.default('Player is not available in this server'));
        if (!track || !(track instanceof Track_1.Track))
            throw new PlayerError_1.default('No track specified to add to the queue');
        queue.tracks.push(track);
        return queue;
    }
    /**
     * Same as `_addTrackToQueue` but used for multiple tracks
     * @param {DiscordMessage} message Discord message
     * @param {Track[]} tracks The tracks
     * @returns {Queue}
     * @private
     */
    _addTracksToQueue(message, tracks) {
        const queue = this.getQueue(message);
        if (!queue)
            throw new PlayerError_1.default('Cannot add tracks to queue because no song is currently being played on the server.');
        queue.tracks.push(...tracks);
        return queue;
    }
    /**
     * Internal method used to create queue
     * @param {DiscordMessage} message The message
     * @param {Track} track The track
     * @returns {Promise<Queue>}
     * @private
     */
    _createQueue(message, track) {
        return new Promise((resolve) => {
            const channel = message.member.voice ? message.member.voice.channel : null;
            if (!channel)
                return void this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.NOT_CONNECTED, message, new PlayerError_1.default('Voice connection is not available in this server!'));
            const queue = new Queue_1.Queue(this, message);
            this.queues.set(message.guild.id, queue);
            channel
                .join()
                .then((connection) => {
                this.emit(Constants_1.PlayerEvents.CONNECTION_CREATE, message, connection);
                queue.voiceConnection = connection;
                if (this.options.autoSelfDeaf)
                    connection.voice.setSelfDeaf(true);
                queue.tracks.push(track);
                this.emit(Constants_1.PlayerEvents.QUEUE_CREATE, message, queue);
                resolve(queue);
                this._playTrack(queue, true);
            })
                .catch((err) => {
                var _a;
                this.queues.delete(message.guild.id);
                this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.UNABLE_TO_JOIN, message, new PlayerError_1.default((_a = err.message) !== null && _a !== void 0 ? _a : err));
            });
        });
    }
    /**
     * Internal method used to init stream playing
     * @param {Queue} queue The queue
     * @param {boolean} firstPlay If this is a first play
     * @returns {Promise<void>}
     * @private
     */
    _playTrack(queue, firstPlay) {
        return __awaiter(this, void 0, void 0, function* () {
            if (queue.stopped)
                return;
            if (!queue.autoPlay && queue.tracks.length === 1 && !queue.loopMode && !queue.repeatMode && !firstPlay) {
                if (this.options.leaveOnEnd && !queue.stopped) {
                    this.queues.delete(queue.guildID);
                    const timeout = setTimeout(() => {
                        queue.voiceConnection.channel.leave();
                    }, this.options.leaveOnEndCooldown || 0);
                    this._cooldownsTimeout.set(`end_${queue.guildID}`, timeout);
                }
                this.queues.delete(queue.guildID);
                if (queue.stopped) {
                    return void this.emit(Constants_1.PlayerEvents.MUSIC_STOP, queue.firstMessage);
                }
                return void this.emit(Constants_1.PlayerEvents.QUEUE_END, queue.firstMessage, queue);
            }
            if (queue.autoPlay && !queue.repeatMode && !firstPlay) {
                const oldTrack = queue.tracks.shift();
                const info = oldTrack.raw.source === 'youtube' ? yield discord_ytdl_core_1.default.getInfo(oldTrack.url).catch((e) => { }) : null;
                if (info) {
                    const res = yield Util_1.default.ytSearch(info.related_videos[0].title, {
                        player: this,
                        limit: 1,
                        user: oldTrack.requestedBy
                    })
                        .then((v) => v[0])
                        .catch((e) => { });
                    if (res) {
                        queue.tracks.push(res);
                        if (queue.loopMode)
                            queue.tracks.push(oldTrack);
                        queue.previousTracks.push(oldTrack);
                    }
                }
            }
            else if (!queue.autoPlay && !queue.repeatMode && !firstPlay) {
                const oldTrack = queue.tracks.shift();
                if (queue.loopMode)
                    queue.tracks.push(oldTrack);
                queue.previousTracks.push(oldTrack);
            }
            const track = queue.playing;
            queue.lastSkipped = false;
            this._playStream(queue, false).then(() => {
                if (!firstPlay)
                    this.emit(Constants_1.PlayerEvents.TRACK_START, queue.firstMessage, track, queue);
            });
        });
    }
    /**
     * Internal method to play audio
     * @param {Queue} queue The queue
     * @param {boolean} updateFilter If this method was called for audio filter update
     * @param {number} [seek] Time in ms to seek to
     * @returns {Promise<void>}
     * @private
     */
    _playStream(queue, updateFilter, seek) {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const ffmpeg = Util_1.default.checkFFmpeg();
            if (!ffmpeg)
                return;
            const seekTime = typeof seek === 'number'
                ? seek
                : updateFilter
                    ? queue.voiceConnection.dispatcher.streamTime + queue.additionalStreamTime
                    : undefined;
            const encoderArgsFilters = [];
            Object.keys(queue.filters).forEach((filterName) => {
                // @ts-ignore
                if (queue.filters[filterName]) {
                    // @ts-ignore
                    encoderArgsFilters.push(this.filters[filterName]);
                }
            });
            let encoderArgs = [];
            if (encoderArgsFilters.length < 1) {
                encoderArgs = [];
            }
            else {
                encoderArgs = ['-af', encoderArgsFilters.join(',')];
            }
            let newStream;
            // modify spotify
            if (queue.playing.raw.source === 'spotify' && !queue.playing.backupLink) {
                const searchQueryString = this.options.disableArtistSearch
                    ? queue.playing.title
                    : `${queue.playing.title}${' - ' + queue.playing.author}`;
                const yteqv = yield youtube_sr_1.default.search(searchQueryString, { type: 'video', limit: 1 }).catch(() => { });
                if (!yteqv || !yteqv.length)
                    return void this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.VIDEO_UNAVAILABLE, queue.firstMessage, queue.playing, new PlayerError_1.default('Could not find alternative track on youtube!', 'SpotifyTrackError'));
                Util_1.default.define({
                    target: queue.playing,
                    prop: 'backupLink',
                    value: yteqv[0].url
                });
            }
            if (queue.playing.raw.source === 'youtube' || queue.playing.raw.source === 'spotify') {
                newStream = discord_ytdl_core_1.default((_a = queue.playing.backupLink) !== null && _a !== void 0 ? _a : queue.playing.url, Object.assign({ opusEncoded: true, encoderArgs: queue.playing.raw.live ? [] : encoderArgs, seek: seekTime / 1000, 
                    // tslint:disable-next-line:no-bitwise
                    highWaterMark: 1 << 25 }, this.options.ytdlDownloadOptions));
            }
            else {
                newStream = discord_ytdl_core_1.default.arbitraryStream(queue.playing.raw.source === 'soundcloud'
                    ? yield queue.playing.raw.engine.downloadProgressive()
                    : queue.playing.raw.engine, {
                    opusEncoded: true,
                    encoderArgs,
                    seek: seekTime / 1000
                });
            }
            setTimeout(() => {
                if (queue.stream)
                    queue.stream.destroy();
                queue.stream = newStream;
                queue.voiceConnection.play(newStream, {
                    type: 'opus',
                    bitrate: 'auto'
                });
                if (seekTime) {
                    queue.additionalStreamTime = seekTime;
                }
                queue.voiceConnection.dispatcher.setVolumeLogarithmic(queue.calculatedVolume / 200);
                queue.voiceConnection.dispatcher.on('start', () => {
                    resolve();
                });
                queue.voiceConnection.dispatcher.on('finish', () => {
                    queue.additionalStreamTime = 0;
                    return this._playTrack(queue, false);
                });
                newStream.on('error', (error) => {
                    if (error.message.toLowerCase().includes('video unavailable')) {
                        this.emit(Constants_1.PlayerEvents.ERROR, Constants_1.PlayerErrorEventCodes.VIDEO_UNAVAILABLE, queue.firstMessage, queue.playing, error);
                        this._playTrack(queue, false);
                    }
                    else {
                        this.emit(Constants_1.PlayerEvents.ERROR, error, queue.firstMessage, error);
                    }
                });
            }, 1000);
        }));
    }
    toString() {
        return `<Player ${this.queues.size}>`;
    }
}
exports.Player = Player;
exports.default = Player;
/**
 * Emitted when a track starts
 * @event Player#trackStart
 * @param {DiscordMessage} message The message
 * @param {Track} track The track
 * @param {Queue} queue The queue
 */
/**
 * Emitted when a playlist is started
 * @event Player#queueCreate
 * @param {DiscordMessage} message The message
 * @param {Queue} queue The queue
 */
/**
 * Emitted when the bot is awaiting search results
 * @event Player#searchResults
 * @param {DiscordMessage} message The message
 * @param {String} query The query
 * @param {Track[]} tracks The tracks
 * @param {DiscordCollector} collector The collector
 */
/**
 * Emitted when the user has sent an invalid response for search results
 * @event Player#searchInvalidResponse
 * @param {DiscordMessage} message The message
 * @param {String} query The query
 * @param {Track[]} tracks The tracks
 * @param {String} invalidResponse The `invalidResponse` string
 * @param {DiscordCollector} collector The collector
 */
/**
 * Emitted when the bot has stopped awaiting search results (timeout)
 * @event Player#searchCancel
 * @param {DiscordMessage} message The message
 * @param {String} query The query
 * @param {Track[]} tracks The tracks
 */
/**
 * Emitted when the bot can't find related results to the query
 * @event Player#noResults
 * @param {DiscordMessage} message The message
 * @param {String} query The query
 */
/**
 * Emitted when the bot is disconnected from the channel
 * @event Player#botDisconnect
 * @param {DiscordMessage} message The message
 */
/**
 * Emitted when the channel of the bot is empty
 * @event Player#channelEmpty
 * @param {DiscordMessage} message The message
 * @param {Queue} queue The queue
 */
/**
 * Emitted when the queue of the server is ended
 * @event Player#queueEnd
 * @param {DiscordMessage} message The message
 * @param {Queue} queue The queue
 */
/**
 * Emitted when a track is added to the queue
 * @event Player#trackAdd
 * @param {DiscordMessage} message The message
 * @param {Queue} queue The queue
 * @param {Track} track The track
 */
/**
 * Emitted when a playlist is added to the queue
 * @event Player#playlistAdd
 * @param {DiscordMessage} message The message
 * @param {Queue} queue The queue
 * @param {Object} playlist The playlist
 */
/**
 * Emitted when an error is triggered.
 * <warn>This event should handled properly by the users otherwise it might crash the process!</warn>
 * @event Player#error
 * @param {String} error It can be `NotConnected`, `UnableToJoin`, `NotPlaying`, `ParseError`, `LiveVideo` or `VideoUnavailable`.
 * @param {DiscordMessage} message The message
 */
/**
 * Emitted when discord-player attempts to parse playlist contents (mostly soundcloud playlists)
 * @event Player#playlistParseStart
 * @param {Object} playlist Raw playlist (unparsed)
 * @param {DiscordMessage} message The message
 */
/**
 * Emitted when discord-player finishes parsing playlist contents (mostly soundcloud playlists)
 * @event Player#playlistParseEnd
 * @param {Object} playlist The playlist data (parsed)
 * @param {DiscordMessage} message The message
 */
/**
 * @typedef {Object} PlayerOptions
 * @property {Boolean} [leaveOnEnd=false] If it should leave on queue end
 * @property {Number} [leaveOnEndCooldown=0] Time in ms to wait before executing `leaveOnEnd`
 * @property {Boolean} [leaveOnStop=false] If it should leave on stop command
 * @property {Boolean} [leaveOnEmpty=false] If it should leave on empty voice channel
 * @property {Number} [leaveOnEmptyCooldown=0] Time in ms to wait before executing `leaveOnEmpty`
 * @property {Boolean} [autoSelfDeaf=false] If it should set the client to `self deaf` mode on joining
 * @property {Boolean} [enableLive=false] If it should enable live videos support
 * @property {YTDLDownloadOptions} [ytdlDownloadOptions={}] The download options passed to `ytdl-core`
 * @property {Boolean} [useSafeSearch=false] If it should use `safe search` method for youtube searches
 * @property {Boolean} [disableAutoRegister=false] If it should disable auto-registeration of `@discord-player/extractor`
 * @property {Boolean} [disableArtistSearch=false] If it should disable artist search for spotify
 * @property {Boolean} [fetchBeforeQueued=false] If it should fetch all songs loaded from spotify before playing
 */
/**
 * The type of Track source, either:
 * * `soundcloud` - a stream from SoundCloud
 * * `youtube` - a stream from YouTube
 * * `spotify` - a spotify track
 * * `arbitrary` - arbitrary stream
 * @typedef {String} TrackSource
 */
/**
 * @typedef {Object} TrackData
 * @property {String} title The title
 * @property {String} description The description
 * @property {String} author The author
 * @property {String} url The url
 * @property {String} duration The duration
 * @property {Number} views The view count
 * @property {DiscordUser} requestedBy The user who requested this track
 * @property {Boolean} fromPlaylist If this track came from a playlist
 * @property {TrackSource} [source] The track source
 * @property {string|Readable} [engine] The stream engine
 * @property {Boolean} [live=false] If this track is livestream instance
 */
/**
 * @typedef {Object} QueueFilters
 * The FFmpeg Filters
 */
/**
 * The query type, either:
 * * `soundcloud_track` - a SoundCloud Track
 * * `soundcloud_playlist` - a SoundCloud Playlist
 * * `spotify_song` - a Spotify Song
 * * `spotify_album` - a Spotify album
 * * `spotify_playlist` - a Spotify playlist
 * * `youtube_video` - a YouTube video
 * * `youtube_playlist` - a YouTube playlist
 * * `vimeo` - a Vimeo link
 * * `facebook` - a Facebook link
 * * `reverbnation` - a Reverbnation link
 * * `attachment` - an attachment link
 * * `youtube_search` - a YouTube search keyword
 * @typedef {String} QueryType The query type
 */
/**
 * @typedef {Object} ExtractorModelData
 * @property {String} title The title
 * @property {Number} duration The duration in ms
 * @property {String} thumbnail The thumbnail url
 * @property {string|Readable} engine The audio engine
 * @property {Number} views The views count of this stream
 * @property {String} author The author
 * @property {String} description The description
 * @property {String} url The url
 * @property {String} [version='0.0.0'] The extractor version
 * @property {Boolean} [important=false] Mark as important
 */
/**
 * @typedef {Object} PlayerProgressbarOptions
 * @property {Boolean} [timecodes] If it should return progres bar with time codes
 * @property {Boolean} [queue] if it should return the progress bar of the whole queue
 * @property {Number} [length] The length of progress bar to build
 */
/**
 * @typedef {Object} LyricsData
 * @property {String} title The title of the lyrics
 * @property {Number} id The song id
 * @property {String} thumbnail The thumbnail
 * @property {String} image The image
 * @property {String} url The url
 * @property {Object} artist The artist info
 * @property {String} [artist.name] The name of the artist
 * @property {Number} [artist.id] The ID of the artist
 * @property {String} [artist.url] The profile link of the artist
 * @property {String} [artist.image] The artist image url
 * @property {String?} lyrics The lyrics
 */
/**
 * @typedef {Object} PlayerStats
 * @property {Number} uptime The uptime in ms
 * @property {Number} connections The number of connections
 * @property {Number} users The number of users
 * @property {Number} queues The number of queues
 * @property {Number} extractors The number of custom extractors registered
 * @property {Object} versions The versions metadata
 * @property {String} [versions.ffmpeg] The ffmpeg version
 * @property {String} [versions.node] The node version
 * @property {String} [versions.v8] The v8 JavaScript engine version
 * @property {Object} system The system data
 * @property {String} [system.arch] The system arch
 * @property {String} [system.platform] The system platform
 * @property {Number} [system.cpu] The cpu count
 * @property {Object} [system.memory] The memory info
 * @property {String} [system.memory.total] The total memory
 * @property {String} [system.memory.usage] The memory usage
 * @property {String} [system.memory.rss] The memory usage in RSS
 * @property {String} [system.memory.arrayBuffers] The memory usage in ArrayBuffers
 * @property {Number} [system.uptime] The system uptime
 */
/**
 * @typedef {Object} TimeData
 * @property {Number} days The time in days
 * @property {Number} hours The time in hours
 * @property {Number} minutes The time in minutes
 * @property {Number} seconds The time in seconds
 */
