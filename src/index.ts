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
} as const

export type EnVoice = (typeof availableVoices)['En'][number]
export type EsVoice = (typeof availableVoices)['Es'][number]
export type FrVoice = (typeof availableVoices)['Fr'][number]
export type HiVoice = (typeof availableVoices)['Hi'][number]
export type ItVoice = (typeof availableVoices)['It'][number]
export type JaVoice = (typeof availableVoices)['Ja'][number]
export type PtVoice = (typeof availableVoices)['Pt'][number]
export type ZhVoice = (typeof availableVoices)['Zh'][number]

export type Language = keyof typeof availableVoices
export type Voice = (typeof availableVoices)[Language][number]

export interface PlayOptions {
	input: string
	voiceId?: Voice
	speed?: number
	volume_multiplier?: number
}

export interface KokoroFetchOptions {
	headers?: HeadersInit
}

export interface KokoroVoiceInfo {
	id: Voice
	description: string
}

export interface AudioRequest {
	key: string
	audio: () => Promise<Blob>
}

type CachedAudio = Blob | Promise<Blob>

export class KokoroClient {
	endpoint: string

	voices: KokoroVoiceInfo[] = []

	private cache = new Map<string, CachedAudio>()
	private voicesPromise: Promise<void> | undefined

	constructor({
		endpoint = 'http://127.0.0.1:8880',
	}: {
		endpoint?: string
	} = {}) {
		this.endpoint = endpoint.replace(/\/+$/, '')
	}

	async connect(): Promise<void> {
		const response = await this.fetch(`${this.endpoint}/health`)

		if (!response.ok) {
			throw await this.createResponseError(
				response,
				'Kokoro health check failed',
			)
		}
	}

	async getAudio(
		options: PlayOptions,
		fetchOptions: KokoroFetchOptions = {},
	): Promise<Blob> {
		const key = this.getCacheKey(options)

		return this.getCachedAudio(key, options, fetchOptions)
	}

	async createAudioRequest(
		options: PlayOptions,
		fetchOptions: KokoroFetchOptions = {},
	): Promise<AudioRequest> {
		const key = this.getCacheKey(options)

		return {
			key,
			audio: () => this.getCachedAudio(key, options, fetchOptions),
		}
	}

	private async getCachedAudio(
		key: string,
		options: PlayOptions,
		fetchOptions: KokoroFetchOptions,
	): Promise<Blob> {
		const cached = this.cache.get(key)

		if (cached) {
			return cached
		}

		const promise = this.fetchAudio(options, fetchOptions)
		this.cache.set(key, promise)

		try {
			const blob = await promise
			this.cache.set(key, blob)
			return blob
		} catch (error) {
			if (this.cache.get(key) === promise) {
				this.cache.delete(key)
			}

			throw error
		}
	}

	protected async fetchAudio(
		options: PlayOptions,
		fetchOptions: KokoroFetchOptions,
	): Promise<Blob> {
		const response = await this.fetch(`${this.endpoint}/v1/audio/speech`, {
			method: 'POST',
			headers: new Headers({
				...Object.fromEntries(new Headers(fetchOptions.headers)),
				'Content-Type': 'application/json',
			}),
			body: JSON.stringify({
				model: 'tts-1',
				input: options.input,
				voice: options.voiceId ?? 'af_heart',
				speed: options.speed ?? 1,
				volume_multiplier: options.volume_multiplier ?? 1,
				response_format: 'mp3',
			}),
		})

		if (!response.ok) {
			throw await this.createResponseError(
				response,
				'Kokoro TTS synthesis failed',
			)
		}

		return response.blob()
	}

	private getCacheKey(options: PlayOptions): string {
		return [
			options.voiceId ?? 'af_heart',
			options.speed ?? 1,
			options.input,
			options.volume_multiplier ?? 1,
		].join(':')
	}

	async fetchVoices(): Promise<void> {
		const response = await this.fetch(`${this.endpoint}/v1/voices`)

		if (!response.ok) {
			throw await this.createResponseError(
				response,
				'Kokoro voices request failed',
			)
		}

		const data: { voices: KokoroVoiceInfo[] } = await response.json()
		this.voices = data.voices
	}

	async ensureVoices(): Promise<void> {
		if (this.voices.length > 0) {
			return
		}

		if (!this.voicesPromise) {
			this.voicesPromise = this.fetchVoices().catch((error) => {
				this.voicesPromise = undefined
				throw error
			})
		}

		await this.voicesPromise
	}

	async getVoiceTitleFromId(voiceId: Voice): Promise<string> {
		await this.ensureVoices()

		const voice = this.voices.find((voice) => voice.id === voiceId)

		if (!voice) {
			throw new Error(`Unknown Kokoro voice: ${voiceId}`)
		}

		return `${voice.id} (${voice.description})`
	}

	// HTTP

	private async fetch(url: string, options?: RequestInit): Promise<Response> {
		try {
			return await fetch(url, options)
		} catch (error) {
			const path = new URL(url).pathname

			throw new Error(
				`Kokoro request failed for ${path}. Is the server running?`,
				{ cause: error },
			)
		}
	}

	// Errors

	private async createResponseError(
		response: Response,
		fallback: string,
	): Promise<Error> {
		try {
			const body: unknown = await response.json()

			if (
				typeof body === 'object' &&
				body !== null &&
				'error' in body &&
				typeof body.error === 'string'
			) {
				return new Error(body.error)
			}
		} catch {
			// The response body is not valid JSON.
		}

		return new Error(`${fallback}: ${response.status} ${response.statusText}`)
	}
}
