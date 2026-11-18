import type { SpeechOptions, Voice } from './core.js'

export interface FetchOptions {
	headers?: HeadersInit
}

export interface VoiceInfo {
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

	voices: VoiceInfo[] = []

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
		options: SpeechOptions,
		fetchOptions: FetchOptions = {},
	): Promise<Blob> {
		const key = this.getCacheKey(options)

		return this.getCachedAudio(key, options, fetchOptions)
	}

	async createAudioRequest(
		options: SpeechOptions,
		fetchOptions: FetchOptions = {},
	): Promise<AudioRequest> {
		const key = this.getCacheKey(options)

		return {
			key,
			audio: () => this.getCachedAudio(key, options, fetchOptions),
		}
	}

	private async getCachedAudio(
		key: string,
		options: SpeechOptions,
		fetchOptions: FetchOptions,
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
		options: SpeechOptions,
		fetchOptions: FetchOptions,
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
				voice: options.voice ?? 'af_heart',
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

	private getCacheKey(options: SpeechOptions): string {
		return [
			options.voice ?? 'af_heart',
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

		const data: { voices: VoiceInfo[] } = await response.json()
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

	async getVoiceTitle(voice: Voice): Promise<string> {
		await this.ensureVoices()

		const voiceInfo = this.voices.find((v) => v.id === voice)

		if (!voiceInfo) {
			throw new Error(`Unknown Kokoro voice: ${voice}`)
		}

		return `${voiceInfo.id} (${voiceInfo.description})`
	}

	// HTTP

	protected async fetch(url: string, options?: RequestInit): Promise<Response> {
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

	protected async createResponseError(
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
