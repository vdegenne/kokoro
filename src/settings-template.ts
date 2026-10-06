import {html} from 'lit-html';
import {availableVoices, KokoroClient, Language} from './index.js';
import {SELECT, SLIDER, SWITCH} from '@vdegenne/forms/FormBuilder.js';

/**
 * Imports you'll need:
 * import '@material/web/select/filled-select.js';
 * import '@material/web/select/select-option.js';
 * import '@material/web/button/filled-tonal-button.js';
 * import '@material/web/select/select-option.js';
 * import '@material/web/list/list-item.js';
 * import '@material/web/switch/switch.js';
 * import '@material/web/progress/circular-progress.js';
 * import '@material/web/icon/icon.js'
 * import '@material/web/slider/slider.js';
 */
export function kokoroSettingsTemplate(
	kokoro: KokoroClient,
	store: any,
	lang: Language = 'En',
) {
	switch (kokoro.state) {
		case 'disconnected':
			return 'Kokoro is disconnected';
		case 'connecting':
			return html`<!-- -->
				<md-list-item>
					<md-circular-progress
						indeterminate
						slot="start"
					></md-circular-progress>
					Please wait
				</md-list-item>
				<!-- -->`;
		case 'connection_error':
			return html`<!-- -->
				<md-list-item error>
					<md-icon slot="start">error</md-icon>
					Kokoro server unreachable
					<md-filled-tonal-button
						form=""
						slot="end"
						@click="${() => kokoro.connect()}"
						>Try again</md-filled-tonal-button
					>
				</md-list-item>
				<!-- -->`;
		case 'connected':
			return html`<!-- -->
				${SELECT(
					'Voice',
					store,
					`kokoro${lang}VoiceId`,
					availableVoices[lang],
					{
						disabled: store[`kokoro${lang}Random`],
					},
				)}
				${SWITCH('Random voice', store, `kokoro${lang}Random`)}
				${SLIDER('Voice speed', store, `kokoro${lang}Speed`, {min: 0.1, max: 1.9, step: 0.1})}
				<!-- -->`;
	}
}
