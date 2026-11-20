// prettier-ignore
export const KOKORO_VOICES = {
	En: ['af_heart', 'af_aoede', 'af_bella', 'af_jessica', 'af_kore', 'af_nicole', 'af_nova', 'af_river', 'af_sarah', 'af_sky', 'af_alloy', 'am_adam', 'am_michael', 'am_echo', 'am_eric', 'am_fenrir', 'am_liam', 'am_onyx', 'am_puck', 'am_santa', 'bf_emma', 'bf_isabella', 'bf_alice', 'bf_lily', 'bm_george', 'bm_lewis', 'bm_daniel', 'bm_fable'],
	Es: ['ef_dora', 'em_alex', 'em_santa'],
	Fr: ['ff_siwis'],
	Hi: ['hf_alpha', 'hf_beta', 'hm_omega', 'hm_psi'],
	It: ['if_sara', 'im_nicola'],
	Ja: ['jf_alpha', 'jf_gongitsune', 'jf_nezumi', 'jf_tebukuro', 'jm_kumo'],
	Pt: ['pf_dora', 'pm_alex', 'pm_santa'],
	Zh: ['zf_xiaobei', 'zf_xiaoni', 'zf_xiaoxiao', 'zf_xiaoyi', 'zm_yunjian', 'zm_yunxi', 'zm_yunxia', 'zm_yunyang'],
} as const

export type Language = keyof typeof KOKORO_VOICES
export type Voice = (typeof KOKORO_VOICES)[Language][number]

export type EnVoice = (typeof KOKORO_VOICES)['En'][number]
export type EsVoice = (typeof KOKORO_VOICES)['Es'][number]
export type FrVoice = (typeof KOKORO_VOICES)['Fr'][number]
export type HiVoice = (typeof KOKORO_VOICES)['Hi'][number]
export type ItVoice = (typeof KOKORO_VOICES)['It'][number]
export type JaVoice = (typeof KOKORO_VOICES)['Ja'][number]
export type PtVoice = (typeof KOKORO_VOICES)['Pt'][number]
export type ZhVoice = (typeof KOKORO_VOICES)['Zh'][number]

export interface SpeechOptions {
	input: string
	voice?: Voice
	speed?: number
	volume_multiplier?: number
}

export function normalizeSpeechOptions(
	options: SpeechOptions,
): Required<SpeechOptions> {
	function normalize(value: string): string {
		return value.replace(/[^\S\r\n]+/g, ' ').trim()
	}

	return {
		input: normalize(options.input),
		voice: options.voice ?? 'af_heart',
		speed: options.speed ?? 1,
		volume_multiplier: options.volume_multiplier ?? 1,
	}
}

export async function getCacheKey(options: SpeechOptions): Promise<string> {
	const normalized = normalizeSpeechOptions(options)
	const payload = JSON.stringify(normalized)
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
