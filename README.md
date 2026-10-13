# @vdegenne/kokoro

Snar reactive controller TS helper to interact with Kokoro TTS server.

## Install

```bash
npm i -D @vdegenne/kokoro
```

## Usage

First run [`vdegenne/kokoro-server`](https://hub.docker.com/r/vdegenne/kokoro-server) on your machine

```bash
docker run --rm -p 127.0.0.1:8880:8880 \
  -e KOKORO_API_KEY= \
  -e CORS_ALLOW_ORIGINS="*" \
  -v kokoro-cache:/var/lib/kokoro \
  vdegenne/kokoro-server:latest
```

Then in your web app

```ts
import {KokoroClient} from '@vdegenne/kokoro';

const kokoro = new KokoroClient();

try {
	await kokoro.connect();
	kokoro.play('こんにちは');
} catch (err) {
	console.error(`Server not reachable. (${err})`);
}
```

### Arguments

```ts
kokoro.play(
	'こんにちは', // text
	// options
	{
		voiceId: 'af_sky',
		speed: 1,
		volume: 1,
	},
);
```

### Controller

`kokoro` is a controller, you can bind it to a `LitElement` custom element.

```ts
import {KokoroClient} from '@vdegenne/kokoro';
import {LitElement, customElement} from 'lit';
import {withController} from '@snar/lit';

const kokoro = new KokoroClient();

@customElement('settings-dialog')
@withController(kokoro)
class SettingsDialog extends LitElement {
	// ...
}
```

Use this in your store

```js
@state() kokoroEnVoiceId: EnVoice = availableVoices.En[0]
@state() kokoroEnRandom = false
@state() kokoroEnSpeed = 1

@state() kokoroEsVoiceId: EsVoice = availableVoices.Es[0]
@state() kokoroEsRandom = false
@state() kokoroEsSpeed = 1

@state() kokoroFrVoiceId: FrVoice = availableVoices.Fr[0]
@state() kokoroFrRandom = false
@state() kokoroFrSpeed = 1

@state() kokoroHiVoiceId: HiVoice = availableVoices.Hi[0]
@state() kokoroHiRandom = false
@state() kokoroHiSpeed = 1

@state() kokoroItVoiceId: ItVoice = availableVoices.It[0]
@state() kokoroItRandom = false
@state() kokoroItSpeed = 1

@state() kokoroJaVoiceId: JaVoice = availableVoices.Ja[0]
@state() kokoroJaRandom = false
@state() kokoroJaSpeed = 1

@state() kokoroPtVoiceId: PtVoice = availableVoices.Pt[0]
@state() kokoroPtRandom = false
@state() kokoroPtSpeed = 1

@state() kokoroZhVoiceId: ZhVoice = availableVoices.Zh[0]
@state() kokoroZhRandom = false
@state() kokoroZhSpeed = 1
```

With imports being

```js
import {
	availableVoices,
	EnVoice,
	EsVoice,
	FrVoice,
	HiVoice,
	ItVoice,
	JaVoice,
	Language,
	PtVoice,
	ZhVoice,
} from '@vdegenne/kokoro';
```
