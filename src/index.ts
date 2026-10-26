import {ReactiveController, state} from '@snar/lit';

// prettier-ignore
export const availableVoices = {
	En: ['af_heart', 'af_aoede', 'af_bella', 'af_jessica', 'af_kore', 'af_nicole', 'af_nova', 'af_river', 'af_sarah', 'af_sky', 'af_alloy', 'am_adam', 'am_michael', 'am_echo', 'am_eric', 'am_fenrir', 'am_liam', 'am_onyx', 'am_puck', 'am_santa', 'bf_emma', 'bf_isabella', 'bf_alice', 'bf_lily', 'bm_george', 'bm_lewis', 'bm_daniel', 'bm_fable'],
	Es: ['ef_dora', 'em_alex', 'em_santa'],
	Fr: ['ff_siwis'],
	Hi: ['hf_alpha', 'hf_beta', 'hm_omega', 'hm_psi'],
	It: ['if_sara', 'im_nicola'],
	Ja: ['jf_alpha', 'jf_gongitsune', 'jf_nezumi', 'jf_tebukuro', 'jm_kumo'],
	Pt: ['pf_dora', 'pm_alex', 'pm_santa'],
	Zh: ['zf_xiaobei', 'zf_xiaoni', 'zf_xiaoxiao', 'zf_xiaoyi', 'zm_yunjian', 'zm_yunxi', 'zm_yunxia', 'zm_yunyang'],
} as const;

export type EnVoice = (typeof availableVoices)['En'][number];
export type EsVoice = (typeof availableVoices)['Es'][number];
export type FrVoice = (typeof availableVoices)['Fr'][number];
export type HiVoice = (typeof availableVoices)['Hi'][number];
export type ItVoice = (typeof availableVoices)['It'][number];
export type JaVoice = (typeof availableVoices)['Ja'][number];
export type PtVoice = (typeof availableVoices)['Pt'][number];
export type ZhVoice = (typeof availableVoices)['Zh'][number];

export type Language = keyof typeof availableVoices;

export type Voice = (typeof availableVoices)[Language][number];

interface KokoroVoice {
	id: Voice;
	description: string;
}

interface PlayOptions {
	voiceId?: Voice;
	speed?: number;
	volume_multiplier?: number;
}

type CachedAudio = Blob | Promise<Blob>;

export class KokoroClient extends ReactiveController {
	@state() state:
		'disconnected' | 'connecting' | 'connection_error' | 'connected' =
		'disconnected';

	@state() voices: KokoroVoice[] = [];
	@state() endpoint: string;

	private voicesPromise: Promise<void> | undefined;
	private cache = new Map<string, CachedAudio>();
	private currentAudios = new Map<
		string,
		{
			audio: HTMLAudioElement;
			resolve: () => void;
		}
	>();

	constructor({
		endpoint = 'http://127.0.0.1:8880',
	}: {
		endpoint?: string;
	} = {}) {
		super();
		this.endpoint = endpoint.replace(/\/+$/, '');
	}

	async connect({reconnect = false}: {reconnect?: boolean} = {}) {
		if (this.state === 'connected' && !reconnect) {
			return;
		}

		this.state = 'connecting';

		try {
			const response = await fetch(`${this.endpoint}/health`);

			if (!response.ok) {
				throw new Error(`Kokoro health check failed: HTTP ${response.status}`);
			}

			this.state = 'connected';
		} catch (error) {
			this.state = 'connection_error';
			throw error;
		}
	}

	disconnect() {
		this.stop();
		this.voices = [];
		this.voicesPromise = undefined;
		this.state = 'disconnected';
	}

	private pendingPlays = new Set<string>();

	async getAudio(
		text: string,
		{voiceId = 'af_heart', speed = 1, volume_multiplier = 1}: PlayOptions = {},
	): Promise<{
		key: string;
		audio: Blob | Promise<Blob>;
	}> {
		if (this.state !== 'connected') {
			throw new Error('Kokoro is not connected');
		}

		const key = this.getCacheKey(text, voiceId, speed, volume_multiplier);
		const cached = this.cache.get(key);

		if (cached) {
			return {key, audio: cached};
		}

		const audio = this.fetchAudio(text, voiceId, speed, volume_multiplier);
		this.cache.set(key, audio);

		try {
			const blob = await audio;
			this.cache.set(key, blob);
			return {key, audio: blob};
		} catch (error) {
			this.cache.delete(key);
			throw error;
		}
	}

	async play(
		text: string,
		{voiceId = 'af_heart', speed = 1, volume_multiplier = 1}: PlayOptions = {},
	) {
		if (this.state !== 'connected') {
			throw new Error('Kokoro is not connected');
		}

		const key = this.getCacheKey(text, voiceId, speed, volume_multiplier);

		if (this.pendingPlays.has(key)) return;

		const current = this.currentAudios.get(key);

		if (current) {
			current.audio.currentTime = 0;
			await current.audio.play();
			return;
		}

		this.pendingPlays.add(key);

		try {
			const {audio} = await this.getAudio(text, {
				voiceId,
				speed,
				volume_multiplier,
			});
			await this.playBlob(await audio, key, 1);
		} finally {
			this.pendingPlays.delete(key);
		}
	}

	async togglePlay(sentence: string, options: PlayOptions = {}) {
		if (this.currentAudios.size > 0) {
			this.stop();
			return;
		}

		return this.play(sentence, options);
	}

	private async fetchAudio(
		sentence: string,
		voiceId: Voice,
		speed: number,
		volume_multiplier: number,
	) {
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
				volume_multiplier,
				response_format: 'mp3',
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

	getCacheKey(
		sentence: string,
		voiceId: Voice,
		speed: number,
		volume_multiplier: number,
	) {
		return `${voiceId}:${speed}:${sentence}:${volume_multiplier}`;
	}

	getRandomVoiceId<L extends Language>({
		lang,
		exclude = [],
	}: {
		lang: L;
		exclude?: (typeof availableVoices)[L][number][];
	}): (typeof availableVoices)[L][number] {
		const voices = availableVoices[lang].filter(
			(voice) => !exclude.includes(voice),
		);

		if (voices.length === 0) {
			throw new Error(`Kokoro has no available voices for ${lang}`);
		}

		return voices[Math.floor(Math.random() * voices.length)]!;
	}

	private async fetchVoices(): Promise<void> {
		if (this.state !== 'connected') {
			throw new Error('Kokoro is not connected');
		}

		const response = await fetch(`${this.endpoint}/v1/voices`);

		if (!response.ok) {
			throw new Error(`Kokoro voices request failed: HTTP ${response.status}`);
		}

		const data: {voices: KokoroVoice[]} = await response.json();
		this.voices = data.voices;
	}

	private async ensureVoices(): Promise<void> {
		if (this.voices.length > 0) return;

		if (!this.voicesPromise) {
			this.voicesPromise = this.fetchVoices().catch((error) => {
				this.voicesPromise = undefined;
				throw error;
			});
		}

		await this.voicesPromise;
	}

	async getVoiceTitleFromId(voiceId: Voice): Promise<string | undefined> {
		if (this.state !== 'connected') {
			throw new Error('Kokoro is not connected');
		}

		await this.ensureVoices();

		const voice = this.voices.find((voice) => voice.id === voiceId);

		if (voice) {
			return `${voice.id} (${voice.description})`;
		}
	}
}
