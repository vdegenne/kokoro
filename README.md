# @vdegenne/kokoro

TypeScript client for interacting with a Kokoro TTS server.

## Install

```bash
npm install @vdegenne/kokoro
```

## Run the server

First, run [`vdegenne/kokoro-server`](https://hub.docker.com/r/vdegenne/kokoro-server) on your machine:

```bash
docker run --rm -p 127.0.0.1:8880:8880 \
  -e KOKORO_API_KEY= \
  -e CORS_ALLOW_ORIGINS="*" \
  -v kokoro-cache:/var/lib/kokoro \
  vdegenne/kokoro-server:latest
```

## Usage

Create a client and check that the server is reachable:

```ts
import { KokoroClient } from '@vdegenne/kokoro'

const kokoro = new KokoroClient()

try {
	await kokoro.connect()

	const audio = await kokoro.getAudio({
		input: 'こんにちは',
		voice: 'af_sky',
		speed: 1,
	})

	// audio is a Blob containing the generated MP3.
} catch (error) {
	console.error('Kokoro request failed:', error)
}
```

The client does not handle audio playback. It returns a `Blob` so playback can be managed by your application.

### Speech options

```ts
interface PlayOptions {
	input: string
	voice?: Voice
	speed?: number
	volume_multiplier?: number
}
```

Defaults:

- `voice`: `'af_heart'`
- `speed`: `1`
- `volume_multiplier`: `1`

### Audio requests

Use `createAudioRequest()` when you need a cache key alongside the audio request:

```ts
const request = await kokoro.createAudioRequest({
	input: 'こんにちは',
	voice: 'af_sky',
})

console.log(request.key)

const audio = await request.audio()
```

Audio requests are cached in memory. Concurrent requests with the same options share the same pending request.

### Available voices

The package exports `availableVoices`, along with language-specific voice types.

```ts
import {
	availableVoices,
	type EnVoice,
	type EsVoice,
	type FrVoice,
	type HiVoice,
	type ItVoice,
	type JaVoice,
	type Language,
	type PtVoice,
	type ZhVoice,
} from '@vdegenne/kokoro'
```

For example, you can use the available voices to type your application settings:

```ts
const englishVoice: EnVoice = availableVoices.En[0]
const japaneseVoice: JaVoice = availableVoices.Ja[0]
```

### Voice information

The client can retrieve voice information from the server:

```ts
await kokoro.ensureVoices()

console.log(kokoro.voices)

const title = await kokoro.getVoiceTitleFromId('af_sky')
```

`ensureVoices()` fetches the voices only when they have not already been loaded.

## Core utilities

The package also exposes shared speech normalization and cache-key utilities through a separate entry point:

```ts
import {
	normalizeSpeechOptions,
	getCacheKey,
	getAudioPath,
} from '@vdegenne/kokoro/core'
```

These utilities are shared with `@vdegenne/kokoro-proxy` to keep normalization and cache-key generation consistent.
