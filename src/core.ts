export interface KokoroSpeechOptions {
	input: string
	voiceId?: string
	speed?: number
	volume_multiplier?: number
}

export function normalizeSpeechOptions(
	options: KokoroSpeechOptions,
): Required<KokoroSpeechOptions> {
	function normalize(value: string): string {
		return value.replace(/[^\S\r\n]+/g, ' ').trim()
	}

	return {
		input: normalize(options.input),
		voiceId: options.voiceId ?? 'af_heart',
		speed: options.speed ?? 1,
		volume_multiplier: options.volume_multiplier ?? 1,
	}
}

export async function getCacheKey(
	options: KokoroSpeechOptions,
): Promise<string> {
	const normalized = normalizeSpeechOptions(options)
	const payload = JSON.stringify(Object.values(normalized))

	const data = new TextEncoder().encode(payload)
	const hash = await crypto.subtle.digest('SHA-256', data)

	return Array.from(new Uint8Array(hash))
		.map(function (byte) {
			return byte.toString(16).padStart(2, '0')
		})
		.join('')
}

export function getAudioPath(hash: string): string {
	return `audio/${hash.slice(0, 2)}/${hash.slice(2, 4)}/${hash}.mp3`
}
