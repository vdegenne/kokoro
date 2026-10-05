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
import {kokoro} from '@vdegenne/kokoro';

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
	'af_sky', // voice (ts suggestions support)
	1, // speed
	1, // volume
);
```

### Controller

`kokoro` is a controller, you can bind it to a `LitElement` custom element.

```ts
import {kokoro} from '@vdegenne/kokoro';
import {LitElement, customElement} from 'lit';
import {withController} from '@snar/lit';

@customElement('settings-dialog')
@withController(kokoro)
class SettingsDialog extends LitElement {
	// ...
}
```
