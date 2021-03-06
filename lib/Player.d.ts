/// <reference types="node" />
import { EventEmitter } from 'events';
import { Client, Collection, Message, VoiceChannel } from 'discord.js';
import { LyricsData, PlayerOptions as PlayerOptionsType, PlayerProgressbarOptions, PlayerStats, QueueFilters } from './types/types';
import AudioFilters from './utils/AudioFilters';
import { Queue } from './Structures/Queue';
import { Track } from './Structures/Track';
import { ExtractorModel } from './Structures/ExtractorModel';
/**
 * The Player class
 * @extends {EventEmitter}
 */
export declare class Player extends EventEmitter {
    client: Client;
    options: PlayerOptionsType;
    filters: typeof AudioFilters;
    /**
     * The collection of queues in this player
     * @type {DiscordCollection<Queue>}
     */
    queues: Collection<string, Queue>;
    /**
     * Collection of results collectors
     * @type {DiscordCollection<DiscordCollector<DiscordSnowflake, DiscordMessage>>}
     * @private
     */
    private _resultsCollectors;
    /**
     * Collection of cooldowns timeout
     * @type {DiscordCollection<Timeout>}
     * @private
     */
    private _cooldownsTimeout;
    /**
     * The extractor model collection
     * @type {DiscordCollection<ExtractorModel>}
     */
    Extractors: Collection<string, ExtractorModel>;
    /**
     * Creates new Player instance
     * @param {DiscordClient} client The discord.js client
     * @param {PlayerOptions} options Player options
     */
    constructor(client: Client, options?: PlayerOptionsType);
    static get AudioFilters(): typeof AudioFilters;
    /**
     * Define custom extractor in this player
     * @param {String} extractorName The extractor name
     * @param {any} extractor The extractor itself
     * @returns {Player}
     */
    use(extractorName: string, extractor: any): Player;
    /**
     * Remove existing extractor from this player
     * @param {String} extractorName The extractor name
     * @returns {Boolean}
     */
    unuse(extractorName: string): boolean;
    /**
     * Internal method to search tracks
     * @param {DiscordMessage} message The message
     * @param {string} query The query
     * @param {boolean} [firstResult=false] If it should return the first result
     * @returns {Promise<Track>}
     * @private
     */
    private _searchTracks;
    /**
     * Play a song
     * @param {DiscordMessage} message The discord.js message object
     * @param {string|Track} query Search query, can be `Player.Track` instance
     * @param {Boolean} [firstResult=false] If it should play the first result
     * @example await player.play(message, "never gonna give you up", true)
     * @returns {Promise<void>}
     */
    play(message: Message, query: string | Track, firstResult?: boolean): Promise<void>;
    /**
     * Checks if this player is playing in a server
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    isPlaying(message: Message): boolean;
    /**
     * Returns guild queue object
     * @param {DiscordMessage} message The message object
     * @returns {Queue}
     */
    getQueue(message: Message): Queue;
    /**
     * Sets audio filters in this player
     * @param {DiscordMessage} message The message object
     * @param {QueueFilters} newFilters Audio filters object
     * @returns {Promise<void>}
     */
    setFilters(message: Message, newFilters: QueueFilters): Promise<void>;
    /**
     * Sets track position
     * @param {DiscordMessage} message The message object
     * @param {Number} time Time in ms to set
     * @returns {Promise<void>}
     */
    setPosition(message: Message, time: number): Promise<void>;
    /**
     * Sets track position
     * @param {DiscordMessage} message The message object
     * @param {Number} time Time in ms to set
     * @returns {Promise<void>}
     */
    seek(message: Message, time: number): Promise<void>;
    /**
     * Skips current track
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    skip(message: Message): boolean;
    /**
     * Moves to a new voice channel
     * @param {DiscordMessage} message The message object
     * @param {DiscordVoiceChannel} channel New voice channel to move to
     * @returns {Boolean}
     */
    moveTo(message: Message, channel?: VoiceChannel): boolean;
    /**
     * Pause the playback
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    pause(message: Message): boolean;
    /**
     * Resume the playback
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    resume(message: Message): boolean;
    /**
     * Stops the player
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    stop(message: Message): boolean;
    /**
     * Sets music volume
     * @param {DiscordMessage} message The message object
     * @param {Number} percent The volume percentage/amount to set
     * @returns {Boolean}
     */
    setVolume(message: Message, percent: number): boolean;
    /**
     * Clears the queue
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    clearQueue(message: Message): boolean;
    /**
     * Plays previous track
     * @param {DiscordMessage} message The message object
     * @returns {Boolean}
     */
    back(message: Message): boolean;
    /**
     * Sets repeat mode
     * @param {DiscordMessage} message The message object
     * @param {Boolean} enabled If it should enable the repeat mode
     */
    setRepeatMode(message: Message, enabled: boolean): boolean;
    /**
     * Sets loop mode
     * @param {DiscordMessage} message The message object
     * @param {Boolean} enabled If it should enable the loop mode
     * @returns {Boolean}
     */
    setLoopMode(message: Message, enabled: boolean): boolean;
    /**
     * Returns currently playing track
     * @param {DiscordMessage} message The message object
     * @returns {Track}
     */
    nowPlaying(message: Message): Track;
    /**
     * Shuffles the queue
     * @param {DiscordMessage} message The message object
     * @returns {Queue}
     */
    shuffle(message: Message): Queue;
    /**
     * Removes specified track
     * @param {DiscordMessage} message The message object
     * @param {Track|number} track The track object/id to remove
     * @returns {Track}
     */
    remove(message: Message, track: Track | number): Track;
    /**
     * Returns time code of currently playing song
     * @param {DiscordMessage} message The message object
     * @param {Boolean} [queueTime] If it should make the time code of the whole queue
     * @returns {Object}
     */
    getTimeCode(message: Message, queueTime?: boolean): {
        current: string;
        end: string;
    };
    /**
     * Creates progressbar
     * @param {DiscordMessage} message The message object
     * @param {PlayerProgressbarOptions} [options] Progressbar options
     * @returns {String}
     */
    createProgressBar(message: Message, options?: PlayerProgressbarOptions): string;
    /**
     * Gets lyrics of a song
     * <warn>You need to have `@discord-player/extractor` installed in order to use this method!</warn>
     * @param {String} query Search query
     * @example const lyrics = await player.lyrics("alan walker faded")
     * message.channel.send(lyrics.lyrics);
     * @returns {Promise<LyricsData>}
     */
    lyrics(query: string): Promise<LyricsData>;
    /**
     * Toggle autoplay for youtube streams
     * @param {DiscordMessage} message The message object
     * @param {Boolean} enable Enable/Disable autoplay
     * @returns {boolean}
     */
    setAutoPlay(message: Message, enable: boolean): boolean;
    /**
     * Player stats
     * @returns {PlayerStats}
     */
    getStats(): PlayerStats;
    /**
     * Jumps to particular track
     * @param {DiscordMessage} message The message
     * @param {Track|number} track The track to jump to
     * @returns {boolean}
     */
    jump(message: Message, track: Track | number): boolean;
    /**
     * Internal method to handle VoiceStateUpdate events
     * @param {DiscordVoiceState} oldState The old voice state
     * @param {DiscordVoiceState} newState The new voice state
     * @returns {void}
     * @private
     */
    private _handleVoiceStateUpdate;
    /**
     * Internal method used to add tracks to the queue
     * @param {DiscordMessage} message The discord message
     * @param {Track} track The track
     * @returns {Queue}
     * @private
     */
    _addTrackToQueue(message: Message, track: Track): Queue;
    /**
     * Same as `_addTrackToQueue` but used for multiple tracks
     * @param {DiscordMessage} message Discord message
     * @param {Track[]} tracks The tracks
     * @returns {Queue}
     * @private
     */
    _addTracksToQueue(message: Message, tracks: Track[]): Queue;
    /**
     * Internal method used to create queue
     * @param {DiscordMessage} message The message
     * @param {Track} track The track
     * @returns {Promise<Queue>}
     * @private
     */
    private _createQueue;
    /**
     * Internal method used to init stream playing
     * @param {Queue} queue The queue
     * @param {boolean} firstPlay If this is a first play
     * @returns {Promise<void>}
     * @private
     */
    private _playTrack;
    /**
     * Internal method to play audio
     * @param {Queue} queue The queue
     * @param {boolean} updateFilter If this method was called for audio filter update
     * @param {number} [seek] Time in ms to seek to
     * @returns {Promise<void>}
     * @private
     */
    private _playStream;
    toString(): string;
}
export default Player;
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
