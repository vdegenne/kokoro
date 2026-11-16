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

export interface KokoroSpeechOptions {
	input: string
	voice?: string
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
		voice: options.voice ?? 'af_heart',
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
