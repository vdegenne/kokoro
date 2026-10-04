import {ReactiveController, state} from '@snar/lit';

interface KokoroVoice {
	id: Voice;
	description: string;
}

// prettier-ignore
const availableVoices = {
	en: ['af_heart', 'af_aoede', 'af_bella', 'af_jessica', 'af_kore', 'af_nicole', 'af_nova', 'af_river', 'af_sarah', 'af_sky', 'af_alloy', 'am_adam', 'am_michael', 'am_echo', 'am_eric', 'am_fenrir', 'am_liam', 'am_onyx', 'am_puck', 'am_santa', 'bf_emma', 'bf_isabella', 'bf_alice', 'bf_lily', 'bm_george', 'bm_lewis', 'bm_daniel', 'bm_fable'],
	es: ['ef_dora', 'em_alex', 'em_santa'],
	fr: ['ff_siwis'],
	hi: ['hf_alpha', 'hf_beta', 'hm_omega', 'hm_psi'],
	it: ['if_sara', 'im_nicola'],
	ja: ['jf_alpha', 'jf_gongitsune', 'jf_nezumi', 'jf_tebukuro', 'jm_kumo'],
	pt: ['pf_dora', 'pm_alex', 'pm_santa'],
	zh: ['zf_xiaobei', 'zf_xiaoni', 'zf_xiaoxiao', 'zf_xiaoyi', 'zm_yunjian', 'zm_yunxi', 'zm_yunxia', 'zm_yunyang'],
} as const;

type Language = keyof typeof availableVoices;

type Voice = (typeof availableVoices)[Language][number];

interface PlayOptions {
	voiceId?: Voice;
	speed?: number;
	volume?: number;
}

type CachedAudio = Blob | Promise<Blob>;

export class KokoroClient extends ReactiveController {
	@state() state:
		'disconnected' | 'connecting' | 'connection_error' | 'connected' =
		'disconnected';

	@state() voices: KokoroVoice[] = [];
	@state() host: string;
	@state() port: number;

	private cache = new Map<string, CachedAudio>();
	private currentAudios = new Map<
		string,
		{
			audio: HTMLAudioElement;
			resolve: () => void;
		}
	>();

	constructor({
		host = '127.0.0.1',
		port = 8880,
	}: {
		host?: string;
		port?: number;
	} = {}) {
		super();

		this.host = host;
		this.port = port;
	}

	private get endpoint() {
		return `http://${this.host}:${this.port}`;
	}

	async connect({reconnect = false}: {reconnect?: boolean} = {}) {
		if (this.state === 'connected' && !reconnect) {
			return;
		}

		this.state = 'connecting';

		try {
			const response = await fetch(`${this.endpoint}/v1/voices`);

			if (!response.ok) {
				throw new Error(`Kokoro returned HTTP ${response.status}`);
			}

			const data = await response.json();

			this.voices = data.voices;
			this.state = 'connected';
		} catch (error) {
			this.voices = [];
			this.state = 'connection_error';
			throw error;
		}
	}

	disconnect() {
		this.stop();

		this.voices = [];
		this.state = 'disconnected';
	}

	private pendingPlays = new Set<string>();

	async play(
		sentence: string,
		{voiceId = 'af_heart', speed = 1, volume = 1}: PlayOptions = {},
	) {
		if (this.state !== 'connected') {
			throw new Error('Kokoro is not connected');
		}

		const key = this.getCacheKey(sentence, voiceId, speed);

		if (this.pendingPlays.has(key)) {
			return;
		}

		const current = this.currentAudios.get(key);

		if (current) {
			current.audio.currentTime = 0;
			current.audio.volume = Math.max(0, Math.min(1, volume));
			await current.audio.play();
			return;
		}

		this.pendingPlays.add(key);

		try {
			let cached = this.cache.get(key);

			if (!cached) {
				const promise = this.fetchAudio(sentence, voiceId, speed);

				this.cache.set(key, promise);

				try {
					const audio = await promise;
					this.cache.set(key, audio);
					cached = audio;
				} catch (error) {
					this.cache.delete(key);
					throw error;
				}
			}

			const audio = cached instanceof Promise ? await cached : cached;

			this.pendingPlays.delete(key);

			await this.playBlob(audio, key, volume);
		} catch (error) {
			this.pendingPlays.delete(key);
			throw error;
		}
	}

	async togglePlay(sentence: string, options: PlayOptions = {}) {
		if (this.currentAudios.size > 0) {
			this.stop();
			return;
		}

		return this.play(sentence, options);
	}

	private async fetchAudio(sentence: string, voiceId: Voice, speed: number) {
		const response = await fetch(`${this.endpoint}/v1/audio/speech`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'tts-1',
				input: sentence,
				voice: voiceId,
				speed,
				response_format: 'wav',
			}),
		});

		if (!response.ok) {
			throw new Error(
				`Kokoro speech synthesis failed: HTTP ${response.status}`,
			);
		}

		return response.blob();
	}

	private async playBlob(blob: Blob, key: string, volume: number) {
		const url = URL.createObjectURL(blob);
		const audio = new Audio(url);

		audio.volume = Math.max(0, Math.min(1, volume));

		this.currentAudios.set(key, {
			audio,
			resolve: () => {},
		});

		try {
			await audio.play();

			await new Promise<void>((resolve, reject) => {
				const current = this.currentAudios.get(key);

				if (current?.audio === audio) {
					current.resolve = resolve;
				}

				audio.addEventListener(
					'ended',
					() => {
						if (this.currentAudios.get(key)?.audio === audio) {
							this.currentAudios.delete(key);
						}

						URL.revokeObjectURL(url);
						resolve();
					},
					{once: true},
				);

				audio.addEventListener(
					'error',
					() => {
						if (this.currentAudios.get(key)?.audio === audio) {
							this.currentAudios.delete(key);
						}

						URL.revokeObjectURL(url);
						reject(new Error('Audio playback failed'));
					},
					{once: true},
				);
			});
		} catch (error) {
			if (this.currentAudios.get(key)?.audio === audio) {
				this.currentAudios.delete(key);
			}

			URL.revokeObjectURL(url);
			throw error;
		}
	}

	private stop(key?: string) {
		if (key) {
			const current = this.currentAudios.get(key);

			if (!current) {
				return;
			}

			current.audio.pause();
			current.audio.currentTime = 0;

			this.currentAudios.delete(key);
			current.resolve();

			return;
		}

		for (const current of this.currentAudios.values()) {
			current.audio.pause();
			current.audio.currentTime = 0;
			current.resolve();
		}

		this.currentAudios.clear();
	}

	private getCacheKey(sentence: string, voiceId: Voice, speed: number) {
		return `${voiceId}:${speed}:${sentence}`;
	}

	getRandomVoiceId(): Voice {
		if (this.voices.length === 0) {
			throw new Error('Kokoro has no available voices');
		}

		return this.voices[Math.floor(Math.random() * this.voices.length)]!.id;
	}

	getVoiceTitleFromId(voiceId: Voice) {
		return this.voices.find((voice) => voice.id === voiceId)?.description;
	}
}

// export const kokoro = new KokoroClient();
